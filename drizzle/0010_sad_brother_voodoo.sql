CREATE TABLE "workout_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_programs_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workout_programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_days" ADD COLUMN "program_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_program_id_user_id_fk" FOREIGN KEY ("program_id","user_id") REFERENCES "public"."workout_programs"("id","user_id") ON DELETE cascade ON UPDATE no action;