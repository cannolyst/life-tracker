ALTER TABLE "list_categories" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "list_categories" SET "order_index" = ranked.rn - 1 FROM (SELECT "id", row_number() OVER (PARTITION BY "user_id" ORDER BY "created_at") AS rn FROM "list_categories") AS ranked WHERE "list_categories"."id" = ranked."id";
