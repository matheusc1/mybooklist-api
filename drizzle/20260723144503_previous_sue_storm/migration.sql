ALTER TABLE "reading_sessions" ADD COLUMN "from_page" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD COLUMN "to_page" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_sessions" DROP COLUMN "pages_read";