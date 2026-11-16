# MyBookList API

API do MyBookList, uma aplicação de tracking de leitura pessoal.

## Sobre o projeto

MyBookList é uma aplicação de tracking de leitura pessoal, o usuário
cadastra livros, registra sessões de leitura (progresso de página, tempo
gasto), define metas anuais e acompanha estatísticas de atividade.

## Stack

- **Runtime/Framework:** Node.js, NestJS
- **Linguagem:** TypeScript
- **Banco de dados:** PostgreSQL (Neon), via driver `neon-serverless`
  (WebSocket/`Pool`), necessário para suporte a transactions, já que o
  driver `neon-http` (usado inicialmente) é stateless e não suporta
- **ORM:** Drizzle ORM (RQB v2, sintaxe de `where` em object-style)
- **Autenticação:** OAuth (Google e GitHub) via Passport.js, JWT em cookies
  httpOnly, guard global (`JwtAuthGuard`) com decorator `@Public()` para
  rotas abertas
- **Validação:** class-validator / class-transformer nos DTOs
- **Segurança:** headers via `app.useSecurityHeaders()` do Nest e rate
  limiting com `@nestjs/throttler`
- **Documentação da API:** Swagger via `@nestjs/swagger`, servida como
  referência interativa em `/reference` com `@scalar/nestjs-api-reference`
  (`@ApiProperty` adicionado manualmente nos DTOs, já que o plugin de CLI
  do Nest não é confiável com SWC)
- **Testes:** Jest para testes unitários (todos os módulos) e testes E2E
  com Supertest contra um banco de dados de teste isolado

## Arquitetura

- **Módulo por feature:** `auth`, `users`, `books`, `goals`,
  `reading-sessions`, `stats`, `dashboard`, `activity`, `book-details`,
  `yearly-overview`, `health`, `database`
- **Repository pattern:** todo módulo com acesso a dados segue o padrão de
  repository (abstract class como token de DI), separando a lógica de
  negócio do service da implementação de acesso ao banco (Drizzle)
- **Conexão de banco:** o `DatabaseModule` encapsula o pool de conexões
  (usado para transactions e fechado no `onModuleDestroy`, para o graceful
  shutdown) e exporta apenas o token `DATABASE_CONNECTION`, a instância
  Drizzle injetável nos repositories
- **Ownership de dados:** toda tabela relacionada a um usuário valida posse
  via `userId`, em tabelas sem `userId` direto (ex: `reading_sessions`, que
  só tem `bookId`), a validação é feita via `innerJoin` com `books`
- **Estatísticas como agregações computadas:** não existem tabelas próprias
  de "atividade", "dashboard" ou "visão anual". Tudo é derivado das reading
  sessions sob demanda, via um `StatsService` dedicado, e não é persistido.
  `dashboard`, `activity`, `book-details` e `yearly-overview` compõem
  services de outros módulos em vez de acessar o banco direto
- **Imutabilidade histórica:** `durationSeconds` é calculado e persistido no
  momento da criação da sessão (usando o `readingSpeed` do usuário *naquele
  momento*), para que uma mudança futura na velocidade de leitura do usuário
  não altere retroativamente sessões antigas. Editar só a data de uma sessão
  não recalcula a duração
- **Validação em camadas:** os DTOs descrevem formato e tipo, e as regras que
  dependem de estado (ou de `null` em campos obrigatórios) ficam nos
  services
- **Padrões de código:** commits pequenos e escopados por módulo
  (`feat(goals):`, `feat(reading-sessions):`, `test(books):`), soluções
  diretas e opinativas em vez de abstrações prematuras

## Decisões de design notáveis

O projeto segue, de forma deliberada, o princípio de **não ser paternalista
com dados auto-relatados**. O app não trava nem policia informações cuja
única "vítima" de um erro é o próprio usuário. É o mesmo modelo adotado por
apps de tracking pessoal consolidados (Strava, MyFitnessPal, Goodreads).

Algumas decisões concretas construídas sobre esse princípio:

- **Sincronização de `currentPage`** entre edição manual e reading sessions
  segue um modelo de "última ação vence", baseado na data que a leitura
  representa (`readAt`), não na ordem de criação, já que sessões podem ser
  registradas retroativamente.
- **`status`, `startedAt` e `completedAt`** são derivados automaticamente do
  progresso de páginas quando uma reading session é criada, editada ou
  apagada, com a sessão tendo autoridade para sobrescrever até status
  definidos manualmente (`dropped`, `paused`). Na criação e na edição manual
  do livro nada é derivado: só há duas regras de coerência (`completedAt` não
  pode ser anterior a `startedAt`, e um livro concluído sem data recebe a de
  hoje).
- **Sessões de leitura podem se sobrepor livremente**, sem validação nem
  aviso. Essa é uma decisão deliberada, não uma lacuna.
- **Apagar a última sessão de um livro** não reseta o progresso
  automaticamente por padrão, o sistema não consegue distinguir "corrigi
  um erro de digitação" de "desisti do livro por enquanto", então a escolha
  é explícita do usuário, via a opção `resetToPlanned` no delete.

Outras decisões, com contexto e alternativas: identidade de conta e
sincronização de perfil (ADR 009), sessão por JWT em cookie sem revogação
(ADR 010), rotas de teste que só existem com `NODE_ENV=test` (ADR 011) e
proteção da borda HTTP (ADR 012).

Raciocínio completo de cada decisão (contexto, alternativas consideradas,
motivos) em [DECISIONS.md](./DECISIONS.md).

## Estrutura de módulos (alto nível)

```
src/
  auth/              # OAuth (Google/GitHub), JWT, guards, decorators
  users/             # perfil do usuário, readingSpeed
  books/             # CRUD de livros, ownership, currentPage/status
  goals/             # metas anuais de leitura
  reading-sessions/  # registro de sessões de leitura, sync com books
  stats/             # agregações sobre as sessões (semana, mês, ano, por livro)
  dashboard/         # overview consolidado (livro atual, atividade recente, stats semanais)
  activity/          # estatísticas e atividade mensal detalhada
  book-details/      # detalhe de um livro (compõe livro, sessões e estatísticas)
  yearly-overview/   # visão do ano (compõe livros concluídos, meta e estatísticas)
  health/            # verificação de saúde da API e do banco
  common/            # utilitários compartilhados (datas, URL do front)
  database/          # conexão Drizzle, schema, relations
  test/              # rotas auxiliares do E2E, só com NODE_ENV=test
```

## Testes

- **Unitários:** cobertura em todos os módulos (controller, service,
  repository, DTOs e componentes com lógica própria como strategies e guards
  em `auth`), seguindo repository/service/controller como camadas isoladas via
  mocks
- **E2E:** suíte com Supertest cobrindo autenticação e rotas protegidas,
  autorização entre usuários (ownership em update/delete), respostas de
  not-found, validação na borda HTTP, e o fluxo completo entre módulos
  (criar livro → registrar sessão → refletir em goals/dashboard/activity)
  rodando contra um banco de dados de teste isolado

```bash
# testes unitários
npm run test

# testes e2e (requer TEST_DATABASE_URL e TEST_JWT_SECRET no .env)
npm run test:e2e
```

O `TEST_DATABASE_URL` precisa apontar para um banco **diferente** do
`DATABASE_URL`: o E2E cria e apaga usuários, e recusa rodar se os dois forem
iguais. As rotas auxiliares do E2E (`/test/*`) só são montadas com
`NODE_ENV=test` e `E2E_TEST_MODE=true`, definidos pelo próprio código dos
testes. Para subir uma API de teste à mão, use `npm run start:e2e`.

## Como rodar

```bash
# instalar dependências
npm install

# variáveis de ambiente necessárias (.env)
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
JWT_SECRET=

# obrigatória em produção: a API não sobe sem ela. Em desenvolvimento, o
# padrão é http://localhost:5173
FRONTEND_URL=

# usadas só pelo E2E (o banco precisa ser diferente do DATABASE_URL)
TEST_DATABASE_URL=
TEST_JWT_SECRET=

# Variáveis opcionais

# Usada em produção, quando front e API ficam em subdomínios diferentes (ex: `.meusite.com`) e o cookie JWT precisa ser compartilhado entre eles. Em desenvolvimento local, deixe sem definir.
COOKIE_DOMAIN=

# Porta da API (padrão: 3000)
PORT=

# rodar em desenvolvimento
npm run start:dev
```

Em produção, defina `NODE_ENV=production`. Essa variável liga o atributo
`secure` dos cookies e o `trust proxy`, usado pelo rate limit para enxergar o
IP real do cliente atrás do proxy da hospedagem.

Com a API no ar, a referência interativa fica em `/reference`.

## Roadmap / pendências

Ver [TODO.md](./TODO.md) para o detalhamento de features planejadas e
[DECISIONS.md](./DECISIONS.md) para decisões de arquitetura já tomadas.

## Projetos relacionados

- **Frontend:** React, TypeScript, TanStack Router/Query/Form, Radix UI,
  Base UI, Tailwind CSS v4, Zustand, Zod - [MyBookList](https://github.com/matheusc1/mybooklist)
