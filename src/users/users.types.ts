import { users } from '@/database/schema/users.schema'

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
