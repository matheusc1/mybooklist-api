import { date, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { books } from './books.schema'

export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookId: uuid('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  fromPage: integer('from_page').notNull(),
  toPage: integer('to_page').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  readAt: date('read_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
