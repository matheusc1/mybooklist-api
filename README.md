# MyBookList API

> ⚠️ Documento de referência temporário/em construção. Serve como contexto rápido caso o histórico de decisões se perca em algum momento.

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
- **Documentação da API:** Swagger via `@nestjs/swagger`, servida como
  referência interativa em `/reference` com `@scalar/nestjs-api-reference`
  (`@ApiProperty` adicionado manualmente nos DTOs, já que o plugin de CLI
  do Nest não é confiável com SWC)
- **Testes:** Jest para testes unitários (todos os módulos) e testes E2E
  com Supertest contra um banco de dados de teste isolado

## Arquitetura

- **Módulo por feature:** `auth`, `users`, `books`, `goals`,
  `reading-sessions`, `dashboard`, `activity`, `database`
- **Repository pattern:** todo módulo com acesso a dados segue o padrão de
  repository (abstract class como token de DI), separando a lógica de
  negócio do service da implementação de acesso ao banco (Drizzle)
- **Conexão de banco:** `DatabaseModule` expõe dois tokens — `DATABASE_POOL`
  (o pool de conexões, usado para transactions e para o graceful shutdown
  via `onModuleDestroy`) e `DATABASE_CONNECTION` (a instância Drizzle,
  injetável nos repositories)
- **Ownership de dados:** toda tabela relacionada a um usuário valida posse
  via `userId`, em tabelas sem `userId` direto (ex: `reading_sessions`, que
  só tem `bookId`), a validação é feita via `innerJoin` com `books`
- **Activity/Dashboard como agregações computadas:** não existem tabelas
  próprias de "atividade" ou "dashboard", ambas são derivadas das reading
  sessions sob demanda, via um `ReadingSessionsStatsService` dedicado, e
  não são persistidas
- **Imutabilidade histórica:** `durationSeconds` é calculado e persistido no
  momento da criação da sessão (usando o `readingSpeed` do usuário *naquele
  momento*), para que uma mudança futura na velocidade de leitura do usuário
  não altere retroativamente sessões antigas
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
  progresso de páginas, com uma reading session tendo autoridade para
  sobrescrever até status definidos manualmente (`dropped`, `paused`).
- **Sessões de leitura podem se sobrepor livremente**, sem validação nem
  aviso. Essa é uma decisão deliberada, não uma lacuna.
- **Apagar a última sessão de um livro** não reseta o progresso
  automaticamente por padrão, o sistema não consegue distinguir "corrigi
  um erro de digitação" de "desisti do livro por enquanto", então a escolha
  é explícita do usuário, via a opção `resetToPlanned` no delete.

Raciocínio completo de cada decisão (contexto, alternativas consideradas,
motivos) em `DECISIONS.md`.

## Estrutura de módulos (alto nível)

```
src/
  auth/              # OAuth (Google/GitHub), JWT, guards, decorators
  users/             # perfil do usuário, readingSpeed
  books/             # CRUD de livros, ownership, currentPage/status
  goals/             # metas anuais de leitura
  reading-sessions/  # registro de sessões de leitura, sync com books
  dashboard/         # overview consolidado (livro atual, atividade recente, stats semanais)
  activity/          # estatísticas e atividade mensal detalhada
  database/          # conexão Drizzle, schema, relations
```

## Testes

- **Unitários:** cobertura em todos os módulos (controller, service,
  repository, e componentes com lógica própria como strategies e guards em
  `auth`), seguindo repository/service/controller como camadas isoladas via
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

## Como rodar

```bash
# instalar dependências
npm install

# variáveis de ambiente necessárias (.env) [ajustar valores reais]
DATABASE_URL=
TEST_DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
JWT_SECRET=
TEST_JWT_SECRET=
FRONTEND_URL=

# rodar em desenvolvimento
npm run start:dev
```

## Roadmap / pendências

Ver `TODO.md` para o detalhamento de features planejadas e `DECISIONS.md`
para decisões de arquitetura já tomadas.

## Projetos relacionados

- **Frontend:** React, TypeScript, TanStack Router/Query/Form, Radix UI,
  Base UI, Tailwind CSS v4, Zustand, Zod - [MyBookList](https://github.com/matheusc1/mybooklist)
