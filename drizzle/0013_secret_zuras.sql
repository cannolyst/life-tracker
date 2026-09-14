CREATE TABLE "emotion_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"moment" text NOT NULL,
	"category" text NOT NULL,
	"word" text NOT NULL,
	"zone" text NOT NULL,
	"mode" text NOT NULL,
	"points_awarded" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emotion_entries_category_check" CHECK ("emotion_entries"."category" in ('mad','sad','glad','scared','surprised','disgusted')),
	CONSTRAINT "emotion_entries_zone_check" CHECK ("emotion_entries"."zone" in ('chest','throat','stomach','jaw','none')),
	CONSTRAINT "emotion_entries_mode_check" CHECK ("emotion_entries"."mode" in ('quiet','stuck'))
);
--> statement-breakpoint
ALTER TABLE "emotion_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "module_settings" ADD COLUMN "show_emotion_check_in" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "emotion_entries" ADD CONSTRAINT "emotion_entries_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;