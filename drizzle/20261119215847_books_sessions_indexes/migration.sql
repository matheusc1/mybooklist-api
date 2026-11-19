CREATE INDEX "books_user_id_idx" ON "books" ("user_id");--> statement-breakpoint
CREATE INDEX "reading_sessions_book_id_read_at_idx" ON "reading_sessions" ("book_id","read_at");