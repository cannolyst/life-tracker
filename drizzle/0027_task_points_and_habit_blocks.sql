CREATE TABLE "task_point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"kind" text NOT NULL,
	"points" integer NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_point_events_kind_check" CHECK ("task_point_events"."kind" in ('start','finish','reentry'))
);
--> statement-breakpoint
ALTER TABLE "task_point_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD COLUMN "block" text;--> statement-breakpoint
CREATE UNIQUE INDEX "task_point_events_start_unique" ON "task_point_events" USING btree ("user_id","task_id","date") WHERE "task_point_events"."kind" = 'start';--> statement-breakpoint
CREATE UNIQUE INDEX "task_point_events_finish_unique" ON "task_point_events" USING btree ("user_id","task_id") WHERE "task_point_events"."kind" = 'finish';--> statement-breakpoint
CREATE UNIQUE INDEX "task_point_events_reentry_unique" ON "task_point_events" USING btree ("user_id","date") WHERE "task_point_events"."kind" = 'reentry';--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD CONSTRAINT "habit_tasks_block_check" CHECK ("habit_tasks"."block" is null or "habit_tasks"."block" in ('launch','work','transition','evening','shutdown'));--> statement-breakpoint
ALTER TABLE "task_point_events" ADD CONSTRAINT "task_point_events_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "task_point_events_user_date_idx" ON "task_point_events" ("user_id","date");
