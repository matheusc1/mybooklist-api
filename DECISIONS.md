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
- Update manual de `currentPage`/`startedAt`/`completedAt` não é derivado
  nem corrigido pelo sistema, salvo as regras de coerência do ADR 003
  (ordem das datas e relação entre `completedAt` e `status`).

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

**Decisão:** `syncProgress` busca o livro atual e recalcula os três campos
juntos a partir de `currentPage` vs `totalPages`, na função pura
`deriveProgress` (`src/books/book-progress.ts`):

```ts
const completed = currentPage >= book.totalPages

const status = completed
  ? 'completed'
  : currentPage > 0
    ? 'reading'
    : book.status === 'completed'
      ? 'planned'
      : book.status

const startedAt =
  (status === 'reading' || completed) && !book.startedAt
    ? hoje
    : book.startedAt

const completedAt = completed
  ? (book.completedAt ?? hoje)
  : null
```

Regras:
- Progresso > 0 e não completo → `status = reading`, independente do status
  anterior (inclusive `dropped`/`paused` setados manualmente). Uma reading
  session é a ação mais recente e tem autoridade para recalcular o status,
  mesma lógica do ADR 002 para `currentPage`.
- Progresso 0 em livro `completed` volta o status para `planned`: um livro
  concluído sem nenhuma página lida seria incoerente. `startedAt` é mantido
  e os outros status não mudam com progresso 0.
- `startedAt` só é preenchido se ainda `null`, cobrindo inclusive o caso de
  o livro pular direto de `planned` para `completed` numa única sessão.
- `syncProgress` mantém a invariante `status === 'completed' ⟺ completedAt
  != null`.
- Se o total de páginas do livro foi reduzido abaixo da `toPage` da sessão
  vencedora, `currentPage` é limitado ao total e o livro fica `completed`.

**Bug encontrado e corrigido durante os testes:** uma versão anterior só
cobria a transição vinda de `planned`
(`book.status === 'planned' ? 'reading' : book.status`). Um livro
`completed` que regredisse tinha `completedAt` limpo corretamente mas
`status` continuava `'completed'` — quebrando `countCompleted`, que filtra
por status **e** por `completedAt` dentro do ano. Corrigido generalizando a
condição para não depender do status anterior específico.

`markAsCompleted` (método antigo, nunca usado em produção, que só setava
`status = 'completed'`) foi removido e substituído pela lógica de
`syncProgress`.

**Caminhos manuais (criação e edição do livro):** a derivação acima só roda
quando uma reading session muda o progresso. Na criação e no PATCH do livro o
sistema não deriva nada, mas aplica três regras de coerência em
`BooksService`:
- `completedAt` anterior a `startedAt` é recusado com 400. No update, o valor
  novo é combinado com o que já está salvo antes de comparar.
- Livro com `status = completed` e sem `completedAt` recebe a data de hoje,
  em vez de ser recusado, igual ao que `syncProgress` já faz.
- `completedAt` só existe em livro concluído. Se o status final não é
  `completed`, a data é zerada, sem erro. Sem isso, um livro editado de
  concluído para outro status guardaria a data antiga, e `syncProgress`
  (`book.completedAt ?? hoje`) a reaproveitaria ao concluir de novo, podendo
  mover o livro para outro ano na meta.

*Por que isso não contradiz o ADR 001:* o ADR 001 protege dado **impreciso**
(o usuário erra a página, a data, a nota, e só ele sofre). Estas regras tratam
registro **impossível** (concluir um livro antes de começá-lo) ou
**estruturalmente incompleto** (concluído sem data). O segundo caso importa
porque `countCompleted` e `findCompletedByYear` filtram por status **e** por
`completedAt` no ano: um livro concluído sem data some da meta e da visão
anual, e ainda aparece no topo de `findLastCompleted` (no Postgres, `NULL`
vem primeiro em ordem decrescente). Por isso a correção é um default, não uma
recusa.

*Deliberadamente permitido:* `rating` em livro planejado e datas no futuro,
que só afetam o próprio usuário. Com isso, a invariante
`status === 'completed' ⟺ completedAt != null` vale nos dois sentidos em
todos os caminhos.

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

**Valor do parâmetro na query:** `resetToPlanned` só aceita `true` ou
`false`. Qualquer outro valor (por exemplo `typo`) é recusado com 400. Antes,
tudo que não fosse a string `"true"` virava `false` em silêncio, e uma opção
destrutiva mal escrita parecia ter funcionado.

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

---

## ADR 006 — Onde cada validação mora: DTO, service e tipos

**Contexto:** `UpdateBookDto` é um `PartialType(CreateBookDto)`, e o
`PartialType` aplica `@IsOptional()` a todos os campos. O `@IsOptional()`
pula a validação para `undefined` **e para `null`**. Efeito: `PATCH
{ "title": null }` passava pelo `ValidationPipe`, os `??` das checagens do
service tratavam o `null` como "campo omitido", e o valor chegava ao
Postgres, que o recusava (`NOT NULL`) com um 500. O mesmo valia na criação
(`currentPage: null` era aceito e gravado, e a resposta violava o contrato
`number`) e nas sessões (`fromPage`, `toPage`, `readAt`).

**Alternativas consideradas:**
- Lançar exceção dentro do DTO — rejeitada: acopla o DTO a HTTP e foge da
  convenção em que o DTO declara e o service decide.
- Decorator ou pipe próprio só para o PATCH — rejeitada: infraestrutura a
  mais para poucos campos.
- Confiar na constraint do banco — rejeitada: o usuário recebe 500 em vez de
  400 com mensagem.
- `@ValidateIf` no DTO de update — não funciona: as condicionais se somam, e
  o `@IsOptional()` do `PartialType` continua pulando o `null`.

**Decisão:** o DTO descreve formato e tipo. O que depende de estado, ou de
`null` em coluna obrigatória, vive no service, que lança `BadRequestException`
antes de tocar o repositório (`NON_NULLABLE_FIELDS` em `BooksService` e em
`ReadingSessionsService`). Na criação, `@ValidateIf((_, v) => v !== undefined)`
substitui o `@IsOptional()` nos campos que aceitam omissão mas não `null`.
Campos que podem ser `null` de propósito (`notes`, `coverUrl`, `rating`,
`startedAt`, `completedAt`) continuam com `@IsOptional()`, para permitir
limpar o valor.

**Segunda camada:** os tipos de update omitem o que o cliente nunca deve
enviar (`Partial<Omit<NewBook, 'userId' | 'id'>>` em livros e
`Pick<NewUser, 'readingSpeed'>` em usuários), além do `forbidNonWhitelisted`
do pipe. As opções do pipe são exportadas (`validationPipeOptions`) e
testadas com o `ValidationPipe` real, e o E2E sobe o app com o mesmo
`configureApp` do servidor, para a configuração de produção e a de teste não
divergirem.

---

## ADR 007 — `durationSeconds` só é recalculado quando as páginas mudam

**Contexto:** o `durationSeconds` é um registro histórico, calculado com o
`readingSpeed` do usuário no momento da sessão (ver "Imutabilidade
histórica" no README). Mas o `update` da sessão recalculava a duração a cada
edição, com a velocidade **atual**. Corrigir só a data (`readAt`) de uma
sessão antiga reescrevia a duração dela.

**Decisão:** a duração só é recalculada quando `fromPage` ou `toPage` fazem
parte da edição. Mudar apenas `readAt` repassa o `durationSeconds` já salvo.
A validação dos limites de página roda nos dois casos.

**Consequência aceita:** quando as páginas mudam, o cálculo usa a velocidade
atual, porque o sistema não guarda o histórico de velocidades. A sessão
editada passa a representar outro intervalo, então um novo cálculo é
coerente.

**Alternativas consideradas:**
- Guardar o histórico de velocidades do usuário — rejeitada: modelo e
  migração a mais para um erro de borda.
- Nunca recalcular — rejeitada: editar as páginas deixaria a duração
  incompatível com o intervalo.

---

## ADR 008 — Datas: o cliente envia a data local, o servidor trabalha em UTC

**Contexto:** as colunas `date` não guardam fuso, e o servidor (Render) roda
em UTC. Para um usuário no Brasil (UTC-3), depois das 21h locais o servidor
já está no dia seguinte. Isso afeta tudo que usa `new Date()` ou `defaultNow()`
no backend: os defaults de `readAt` e `completedAt`, as datas que a
sincronização de sessões preenche (ADR 003), o início e o fim da semana do
dashboard e a contagem de dias seguidos.

**Decisão:** o front calcula as datas no fuso do usuário e as envia: `readAt`
sempre (não existe sessão nem atividade sem ele) e `completedAt` quando o
livro é concluído. A API só usa a própria data como rede de proteção, quando
o campo é omitido. As datas são strings `YYYY-MM-DD` validadas de forma
estrita (timestamp e dia impossível, como `2026-02-31`, são recusados) e
comparadas lexicograficamente.

**Consequências aceitas:**
- A semana do dashboard vira na noite de domingo para quem está a oeste de
  UTC (a partir das 21h no Brasil), com o gráfico semanal zerado.
- A sequência de dias tolera isso, porque cai no fallback de "ontem" quando o
  dia do servidor ainda não tem leitura.
- Quando uma reading session conclui o livro, `syncProgress` preenche
  `completedAt` (e `startedAt`, se vazio) com a data do servidor, e não com o
  `readAt` da sessão. Depois das 21h no Brasil, a data pode ficar um dia à
  frente, e em 31 de dezembro isso move o livro para a meta do ano seguinte.

**Evolução possível:** fazer a sincronização usar o `readAt` da sessão que
define o progresso, em linha com o ADR 002 (vale a data que a leitura
representa).

**Alternativas consideradas:** guardar o fuso no perfil do usuário, ou aceitar
a data de "hoje" do cliente nas rotas de estatística. Rejeitadas por ora: o
custo é maior do que o impacto, que se limita a um intervalo de horas.

---

## ADR 009 — Identidade da conta e sincronização do perfil

**Contexto:** o login é só por OAuth (Google e GitHub), então era preciso
decidir o que identifica uma conta.

**Decisão:** a identidade é o par `(provider, providerId)`, com `unique` no
banco. O e-mail é dado de perfil, não chave, e não é único.

**Alternativa considerada:** vincular contas pelo e-mail. Rejeitada: um
provedor pode devolver e-mail não verificado, e vincular por ele permitiria
tomar a conta de outra pessoa. **Custo aceito:** quem entra com Google e com
GitHub tem duas contas, com dados separados. Num produto pessoal isso é
tolerável.

**Sincronização:** a cada login, `name`, `email` e `avatarUrl` são
atualizados com o que o provedor mandou (`onConflictDoUpdate`). O
`readingSpeed` pertence ao app e nunca é sobrescrito. Se o provedor não mandar
foto, a anterior é mantida.

**Detalhes do GitHub:** o e-mail escolhido é o principal verificado, depois
qualquer verificado, depois o primeiro da lista. O nome vem de `displayName`,
depois de `username`, depois do e-mail, porque o nome é opcional no GitHub e
`users.name` é `NOT NULL`.

**Reconsiderar se:** o app passar a permitir editar nome, e-mail ou foto (a
sincronização apagaria a edição a cada login), ou se o e-mail virar chave de
vínculo (nesse caso, exigir `verified`).

---

## ADR 010 — Sessão: JWT em cookie `httpOnly` de 7 dias, sem revogação

**Contexto:** era preciso escolher como manter o login depois do OAuth.

**Alternativas consideradas:**
- Sessão no servidor com armazenamento — rejeitada: estado e infraestrutura
  a mais para um app pessoal.
- Access token curto com refresh token — rejeitada: complexidade sem
  benefício claro neste escopo.
- Token em `localStorage` — rejeitada: legível por qualquer script da página.

**Decisão:** JWT assinado (`sub` é o id do usuário) em cookie `httpOnly`,
`secure` em produção, `sameSite: 'lax'`, com `COOKIE_DOMAIN` opcional para
quando front e API ficam em subdomínios. A duração (7 dias) vem de uma
constante única (`SESSION_DURATION_*`) usada pelo token e pelos cookies, para
não divergirem.

**Consequências aceitas:**
- Não há revogação. O logout só limpa o cookie, e um token roubado vale até
  expirar.
- Mitigação parcial: a strategy busca o usuário a cada requisição, então uma
  conta apagada perde o acesso na hora, e um token sem `sub` é recusado.

**CSRF:** coberto por `SameSite=Lax`, CORS de uma única origem e nenhuma rota
`GET` que altere estado, exceto os callbacks do OAuth, protegidos por `state`.
O logout é `POST`.

**Reconsiderar se:** o app passar a guardar dados mais sensíveis, ou se
surgir a necessidade de encerrar sessões remotamente.

---

## ADR 011 — As rotas de teste só existem com `NODE_ENV=test`

**Contexto:** o E2E precisa de um usuário autenticado sem passar pelo OAuth.
O `TestModule` expõe `POST /test/login` e `DELETE /test/users/:id`, ambos
públicos.

**Problema da versão anterior:** o módulo era carregado sempre que
`NODE_ENV` fosse diferente de `production`. Isso falha aberto: com `NODE_ENV`
ausente ou escrito errado, em um ambiente com a flag ligada, qualquer pessoa
poderia criar usuários e apagar contas.

**Alternativas consideradas:** excluir o módulo do build de produção
(trabalhoso e redundante) e exigir um segredo no header (infraestrutura a
mais para rotas de teste).

**Decisão:** o módulo só é montado com `E2E_TEST_MODE=true` **e**
`NODE_ENV=test` (`isTestModeEnabled`), definidos pelo próprio código do E2E
(`test/e2e-env.ts`, importado antes do `AppModule`). O `.env` não define a
flag. Defesas adicionais: o delete só alcança usuários com e-mail
`e2e-%@example.com`, e o `createE2eApp` recusa rodar se `TEST_DATABASE_URL`
for igual a `DATABASE_URL`.

**Consequência:** o desenvolvimento local comum não monta as rotas de teste.
Para usá-las, suba a API com `npm run start:e2e`.

---

## ADR 012 — Proteção da borda HTTP: headers, rate limit e proxy

**Headers:** `app.useSecurityHeaders()` do próprio Nest (disponível desde a
12.1, sem dependência extra), **sem CSP**. A API devolve JSON, e a única
página HTML é a referência `/reference`, que carrega script externo e inline.
Liberar isso exigiria `'unsafe-inline'`, que anula a maior parte da proteção
do CSP, para proteger respostas que não são HTML.

**Rate limit:** `@nestjs/throttler`, com 100 requisições por minuto por IP no
geral e 20 por minuto nas quatro rotas do fluxo OAuth. O `/auth/me` roda a
cada carregamento de página e fica no limite geral. O `/health` fica de fora,
porque monitores da hospedagem batem nele com frequência e um 429 poderia
fazer a plataforma marcar o serviço como doente. O limite é desligado com
`NODE_ENV=test`. O guard vem antes do JWT, então uma requisição barrada nem
chega à consulta de usuário no banco.

**Contador em memória:** zera a cada deploy e não é compartilhado entre
instâncias. Aceito para uma instância única. Se o app escalar, o passo
seguinte é um armazenamento compartilhado (Redis).

**Proxy:** `trust proxy` vale `1` só em produção. Sem isso, o IP visto é o do
proxy e todos os clientes dividem o mesmo contador. O número é a quantidade
de proxies na frente do app. Valor baixo demais volta ao problema anterior,
e valor alto demais permite falsificar o IP.

**Configuração obrigatória:** `FRONTEND_URL` é exigida em produção. Sem ela a
API não sobe, em vez de aceitar a origem errada no CORS ou redirecionar o
login para `localhost`.
