CREATE TYPE "provider" AS ENUM('google', 'github');--> statement-breakpoint
ALTER TABLE "reading_sessions" RENAME COLUMN "session_date" TO "read_at";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_provider_id_key";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" "provider" NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_provider_provider_id_unique" UNIQUE("provider","provider_id");
