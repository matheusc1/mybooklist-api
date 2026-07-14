import { drizzle } from 'drizzle-orm/neon-http'

export type Database = ReturnType<typeof drizzle>
