# TODO — MyBookList API

## Contexto

Itens pendentes da expansão das funcionalidades: histórico e detalhe do
livro, e consulta de anos anteriores. Antes das features novas, a parte de
stats sai do módulo `reading-sessions` para um módulo próprio.

Cada tela nova ganha um módulo de composição (somente leitura, sem schema
próprio), no mesmo padrão de `dashboard` e `activity`. Esses módulos só
orquestram os services dos domínios, sem query própria nem regra de negócio.

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
- [x] Testes unitários e E2E passando antes e depois da extração

---

## Prioridade 2 — Histórico e detalhe do livro

### 2.1 Campo de texto no livro

Campo livre para anotação, resumo, análise, resenha, etc. Um único campo de
texto puro.

- [x] Coluna `notes` (text, nullable) no schema de `books` + migration
- [x] Incluir em create/update (DTOs com `@ApiProperty`) e nos retornos de livro
- [x] Validação de tamanho máximo no DTO (5000: cerca de 800 palavras)
- [x] Testes unitários e E2E

### 2.2 Reading-sessions e estatísticas de um livro

Camada de dados em cada domínio, consumida pelo módulo do 2.3. A posse é
validada via `innerJoin` com `books`, como nas demais consultas. As
estatísticas do livro são agregações computadas sob demanda, sem tabela
própria.

- [x] Listar as sessões do livro em `reading-sessions` (repository e service,
      com o service exportado para outros módulos)
- [x] Estatísticas do livro no módulo de stats: tempo total, quantidade de
      sessões, quantidade de dias de leitura
- [ ] Testes unitários (inclui ownership: usuário não acessa sessões de
      livro de outro)

### 2.3 Detalhe do livro (módulo de composição)

Uma rota que devolve tudo o que a tela do livro precisa. Importa `books`,
`reading-sessions` e stats, sem criar dependência circular.

- [ ] Criar o módulo de detalhe do livro (`book-details`)
- [ ] Service de orquestração que devolve livro, sessões e estatísticas em
      uma resposta
- [ ] Controller com rota por id do livro; livro inexistente ou de outro
      usuário responde not found
- [ ] Documentação no Swagger
- [ ] Testes unitários e E2E

---

## Prioridade 3 — Anos anteriores

### 3.1 Metas de anos anteriores

Hoje o `GoalsService` usa a data atual internamente e a rota não recebe ano.

- [ ] Aceitar o ano como parâmetro na consulta da meta em `goals` (sem meta
      no ano: `target: null`, `current: 0`)
- [ ] Exportar o service no `GoalsModule`, para o módulo do 3.4 usar
- [ ] Testes unitários e E2E

### 3.2 Estatísticas anuais

Equivalente anual do `monthlyStats`, agregação computada sob demanda, sem
tabela própria. Um livro conta no ano pelo `completedAt`.

- [ ] `yearlyStats` no módulo de stats (sessões, páginas lidas, tempo de
      leitura, dias ativos, livros concluídos)
- [ ] `pagesByMonth` (12 meses, de janeiro a dezembro) no `yearlyStats`, para o
      gráfico da página anual
- [ ] Aceitar o ano como parâmetro; ano sem dados devolve zeros, inclusive nas
      12 posições de `pagesByMonth`
- [ ] Testes unitários

### 3.3 Livros concluídos do ano

A tela anual agrupa os livros por mês no front. O backend entrega os livros
concluídos no ano em ordem cronológica, com o mesmo critério de ano do
`countCompleted`.

- [ ] Nova função em `books` (`findCompletedByYear`), sem alterar a assinatura
      do `findLastCompleted`, que continua servindo ao dashboard
- [ ] Ordenar por `completedAt` e reaproveitar o critério de intervalo do ano
      do `countCompleted`
- [ ] Testes unitários

### 3.4 Visão anual (módulo de composição)

Uma rota que devolve tudo o que a tela anual precisa.

- [ ] Criar o módulo da visão anual (`yearly-overview`), importando `goals`,
      stats e `books`
- [ ] Service de orquestração que devolve meta, estatísticas anuais e livros
      concluídos do ano em uma resposta
- [ ] Controller com rota por ano; validar o parâmetro (inteiro válido), pois
      ano inválido é erro de validação e não ano vazio
- [ ] Documentação no Swagger
- [ ] Testes unitários e E2E
