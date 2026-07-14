import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const providerEnum = pgEnum('provider', ['google', 'github'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: providerEnum('provider').notNull(),
    providerId: text('provider_id').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    readingSpeed: integer('reading_speed'),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [unique().on(table.provider, table.providerId)],
)
