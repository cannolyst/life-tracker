CREATE TABLE "module_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"show_points" boolean DEFAULT true NOT NULL,
	"show_cleaning" boolean DEFAULT true NOT NULL,
	"show_exercise" boolean DEFAULT true NOT NULL,
	"show_finance" boolean DEFAULT true NOT NULL,
	"show_lists" boolean DEFAULT true NOT NULL,
	"show_todo" boolean DEFAULT true NOT NULL,
	"show_year_review" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "module_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "module_settings" ADD CONSTRAINT "module_settings_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_programs" ADD CONSTRAINT "workout_programs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;