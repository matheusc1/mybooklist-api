import type { readingSessions } from '@/database/schema/reading-sessions.schema'

export type ReadingSession = typeof readingSessions.$inferSelect
export type NewReadingSession = typeof readingSessions.$inferInsert
