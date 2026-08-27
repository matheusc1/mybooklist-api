import { goals } from '@/database/schema/goals.schema'

export type Goal = typeof goals.$inferSelect
