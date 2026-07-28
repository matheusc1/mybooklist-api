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

### 1.3 Atualizar `status`, `startedAt` e `completedAt` automaticamente — pendente

Enum de status real: `reading`, `planned`, `paused`, `completed`, `dropped`.

- Progresso > 0 e status ainda não é `reading` → `status = reading`.
- `toPage === totalPages` → `status = completed`.
- Reaproveita a mesma lógica/local de código do item 1.2 (`syncProgress`).

`startedAt` automático: ao transicionar para `reading` via sync, setar
`startedAt = hoje` só se `existing.startedAt` for `null`, não sobrescreve
valor já preenchido manualmente.

`startedAt` nunca é limpo automaticamente pelo sync. `paused` e `dropped`
ainda significam que o livro já foi começado (o único status de "não
iniciado" é `planned`), então regredir pra esses estados não deve apagar
`startedAt`. O sync automático nunca leva o livro de volta a `planned`, só
uma edição manual faria isso, e aí a responsabilidade é do usuário.

`completedAt` automático: ao detectar `toPage === totalPages` via sync,
setar `completedAt = hoje` só se `existing.completedAt` for `null`.

`completedAt` é limpo automaticamente quando o status deixa de ser
`completed` via sync (ex: usuário apaga a sessão que tinha completado o
livro, e o recálculo de `currentPage` faz `toPage < totalPages` de novo).
`completedAt` só faz sentido logicamente enquanto `status === 'completed'` for verdade;
mantê-lo preenchido com outro status geraria inconsistência visível na UI
(livro mostrando "concluído em X" sem estar marcado como concluído). O
Goodreads segue essa mesma lógica ao mover um livro de volta pra "currently
reading".

Update manual do usuário (incluindo mudar `status` pra `planned` de
propósito) pode fazer o que quiser com `startedAt`/`completedAt`, sem trava.

**Commit planejado:** `feat(books): auto-update status, startedAt and completedAt based on progress`

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
