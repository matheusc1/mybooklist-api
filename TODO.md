# TODO — MyBookList API

## Contexto

Itens pendentes identificados durante a implementação do módulo `reading-sessions`,
relacionados à sincronização entre `books` e `reading_sessions`.

Para o raciocínio completo por trás de cada decisão (alternativas
consideradas, motivos), ver `DECISIONS.md`. Aqui fica só o estado atual e o
que falta.

---

## Prioridade 1 — Progresso e status (books ↔ reading-sessions)

### 1.1 Validar `currentPage <= totalPages` — concluído

Validação no `BooksService` (create/update), usando o valor existente como
fallback quando o campo não vem no payload parcial.

**Commit:** `feat(books): validate currentPage does not exceed totalPages`

### 1.2 Sincronizar `currentPage` a partir das reading sessions — concluído e testado

Modelo: vence a sessão com o maior `readAt`, `updatedAt` como desempate.
Detalhes em `DECISIONS.md` (ADR 002).

Cenários testados:
- [x] Editar `toPage` da sessão vencedora → `currentPage` acompanha.
- [x] Editar `readAt` de uma sessão não-vencedora tornando-a mais recente →
      ela assume a vitória.
- [x] Editar `toPage` de uma sessão não-vencedora → não afeta `currentPage`.
- [x] Apagar uma sessão não-vencedora → nada muda.
- [x] Apagar a sessão vencedora, com outras restantes → recalcula para a
      nova vencedora.
- [x] Apagar a última sessão restante → `currentPage` mantém o valor atual.

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

Modelo: `syncProgress` → `updateProgress`, recalcula os três campos juntos a
partir de `currentPage` vs `totalPages`. Regras completas e o bug encontrado
durante os testes em `DECISIONS.md` (ADR 003).

`markAsCompleted` (não usado em produção) removido, substituído por
`updateProgress`.

Cenários testados:
- [x] `planned → reading`: progresso sem completar.
- [x] `reading → completed`: sessão completa o livro.
- [x] `planned → completed` direto, sem passar por `reading`.
- [x] `completed → reading` (regressão): `completedAt` limpo, `startedAt`
      preservado.
- [x] Regressão a partir de `dropped`/`paused` manuais → `reading`.
- [x] Datas manuais preenchidas não são sobrescritas por "hoje".
- [x] Progresso `0` sem sessão nenhuma → permanece `planned`.
- [x] Apagar sessões até sobrar uma `0 → 0` → mantém `reading`/`startedAt`
      (comportamento deliberado, ver seção abaixo).

**Commits:**
```
refactor(books): remove markAsCompleted, add updateProgress
feat(books): use updateProgress inside syncProgress
```

#### `resetToPlanned` opcional no delete de sessão - concluído

Quando o delete deixa um livro sem nenhuma sessão, o reset para
`planned`/`null` não é automático, é uma opção explícita no `DeleteModal`.
Raciocínio completo em `DECISIONS.md` (ADR 004).

```ts
async delete(id: string, userId: string, resetToPlanned = false) {
  // ...
  if (latest) {
    await this.booksService.syncProgress(tx, existing.bookId, latest.toPage)
  } else if (resetToPlanned) {
    await this.booksService.resetProgress(tx, existing.bookId)
  }
}
```

- [x] `BooksService.resetProgress` (zera `currentPage`, `status = planned`,
      `startedAt = null`, `completedAt = null`)
- [x] Parâmetro `resetToPlanned` no `delete` do service
- [x] Query param no controller (`DELETE /reading-sessions/:id?resetToPlanned=true`),
      validado via DTO aplicado a `@Query()`. Não usar `@Body()` em DELETE

**Commits:**
```
feat(books): add resetProgress method
feat(reading-sessions): add optional resetToPlanned on session delete
feat(reading-sessions): add resetToPlanned query param on session delete endpoint
```

---

## ~~Prioridade 2 — Validação isolada~~ — descartado

### ~~2.1 Impedir sessões com intervalo de páginas sobreposto~~

Não implementado, de propósito. Raciocínio completo em `DECISIONS.md`
(ADR 005).

---

## Infraestrutura — concluído

- [x] Fechar o `Pool` no shutdown (`onModuleDestroy` no `DatabaseModule` +
      `app.enableShutdownHooks()` no `main.ts`).

---

## Prioridade 3 — Dashboard / Activity

Dois módulos novos de consulta (read-only), expondo apenas endpoints `GET`.
Cada service de orquestração apenas coordena os services de domínio e
formata a resposta, sem schema próprio e sem métodos de escrita. Consultas
específicas ficam nos services de domínio, responsáveis apenas pelo acesso
aos dados do seu próprio domínio, nunca no service de orquestração.

Ordem de implementação, da consulta mais simples para a mais complexa:

1. [ ] `findCurrentlyReading` (books) — consulta simples, filtro por status
2. [ ] `findLastCompleted(quantity: number)` (books) — consulta simples, filtro + ordenação
3. [ ] `weeklyStats` (reading-sessions) — pages read, reading time, days streak (pode ser > 7)
4. [ ] `monthlyStats` (reading-sessions) — sessions, pages read, reading time, active days
5. [ ] `monthlyActivity` (reading-sessions) — retorna todas as sessões de
       leitura de um mês específico (`YYYY-MM`), equivalente ao endpoint
       `GET /activity?month=YYYY-MM`; agregação computada, sem tabela própria

#### Dashboard

6. [ ] `DashboardModule` — controller + `DashboardService`, compõe
       `findCurrentlyReading` + `findLastCompleted` + `weeklyStats`

#### Activity

7. [ ] `ActivityModule` — controller + `ActivityService`, usa
       `monthlyStats` + `monthlyActivity`

**Commits planejados:**
```
feat(books): add findCurrentlyReading
feat(books): add findLastCompleted
feat(reading-sessions): add weeklyStats
feat(reading-sessions): add monthlyStats
feat(reading-sessions): add monthlyActivity
feat(dashboard): add dashboard module
feat(activity): add activity module
```
