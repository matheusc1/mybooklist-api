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

### Filosofia geral: a responsabilidade pela precisão do dado é do usuário

Ao longo do desenvolvimento, várias decisões seguiram deliberadamente o
princípio de **não ser paternalista com dados auto-relatados**, o app não
trava nem policia informações cuja única "vítima" de um erro é o próprio
usuário. Esse é o mesmo modelo adotado por apps de tracking pessoal
consolidados:

- **Strava** não impede o registro de atividades com horários sobrepostos.
- **MyFitnessPal** não impede logar a mesma refeição duas vezes.
- **Goodreads** não valida progresso de leitura contra nenhuma fonte externa, o "update progress" é, na prática, um auto-relato que o próprio usuário
  controla.

Esse princípio só deixaria de valer se o dado passasse a impactar terceiros
(ranking público, desafios entre usuários, comparações sociais), cenário
não previsto no escopo atual do produto.

Aplicações concretas dessa filosofia no projeto:

- **Sem bloqueio de registro por falta de `readingSpeed`:** o usuário pode
  pular a medição de velocidade de leitura e seguir usando o app normalmente;
  isso só significa que `durationSeconds` de suas sessões fica em `0`
  (sentinela de "não calculado").
- **Sessões de leitura podem se sobrepor livremente** (ex: registrar
  páginas 100–150 duas vezes): não há validação nem aviso. Motivos:
  responsabilidade do dado é do usuário; custo técnico de um aviso
  não-bloqueante seria alto (Radix não tem modal stack, e a checagem exigiria
  buscar a última sessão do usuário mesmo em telas que não carregam esse
  dado por padrão, como a home/dashboard).
- **Update manual de campos como `currentPage`, `startedAt`, `completedAt`**
  não é forçado nem sincronizado quando o usuário edita um livro diretamente
  (fora do fluxo de reading sessions), se ele esquecer de preencher algo, o
  app não corrige por ele.

### Sincronização de progresso (`currentPage`) — modelo "última ação vence"

`books.currentPage` não tem uma fonte única e fixa de verdade entre "edição
manual" e "reading sessions", os dois são tratados como o mesmo tipo de
evento: *"definir o progresso como X agora"*. Quem venceu por último é quem
vale.

Como o campo `readAt` de uma reading session é **editável pelo usuário**
(suporte a registro retroativo de sessões esquecidas), o critério de "mais
recente" não pode ser a ordem de criação da sessão, precisa refletir a data
que a leitura *representa*. Por isso:

- Vence a sessão com o maior `readAt` entre todas as sessões do livro.
- Em caso de empate (mesmo dia), desempata por `updatedAt` (a edição mais
  recente).
- `create`/`update`/`delete` de sessão recalculam esse "vencedor" do zero e
  sincronizam `books.currentPage` de acordo, dentro de uma transaction
  (garantindo atomicidade entre a escrita na sessão e o update do livro).
- Se todas as sessões de um livro forem apagadas, `currentPage` **não** é
  resetado, mantém o último valor conhecido.

Consequência aceita conscientemente: o progresso pode "regredir" se o
usuário editar `currentPage` manualmente para um valor alto e depois
registrar uma sessão retroativa com `toPage` menor. Isso é esperado, não é
um bug, segue a mesma filosofia de autonomia descrita acima.

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

Ver `TODO.md` para o detalhamento de decisões em aberto e features
planejadas (status automático de livros, dashboard, estatísticas semanais e
mensais de leitura).

## Projetos relacionados

- **Frontend:** React, TypeScript, TanStack Router/Query/Form, Radix UI,
  Base UI, Tailwind CSS v4, Zustand, Zod - [MyBookList](https://github.com/matheusc1/mybooklist)
