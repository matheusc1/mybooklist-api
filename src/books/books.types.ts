import { books } from '@/database/schema/books.schema'

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert
