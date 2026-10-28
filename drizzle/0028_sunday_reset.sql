CREATE TABLE "weekly_resets" (
	"user_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"highlight" text DEFAULT '' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_resets_user_id_week_key_pk" PRIMARY KEY("user_id","week_key")
);
--> statement-breakpoint
ALTER TABLE "weekly_resets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_point_events" DROP CONSTRAINT "task_point_events_kind_check";--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "task_point_events_reset_unique" ON "task_point_events" USING btree ("user_id","date") WHERE "task_point_events"."kind" = 'reset';--> statement-breakpoint
ALTER TABLE "task_point_events" ADD CONSTRAINT "task_point_events_kind_check" CHECK ("task_point_events"."kind" in ('start','finish','reentry','reset'));--> statement-breakpoint
ALTER TABLE "weekly_resets" ADD CONSTRAINT "weekly_resets_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
