CREATE TABLE "calendar_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"url_encrypted" text NOT NULL,
	"hint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_links_provider_check" CHECK ("calendar_links"."provider" in ('icloud', 'google'))
);
--> statement-breakpoint
ALTER TABLE "calendar_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_links" ADD CONSTRAINT "calendar_links_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "calendar_links_user_id_idx" ON "calendar_links" ("user_id");--> statement-breakpoint
INSERT INTO "calendar_links" ("user_id", "provider", "label", "url_encrypted", "hint") SELECT "user_id", 'icloud', 'iCloud', "calendar_url_encrypted", COALESCE("calendar_url_hint", 'iCloud link') FROM "user_settings" WHERE "calendar_url_encrypted" IS NOT NULL;
