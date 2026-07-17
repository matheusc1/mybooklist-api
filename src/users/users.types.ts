import { users } from '@/database/schema/users.schema'

export type User = typeof users.$inferSelect
export type CreateUser = typeof users.$inferInsert
