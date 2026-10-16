# TODO — MyBookList API

## Contexto

Itens pendentes da expansão das funcionalidades: histórico e detalhe do
livro, e consulta de anos anteriores. Antes das features novas, a parte de
stats sai do módulo `reading-sessions` para um módulo próprio.

Para o raciocínio por trás de decisões já tomadas, ver `DECISIONS.md`. Aqui
fica só o estado atual e o que falta.

---

## Prioridade 1 — Extração do módulo de stats

Refactor sem mudança de comportamento, em commit isolado, antes de qualquer
feature nova. O módulo `reading-sessions` fica só com o CRUD de sessões e a
sincronização com `books`.

- [x] Criar o módulo de stats e mover `reading-sessions-stats` (service,
      repository, drizzle-repository) com os respectivos specs
- [x] Mover os DTOs de stats (`weekly-stats`, `monthly-stats`,
      `monthly-activity`)
- [x] Ajustar os imports e módulos em `dashboard` e `activity`
- [ ] Testes unitários e E2E passando antes e depois da extração

---

## Prioridade 2 — Histórico e detalhe do livro

### 2.1 Campo de texto no livro

Campo livre para anotação, resumo, análise, resenha, etc. Um único campo de
texto puro.

- [ ] Coluna `notes` (text, nullable) no schema de `books` + migration
- [ ] Incluir em create/update (DTOs com `@ApiProperty`) e nos retornos de livro
- [ ] Validação de tamanho máximo no DTO (limite a definir)
- [ ] Testes unitários e E2E

### 2.2 Reading-sessions e estatísticas de um livro

Rota que retorna todas as sessões relacionadas a um livro, com validação de
posse via `innerJoin` com `books`, como nas demais consultas. As estatísticas
de leitura do livro são agregações computadas sob demanda, sem tabela
própria.

- [ ] Listar as sessões do livro em `reading-sessions` (repository, service e
      controller)
- [ ] Estatísticas do livro no módulo de stats: tempo total, quantidade de
      sessões, quantidade de dias de leitura
- [ ] Documentação no Swagger
- [ ] Testes unitários e E2E (inclui ownership: usuário não acessa sessões de
      livro de outro)

---

## Prioridade 3 — Anos anteriores

### 3.1 Metas de anos anteriores

- [ ] Permitir consultar a meta de um ano específico em `goals`
- [ ] Testes unitários e E2E

### 3.2 Estatísticas anuais

Equivalente anual do `monthlyStats`, agregação computada sob demanda, sem
tabela própria. Um livro conta no ano pelo `completedAt`.

- [ ] `yearlyStats` no módulo de stats (sessões, páginas lidas, tempo de
      leitura, dias ativos, livros concluídos)
- [ ] Expor para consulta por ano
- [ ] Testes unitários e E2E
