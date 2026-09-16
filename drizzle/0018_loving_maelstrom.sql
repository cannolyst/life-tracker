CREATE TABLE "weekly_task_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"points_awarded" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_task_completions_user_task_week_unique" UNIQUE("user_id","task_id","week_key")
);
--> statement-breakpoint
ALTER TABLE "weekly_task_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weekly_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"points" integer NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_tasks_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "weekly_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "weekly_task_completions" ADD CONSTRAINT "weekly_task_completions_task_id_user_id_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."weekly_tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_task_completions" ADD CONSTRAINT "weekly_task_completions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "weekly_tasks" ADD CONSTRAINT "weekly_tasks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;