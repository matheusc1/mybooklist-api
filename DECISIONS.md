# Decisões de arquitetura — MyBookList API

Registro das decisões técnicas não óbvias do projeto: contexto, alternativas
consideradas e por que a escolha final foi feita. Diferente do `TODO.md`
(o que falta fazer) e do `README.md` (visão geral), este arquivo existe para
preservar o raciocínio por trás de decisões que não expiram quando a feature
é implementada.

---

## ADR 001 — Filosofia geral: responsabilidade pela precisão do dado é do usuário

**Contexto:** várias decisões pontuais do projeto (não bloquear sessão sem
`readingSpeed`, permitir sessões sobrepostas, não sincronizar campos em
updates manuais) seguem o mesmo princípio de fundo, mas cada uma foi
justificada isoladamente em conversas diferentes.

**Decisão:** o app não trava nem policia dados auto-relatados cuja única
"vítima" de um erro é o próprio usuário. Precedente em produtos do mesmo
gênero: Strava não impede atividades com horários sobrepostos, MyFitnessPal
não impede logar a mesma refeição duas vezes, Goodreads não valida progresso
de leitura contra nenhuma fonte externa.

**Limite da decisão:** esse princípio deixa de valer se o dado passar a
impactar terceiros (ranking público, desafios entre usuários, comparações
sociais) — cenário não previsto no escopo atual do produto.

**Aplicações concretas:**
- Sem bloqueio de registro de sessão por falta de `readingSpeed`
  (`durationSeconds` fica `0`, sentinela de "não calculado").
- Sessões de leitura podem se sobrepor livremente (ver ADR 005).
- Update manual de `currentPage`/`startedAt`/`completedAt` não é forçado
  nem corrigido pelo sistema.

---

## ADR 002 — Sincronização de `currentPage`: modelo "última ação vence"

**Contexto:** `books.currentPage` pode ser alterado por dois caminhos: edição
manual do livro, ou reading sessions. Era preciso decidir qual prevalece.

**Alternativas consideradas:**
- Reading sessions sempre como fonte única de verdade — rejeitada, pois
  ignoraria updates manuais legítimos.
- `currentPage = max(valor atual, toPage da sessão)` — rejeitada, pois
  "prende" o valor num máximo histórico e impede correção de erros (editar
  uma sessão pra baixo nunca teria efeito).

**Decisão:** edição manual e reading session são tratadas como o mesmo tipo
de evento ("definir o progresso como X agora"). Vence a ação mais recente.

Como `readAt` é editável pelo usuário (suporte a registro retroativo), o
critério de "mais recente" não podia ser a ordem de criação da sessão —
precisa refletir a data que a leitura *representa*:
- Vence a sessão com maior `readAt` entre as do livro.
- Empate no mesmo dia desempata por `updatedAt`.
- `create`/`update`/`delete` recalculam o vencedor do zero via
  `findLatestByReadAt`, dentro de uma `transaction` com o update em `books`.
- Se um `delete` deixar o livro sem nenhuma sessão, `currentPage` não é
  tocado (mantém o último valor conhecido) — ver ADR 004 para o caso
  específico de resetar isso via `resetToPlanned`.

**Consequência aceita:** o progresso pode regredir se o usuário editar
`currentPage` manualmente para um valor alto e depois registrar uma sessão
retroativa com `toPage` menor. Esperado, segue o ADR 001.

**Pré-requisito de infraestrutura:** o driver `neon-http` é stateless (cada
query é uma requisição HTTP isolada) e não suporta `transaction()`. Trocado
para `neon-serverless` (`Pool` via WebSocket).

---

## ADR 003 — Derivação automática de `status`, `startedAt` e `completedAt`

**Contexto:** com `currentPage` sincronizado (ADR 002), fazia sentido que
`status` do livro (`planned`/`reading`/`paused`/`dropped`/`completed`) e as
datas de início/conclusão acompanhassem o progresso automaticamente.

**Decisão:** `syncProgress` busca o livro atual e delega para `updateProgress`,
que recalcula os três campos juntos a partir de `currentPage` vs `totalPages`:

```ts
const isCompleted = currentPage >= book.totalPages

const status = isCompleted
  ? 'completed'
  : currentPage > 0
    ? 'reading'
    : book.status

const startedAt =
  (status === 'reading' || isCompleted) && !book.startedAt
    ? hoje
    : book.startedAt

const completedAt = isCompleted
  ? (book.completedAt ?? hoje)
  : null
```

Regras:
- Progresso > 0 e não completo → `status = reading`, independente do status
  anterior (inclusive `dropped`/`paused` setados manualmente). Uma reading
  session é a ação mais recente e tem autoridade para recalcular o status,
  mesma lógica do ADR 002 para `currentPage`.
- `startedAt` só é preenchido se ainda `null`, cobrindo inclusive o caso de
  o livro pular direto de `planned` para `completed` numa única sessão.
- `updateProgress` mantém a invariante `status === 'completed' ⟺ completedAt !=
  null`.

**Bug encontrado e corrigido durante os testes:** uma versão anterior só
cobria a transição vinda de `planned`
(`book.status === 'planned' ? 'reading' : book.status`). Um livro
`completed` que regredisse tinha `completedAt` limpo corretamente mas
`status` continuava `'completed'` — quebrando `countCompleted`, que filtra
por status **e** por `completedAt` dentro do ano. Corrigido generalizando a
condição para não depender do status anterior específico.

`markAsCompleted` (método antigo, nunca usado em produção, que só setava
`status = 'completed'`) foi removido e substituído por `updateProgress`.

**Cenários testados:** ver checklist em `TODO.md` (item 1.3).

---

## ADR 004 — Apagar a última sessão de um livro: `resetToPlanned` opcional

**Contexto:** quando o usuário apaga a última sessão restante de um livro
(zero sessões depois do delete), o `status`/`startedAt` deveriam voltar para
`planned`/`null`, ou permanecer como estavam?

**O problema central:** o backend recebe o mesmo sinal técnico para duas
intenções diferentes:
- *"Digitei a sessão errada, vou apagar e cadastrar de novo."* (correção)
- *"Não vou ler esse livro agora, quero voltar pra planejados."* (abandono)

Nos dois casos o resultado observável é idêntico: zero sessões restantes. O
sistema não tem informação suficiente para diferenciar as duas intenções.

**Reforço do argumento:** `startedAt` pode não ter relação nenhuma com a
sessão sendo apagada. Se o usuário preencheu `startedAt` manualmente
("comecei ontem") e só depois registrou uma sessão de hoje, apagar essa
sessão não deveria apagar uma data que já era verdadeira antes dela existir.
Um reset automático destruiria informação que continua correta.

**Decisão: nenhuma automática.** Em vez de o backend inferir a intenção, a
resolução é por confirmação explícita na UI, reaproveitando o `DeleteModal`
que já existe no fluxo de apagar sessão.

`ReadingSessionsService.delete` recebe um parâmetro opcional `resetToPlanned`
(default `false`, preservando o comportamento não-destrutivo do ADR 002). O
front decide quando *mostrar a opção* (contagem local de sessões, sem
chamada extra ao backend), mas quem decide se o reset realmente acontece é o
backend: `findLatestByReadAt` roda dentro da mesma transaction, depois do
delete — se sobrar alguma sessão (por exemplo, criada em outra aba entre o
front mostrar a opção e o delete ser enviado), o branch de reset nem é
avaliado, independente do que o front achava no momento do clique.

**Enquadramento da decisão:** o backend deliberadamente não infere uma
intenção que não consegue observar. O comportamento padrão preserva dados; a
mudança destrutiva exige decisão explícita do usuário. Mesma filosofia do
ADR 001, aplicada de forma mais cuidadosa: em vez de simplesmente não
interferir, o sistema oferece a opção certa para o usuário escolher, em vez
de impor um único padrão que inevitavelmente erraria para um dos dois casos.

---

## ADR 005 — Sem validação de sobreposição entre reading sessions

**Contexto:** sessões de leitura podem se sobrepor (ex: registrar páginas
100–150 duas vezes). Cogitou-se bloquear ou avisar sobre isso.

**Decisão:** não implementar nenhuma validação. Segue o ADR 001 — a
responsabilidade pelos dados corretos é do usuário.

**Motivos técnicos adicionais:**
- Um aviso não-bloqueante exigiria empilhar um modal de confirmação sobre um
  modal já aberto (criação/edição de sessão) — Radix UI não tem suporte
  nativo a modal stack.
- A validação exigiria buscar a última sessão do usuário mesmo em telas que
  não carregam esse dado por padrão (ex: home/dashboard), gerando uma
  chamada extra só para proteger o usuário de um erro que é responsabilidade
  dele.

**Reconsiderar se:** o produto ganhar algo com implicação além do próprio
usuário (ranking, desafios sociais), onde sobreposição passaria a ser meio
de trapaça contra terceiros.
