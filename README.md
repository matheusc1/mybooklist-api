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

## Arquitetura

- **Módulo por feature:** `auth`, `users`, `books`, `goals`, `reading-sessions`,
  `database`
- **Conexão de banco:** `DatabaseModule` exporta um único token
  (`DATABASE_CONNECTION`) injetável nos services
- **Ownership de dados:** toda tabela relacionada a um usuário valida posse
  via `userId`, em tabelas sem `userId` direto (ex: `reading_sessions`, que
  só tem `bookId`), a validação é feita via `innerJoin` com `books`
- **Activity como agregação computada:** não existe uma tabela própria de
  "atividade", ela é derivada das reading sessions sob demanda, não
  persistida
- **Imutabilidade histórica:** `durationSeconds` é calculado e persistido no
  momento da criação da sessão (usando o `readingSpeed` do usuário *naquele
  momento*), para que uma mudança futura na velocidade de leitura do usuário
  não altere retroativamente sessões antigas
- **Padrões de código:** commits pequenos e escopados por módulo
  (`feat(goals):`, `feat(reading-sessions):`), soluções diretas e
  opinativas em vez de abstrações prematuras

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
  automaticamente, por padrão, o sistema não consegue distinguir "corrigi
  um erro de digitação" de "desisti do livro por enquanto", então a escolha
  é explícita do usuário.

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
  database/          # conexão Drizzle, schema, relations
```

## Como rodar

```bash
# instalar dependências
npm install

# variáveis de ambiente necessárias (.env) [ajustar valores reais]
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
JWT_SECRET=
FRONTEND_URL=

# rodar em desenvolvimento
npm run start:dev
```

## Roadmap / pendências

Ver `TODO.md` para o detalhamento de features planejadas (dashboard,
estatísticas semanais e mensais de leitura) e `DECISIONS.md` para decisões
de arquitetura já tomadas.

## Projetos relacionados

- **Frontend:** React, TypeScript, TanStack Router/Query/Form, Radix UI,
  Base UI, Tailwind CSS v4, Zustand, Zod - [MyBookList](https://github.com/matheusc1/mybooklist)
