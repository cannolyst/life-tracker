CREATE TABLE "saved_sparks" (
	"user_id" uuid NOT NULL,
	"spark_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_sparks_user_id_spark_id_pk" PRIMARY KEY("user_id","spark_id")
);
--> statement-breakpoint
ALTER TABLE "saved_sparks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "spark_days" (
	"user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"spark_id" text NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "spark_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "spark_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "saved_sparks" ADD CONSTRAINT "saved_sparks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "spark_days" ADD CONSTRAINT "spark_days_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
