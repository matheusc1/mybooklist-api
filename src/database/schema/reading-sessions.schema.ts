import { date, integer, pgTable, uuid } from 'drizzle-orm/pg-core'
import { books } from './books.schema'

export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  pagesRead: integer('pages_read').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  readAt: date('read_at').notNull(),
})
