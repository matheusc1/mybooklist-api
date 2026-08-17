import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const statusEnum = pgEnum('status', [
  'reading',
  'planned',
  'paused',
  'completed',
  'dropped',
])

export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author').notNull(),
  genre: text('genre').notNull(),
  coverUrl: text('cover_url'),
  totalPages: integer('total_pages').notNull(),
  currentPage: integer('current_page').default(0),
  status: statusEnum().notNull(),
  rating: integer('rating'),
  startedAt: date('started_at'),
  completedAt: date('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
