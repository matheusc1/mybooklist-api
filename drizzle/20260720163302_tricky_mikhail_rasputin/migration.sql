ALTER TABLE "books" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "status";--> statement-breakpoint
CREATE TYPE "status" AS ENUM('reading', 'planned', 'paused', 'completed', 'dropped');--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "status" SET DATA TYPE "status" USING "status"::"status";