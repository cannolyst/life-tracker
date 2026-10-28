CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"launch_start_minutes" integer DEFAULT 300 NOT NULL,
	"work_start_minutes" integer DEFAULT 480 NOT NULL,
	"work_end_minutes" integer DEFAULT 960 NOT NULL,
	"evening_start_minutes" integer DEFAULT 1020 NOT NULL,
	"shutdown_start_minutes" integer DEFAULT 1200 NOT NULL,
	"calendar_url_encrypted" text,
	"calendar_url_hint" text,
	"brief_city" text DEFAULT 'Chicago' NOT NULL,
	"notification_prefs" jsonb DEFAULT '{"lunchCard":true,"shutdownNudge":true,"sundayReset":true,"urgentFlags":true}'::jsonb NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_block_order_check" CHECK ("user_settings"."launch_start_minutes" < "user_settings"."work_start_minutes" and "user_settings"."work_start_minutes" < "user_settings"."work_end_minutes" and "user_settings"."work_end_minutes" <= "user_settings"."evening_start_minutes" and "user_settings"."evening_start_minutes" < "user_settings"."shutdown_start_minutes" and "user_settings"."shutdown_start_minutes" < 1440 and "user_settings"."launch_start_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
