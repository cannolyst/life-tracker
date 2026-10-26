CREATE TABLE "brief_seen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"story_id" text NOT NULL,
	"title" text NOT NULL,
	"section" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brief_seen_user_id_story_id_unique" UNIQUE("user_id","story_id"),
	CONSTRAINT "brief_seen_section_check" CHECK ("brief_seen"."section" in ('national','chicago','tech'))
);
--> statement-breakpoint
ALTER TABLE "brief_seen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brief_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brief_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "brief_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "module_settings" ADD COLUMN "show_news" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "brief_seen" ADD CONSTRAINT "brief_seen_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brief_tokens" ADD CONSTRAINT "brief_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
