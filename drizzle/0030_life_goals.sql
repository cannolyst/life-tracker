CREATE TABLE "goal_habits" (
	"goal_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "goal_habits_goal_id_habit_id_pk" PRIMARY KEY("goal_id","habit_id")
);
--> statement-breakpoint
ALTER TABLE "goal_habits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "goal_milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "life_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"why" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"finish_line" text,
	"weekly_target" integer,
	"start_date" text NOT NULL,
	"deadline" text NOT NULL,
	"area" text DEFAULT 'learning' NOT NULL,
	"link_workouts" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"completed_on" text,
	"extended_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "life_goals_kind_check" CHECK ("life_goals"."kind" in ('finish','rhythm','ongoing')),
	CONSTRAINT "life_goals_status_check" CHECK ("life_goals"."status" in ('active','someday','done','retired')),
	CONSTRAINT "life_goals_area_check" CHECK ("life_goals"."area" in ('learning','body','home')),
	CONSTRAINT "life_goals_target_check" CHECK ("life_goals"."weekly_target" is null or "life_goals"."weekly_target" between 1 and 21),
	CONSTRAINT "life_goals_deadline_check" CHECK ("life_goals"."deadline" > "life_goals"."start_date")
);
--> statement-breakpoint
ALTER TABLE "life_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "goal_id" uuid;--> statement-breakpoint
ALTER TABLE "life_goals" ADD CONSTRAINT "life_goals_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_habits" ADD CONSTRAINT "goal_habits_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_habits" ADD CONSTRAINT "goal_habits_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "life_goals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_habits" ADD CONSTRAINT "goal_habits_habit_id_fk" FOREIGN KEY ("habit_id") REFERENCES "habit_tasks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "life_goals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "life_goals"("id") ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX "life_goals_user_idx" ON "life_goals" ("user_id","status");--> statement-breakpoint
CREATE INDEX "goal_milestones_goal_idx" ON "goal_milestones" ("goal_id");
