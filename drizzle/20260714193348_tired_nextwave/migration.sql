CREATE TYPE "status" AS ENUM('reading', 'planned', 'paused', 'finished', 'dropped');--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"cover_url" text,
	"total_pages" integer NOT NULL,
	"current_page" integer DEFAULT 0,
	"status" "status" NOT NULL,
	"rating" integer,
	"started_at" date,
	"finished_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"target" integer NOT NULL,
	"year" integer NOT NULL,
	CONSTRAINT "goals_user_id_year_unique" UNIQUE("user_id","year")
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"book_id" uuid NOT NULL,
	"pages_read" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"session_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" text NOT NULL UNIQUE,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"reading_speed" integer
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE;