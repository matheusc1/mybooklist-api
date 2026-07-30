# TODO — MyBookList API

## Contexto

Itens pendentes identificados durante a implementação do módulo `reading-sessions`,
relacionados à sincronização entre `books` e `reading_sessions`.

---

## Prioridade 1 — Progresso e status (books ↔ reading-sessions)

### 1.1 Validar `currentPage <= totalPages` — concluído

Validação no `BooksService` (create/update), usando o valor existente como
fallback quando o campo não vem no payload parcial.

**Commit:** `feat(books): validate currentPage does not exceed totalPages`

### 1.2 Sincronizar `currentPage` a partir das reading sessions — concluído e testado

Modelo implementado: vence a sessão com o maior `readAt`, com `updatedAt`
como critério de desempate em caso de mesmo dia. Como `readAt` é editável
pelo usuário (suporta registro retroativo de sessões), a ordem de criação
não servia como critério de "mais recente" — precisava refletir a data que a
leitura representa.

- `create`/`update`/`delete` de sessão recalculam, via `findLatestByReadAt`,
  qual sessão do livro tem o maior `readAt`, e aplicam o `toPage` dela em
  `books.currentPage` via `BooksService.syncProgress`.
- Se um `delete` deixar o livro sem nenhuma sessão, `currentPage` não é
  tocado (mantém o valor atual, não reseta pra 0).
- Update manual de `currentPage` continua funcionando normalmente e
  permanece válido até a próxima sessão ser criada/editada/apagada.
- Toda a sincronização roda dentro de uma `transaction`, garantindo
  atomicidade entre a escrita na sessão e o update em `books`.

Cenários testados manualmente:
- Editar `toPage` da sessão vencedora → `currentPage` acompanha.
- Editar `readAt` de uma sessão não-vencedora tornando-a mais recente → ela
  assume a vitória e `currentPage` muda de acordo.
- Editar `toPage` de uma sessão não-vencedora → não afeta `currentPage`.
- Apagar uma sessão não-vencedora → nada muda.
- Apagar a sessão vencedora, com outras restantes → `currentPage` recalcula
  para a nova vencedora entre as que sobraram.
- Apagar a última sessão restante → `currentPage` mantém o valor atual.

Trade-off aceito: o progresso pode regredir se o usuário editar
`currentPage` manualmente para um valor alto e depois registrar uma sessão
retroativa com `readAt` mais recente mas `toPage` menor. Esperado, não é
bug, mesma linha do item 2.1 abaixo: a responsabilidade pelo dado correto
é do usuário.

Mudança de infraestrutura necessária para a implementação: o driver
`neon-http` não suporta transactions (cada query é uma requisição HTTP
stateless). Trocado para `neon-serverless` (`Pool` via WebSocket), que
suporta `db.transaction()`.

**Commits:**
```
feat(reading-sessions): add createdAt/updatedAt to reading_sessions schema
feat(reading-sessions): allow readAt on create and update
feat(books): add syncProgress method
feat(reading-sessions): add findLatestByReadAt helper
fix: use Transaction type instead of Database in tx params
fix(database): switch from neon-http to neon-serverless driver
feat(reading-sessions): sync currentPage on session create
feat(reading-sessions): sync currentPage on session update
feat(reading-sessions): sync currentPage on session delete
```

### 1.3 Atualizar `status`, `startedAt` e `completedAt` automaticamente — concluído e testado

Enum de status real: `reading`, `planned`, `paused`, `completed`, `dropped`.

Modelo implementado: `syncProgress` busca o `existing` book e delega para
`updateProgress`, que recalcula `status`, `startedAt` e `completedAt` juntos
a partir de `currentPage` vs `totalPages`, numa única função:

```ts
const isCompleted = currentPage >= existing.totalPages

const status = isCompleted
  ? 'completed'
  : currentPage > 0
    ? 'reading'
    : existing.status

const startedAt =
  (status === 'reading' || isCompleted) && !existing.startedAt
    ? hoje
    : existing.startedAt

const completedAt = isCompleted
  ? (existing.completedAt ?? hoje)
  : null
```

Pontos da regra:
- Progresso > 0 e não completo → `status = reading`, **independente do
  status anterior** (inclusive `dropped` ou `paused` setados manualmente
  pelo usuário). Uma reading session é a ação mais recente e tem
  autoridade para recalcular o status, do mesmo jeito que já tem
  autoridade para recalcular `currentPage` (1.2).
- `currentPage >= totalPages` → `status = completed`, `completedAt`
  preenchido só se ainda não tinha valor.
- `startedAt` preenchido só se ainda não tinha valor, em qualquer
  transição que implique progresso (`reading` ou `completed`) — cobre
  inclusive o caso de um livro pular direto de `planned` pra `completed`
  numa única sessão, sem nunca ter passado por `reading`.
- `completedAt` é preenchido quando o progresso atinge o total e limpo
  quando deixa de atingir. Assim, `status` e `completedAt` permanecem
  sincronizados independentemente do status anterior — a invariante é
  `status === 'completed' ⟺ completedAt != null`, sempre.

Bug encontrado e corrigido durante os testes: numa versão anterior, a
condição de `status` só cobria a transição vindo de `planned`
(`existing.status === 'planned' ? 'reading' : existing.status`). Isso
significava que um livro `completed` que regredisse (sessão apagada/editada
com `toPage` menor) tinha `completedAt` limpo corretamente mas `status`
continuava `'completed'` — porque a condição não sabia lidar com regressão
a partir de `completed`. Resultado: livro com `status = completed` e
`completedAt = null`, o que quebra `countCompleted` (que filtra por status
**e** por `completedAt` dentro do ano). Corrigido generalizando a condição
para `currentPage > 0 ? 'reading' : existing.status`, sem depender do
status anterior específico.

`markAsCompleted` (método antigo, nunca usado em produção, que só setava
`status = 'completed'` sem tratar ownership, `completedAt` nem as outras
transições) foi removido e substituído por `updateProgress`.

Cenários testados manualmente (todos passaram):
1. `planned → reading`: sessão com progresso, sem completar → `status =
   reading`, `startedAt` preenchido.
2. `reading → completed`: sessão completa o livro → `status = completed`,
   `completedAt` preenchido, `startedAt` mantido.
3. `planned → completed` direto, sem passar por `reading`: `startedAt` e
   `completedAt` preenchidos na mesma operação.
4. `completed → reading` (regressão simples): apagar/editar a sessão que
   completava → `status = reading`, `completedAt = null`, `startedAt`
   preservado.
5. Regressão a partir de `dropped`/`paused` setados manualmente: nova
   sessão com progresso → `status = reading`, sobrescrevendo o valor
   manual. Confirma que sync tem autoridade sobre edição manual anterior,
   mesma lógica do 1.2.
6. `startedAt`/`completedAt` já preenchidos manualmente com datas
   específicas não são sobrescritos por "hoje" quando o sync roda de novo.
7. Progresso `0` sem nenhuma sessão: `status` permanece `planned`, datas
   continuam `null`.
8. Apagar sessões em sequência até sobrar uma única sessão `0 → 0`: o
   livro manteve `status = reading` e `startedAt` preenchido mesmo com
   `currentPage = 0`. Ver discussão abaixo — comportamento deliberado
   enquanto `resetToPlanned` não for solicitado explicitamente. Depois de implementado, `delete(..., resetToPlanned:
   true)` leva a `currentPage = 0`, `status = planned`, `startedAt = null`,
   `completedAt = null`; sem o parâmetro (ou `false`), mantém o estado
   atual.

**Commits:**
```
refactor(books): remove markAsCompleted, add updateProgress
feat(books): use updateProgress inside syncProgress
```

#### Caso em aberto: apagar a última sessão de um livro (do teste 8)

O cenário do teste 8 expôs uma pergunta de produto que ainda não tinha sido
resolvida: quando o usuário apaga a última sessão restante de um livro
(zero sessões depois do delete), o `status`/`startedAt` deveriam voltar
para `planned`/`null`, ou permanecer como estavam (comportamento atual)?

Os dois lados:
- **Manter como está (comportamento atual):** consistente com a decisão já
  tomada no 1.2 de não resetar `currentPage` quando não sobra sessão. Evita
  que corrigir um erro de digitação na única sessão existente jogue o
  usuário de volta à estaca zero. Efeito colateral aceito: o livro pode
  ficar `reading`/`completed` sem nenhuma sessão existente — um estado
  "órfão", mas documentável como limitação, do mesmo jeito que o log
  retroativo já é.
- **Resetar para `planned`/`null`:** mais intuitivo quando a intenção real
  do usuário é "não vou ler esse livro agora, volta pra minha lista de
  planejados". Problema: o sistema não tem como diferenciar essa intenção
  de "só corrigi um erro de digitação na única sessão que tinha" — os dois
  casos têm o mesmo sinal técnico (zero sessões restantes).

**Decisão: nenhuma automática.** Em vez de o backend inferir a intenção do
usuário, a resolução será por confirmação explícita na UI, reaproveitando
o `DeleteModal` que já existe no fluxo de apagar sessão (diferente do caso
do item 2.1, aqui não é necessário empilhar modal sobre modal, é só
estender o conteúdo do modal de confirmação já existente quando a sessão
sendo apagada for a última do livro).

`ReadingSessionsService.delete` ganha um parâmetro opcional:

```ts
async delete(id: string, userId: string, resetToPlanned = false) {
  // ...
  if (latest) {
    await this.booksService.syncProgress(tx, existing.bookId, latest.toPage)
  } else if (resetToPlanned) {
    await this.booksService.resetProgress(tx, existing.bookId)
  }
  // latest ausente e resetToPlanned false → comportamento atual, não toca em nada
}
```

Default `false` preserva o comportamento já testado do 1.2. O front decide
quando *mostrar a opção* (checagem local: contar sessões do livro já
carregadas em memória, sem chamada extra ao backend) e envia
`resetToPlanned: true` só se o usuário confirmar no modal — mas essa
contagem do front é só para UX, não é a fonte de verdade. O backend já
recalcula "sobrou alguma sessão?" via `findLatestByReadAt`, dentro da mesma
transaction, depois do delete ter sido efetivado. Isso protege contra
condição de corrida (ex: outra aba/dispositivo criar uma sessão nova entre o
front decidir mostrar a opção e o delete ser enviado): se `latest` existir
nesse recálculo dentro da tx, o branch `resetToPlanned` nem é avaliado,
independente do que o front achava no momento do clique.

**Pendente:** implementar `BooksService.resetProgress` (zera `currentPage`,
`status = planned`, `startedAt = null`, `completedAt = null`), o parâmetro
no `delete`, o DTO/query param equivalente no controller, e a UI condicional
no `DeleteModal`.

**Commit planejado:** `feat(reading-sessions): add optional resetToPlanned on session delete`

---

## ~~Prioridade 2 — Validação isolada~~ — descartado

### ~~2.1 Impedir sessões com intervalo de páginas sobreposto~~

Decisão: não implementar. Sessões podem se sobrepor livremente, e isso é
aceito como comportamento esperado.

Motivos:
- A responsabilidade pelos dados corretos é do usuário, mesma linha já
  seguida ao não bloquear registro de sessão por falta de `readingSpeed`.
  Strava, MyFitnessPal e Goodreads seguem o mesmo princípio com dados
  auto-relatados.
- Custo técnico de um aviso não-bloqueante seria alto: Radix não tem modal
  stack, e a validação exigiria buscar a última sessão do usuário mesmo em
  telas que não carregam esse dado por padrão (ex: home/dashboard).
- Reconsiderar só se o produto ganhar algo com implicação além do próprio
  usuário (ranking, desafios sociais), onde sobreposição passaria a ser
  meio de trapaça contra terceiros.

---

## Infraestrutura — pendências de baixa prioridade

- Fechar o `Pool` no shutdown (`onModuleDestroy` no `DatabaseModule` +
  `app.enableShutdownHooks()` no `main.ts`). Não bloqueante hoje (dev
  local, sem deploy contínuo); o auto-suspend do Neon já cobre a maior
  parte do risco de conexão ociosa.

---

## Prioridade 3 — Dashboard / Activity (futuro)

Ordem de implementação, da consulta mais simples pra mais complexa:

1. `findCurrentlyReading` (books) — query simples, filtro por status
2. `findLastCompleted(quantity: number)` (books) — query simples, filtro + ordenação
3. `weeklyStats` (reading-sessions) — pages read, reading time, days streak (pode ser > 7)
4. `monthlyStats` (reading-sessions) — sessions, pages read, reading time, active days
5. `monthlyActivity` (reading-sessions) — sessões de um mês específico;
   equivalente ao endpoint `GET /activity?month=YYYY-MM`, já decidido como
   agregação computada (não uma tabela própria)

**Commits planejados:**
```
feat(books): add findCurrentlyReading
feat(books): add findLastCompleted
feat(reading-sessions): add weeklyStats
feat(reading-sessions): add monthlyStats
feat(reading-sessions): add monthlyActivity
```
