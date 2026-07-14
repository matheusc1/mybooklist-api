import { defineRelations } from 'drizzle-orm'
import { schema } from './schema'

export const relations = defineRelations(schema, (r) => ({
  users: {
    books: r.many.books(),
    goals: r.many.goals(),
  },
  books: {
    user: r.one.users({
      from: r.books.userId,
      to: r.users.id,
    }),
    readingSessions: r.many.readingSessions(),
  },
  readingSessions: {
    book: r.one.books({
      from: r.readingSessions.bookId,
      to: r.books.id,
    }),
  },
  goals: {
    user: r.one.users({
      from: r.goals.userId,
      to: r.users.id,
    }),
  },
}))
