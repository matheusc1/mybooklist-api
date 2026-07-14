import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { relations } from './relations'

export type Database = NeonHttpDatabase<typeof relations>
