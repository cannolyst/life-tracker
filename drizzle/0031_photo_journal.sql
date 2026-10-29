CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"photo_path" text,
	"photo_taken_on" text,
	"fallback" text,
	"prompt" text DEFAULT '' NOT NULL,
	"reflection" text DEFAULT '' NOT NULL,
	"mood" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_user_date_unique" UNIQUE("user_id","date"),
	CONSTRAINT "journal_entries_fallback_check" CHECK ("journal_entries"."fallback" is null or "journal_entries"."fallback" in ('weather','map')),
	CONSTRAINT "journal_entries_mood_check" CHECK ("journal_entries"."mood" is null or "journal_entries"."mood" in ('bright','calm','tired','heavy','grateful'))
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "journal_entries_user_date_idx" ON "journal_entries" ("user_id","date");
