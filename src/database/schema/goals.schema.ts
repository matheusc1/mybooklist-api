import { integer, pgTable, uuid, unique } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    target: integer('target').notNull(),
    year: integer('year').notNull(),
  },
  (table) => [unique().on(table.userId, table.year)],
)
