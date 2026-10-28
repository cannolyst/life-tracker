ALTER TABLE "list_categories" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "verb" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "energy" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "block" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "first_step" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "skip_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "skipped_date" text;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD COLUMN "source_todo_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "moved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_user_source_todo_unique" UNIQUE("user_id","source_todo_id");--> statement-breakpoint
ALTER TABLE "list_categories" ADD CONSTRAINT "list_categories_context_check" CHECK ("list_categories"."context" is null or "list_categories"."context" in ('groceries','movies','books'));--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_energy_check" CHECK ("plan_tasks"."energy" is null or "plan_tasks"."energy" in ('high','low'));--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_block_check" CHECK ("plan_tasks"."block" is null or "plan_tasks"."block" in ('launch','work','transition','evening','shutdown'));