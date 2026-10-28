CREATE TABLE "day_flags" (
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"out_tonight" boolean NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "day_flags_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "day_flags_source_check" CHECK ("day_flags"."source" in ('auto','manual'))
);
--> statement-breakpoint
ALTER TABLE "day_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "day_logs" (
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"finished_count" integer DEFAULT 0 NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_logs_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "day_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "energy_checkins" (
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"level" text NOT NULL,
	"rest_started_at" timestamp with time zone,
	"rest_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "energy_checkins_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "energy_checkins_level_check" CHECK ("energy_checkins"."level" in ('high','low'))
);
--> statement-breakpoint
ALTER TABLE "energy_checkins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"low_title" text,
	"bucket" text DEFAULT 'inbox' NOT NULL,
	"minutes" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"planned_for" text,
	"is_priority" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"done_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_tasks_bucket_check" CHECK ("plan_tasks"."bucket" in ('learning','body','home','inbox')),
	CONSTRAINT "plan_tasks_status_check" CHECK ("plan_tasks"."status" in ('open','done','someday')),
	CONSTRAINT "plan_tasks_minutes_check" CHECK ("plan_tasks"."minutes" is null or ("plan_tasks"."minutes" between 1 and 600))
);
--> statement-breakpoint
ALTER TABLE "plan_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "energy_checkins" ADD CONSTRAINT "energy_checkins_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "day_flags" ADD CONSTRAINT "day_flags_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "day_logs" ADD CONSTRAINT "day_logs_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE INDEX "plan_tasks_user_status_idx" ON "plan_tasks" ("user_id","status");
