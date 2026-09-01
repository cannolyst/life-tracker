ALTER TABLE "year_review_items" ALTER COLUMN "date" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "year_review_items" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "year_review_items" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "year_review_items" ADD COLUMN "month" integer;--> statement-breakpoint
UPDATE "year_review_items" SET "year" = EXTRACT(YEAR FROM "date")::int, "month" = EXTRACT(MONTH FROM "date")::int WHERE "date" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "year_review_items" ALTER COLUMN "year" SET NOT NULL;
