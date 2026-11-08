import type { NeonDatabase } from 'drizzle-orm/neon-serverless'
import type { relations } from './relations'

export type Database = NeonDatabase<typeof relations>
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
