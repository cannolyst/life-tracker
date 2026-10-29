CREATE TABLE "recurring_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"interval_days" integer NOT NULL,
	"last_done" text,
	"skipped_date" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_items_interval_check" CHECK ("recurring_items"."interval_days" between 1 and 3650)
);
--> statement-breakpoint
ALTER TABLE "recurring_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"cycle" text DEFAULT 'monthly' NOT NULL,
	"next_charge" text NOT NULL,
	"autopay" boolean DEFAULT true NOT NULL,
	"trial_ends" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_cycle_check" CHECK ("subscriptions"."cycle" in ('monthly','yearly')),
	CONSTRAINT "subscriptions_amount_check" CHECK ("subscriptions"."amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bills_line_items" ADD COLUMN "autopay" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_month" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_day" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "see_every_weeks" integer;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "last_seen" text;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "gift_list_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_birthday_check" CHECK (("people"."birth_month" is null and "people"."birth_day" is null) or ("people"."birth_month" between 1 and 12 and "people"."birth_day" between 1 and 31));--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_see_every_check" CHECK ("people"."see_every_weeks" is null or "people"."see_every_weeks" between 1 and 104);--> statement-breakpoint
ALTER TABLE "recurring_items" ADD CONSTRAINT "recurring_items_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_gift_list_id_fk" FOREIGN KEY ("gift_list_id") REFERENCES "list_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX "recurring_items_user_idx" ON "recurring_items" ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" ("user_id");
