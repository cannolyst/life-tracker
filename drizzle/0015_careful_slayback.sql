CREATE TABLE "bills_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"account_id" uuid,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "paycheck_checklist_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"period_key" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paycheck_checklist_checks_user_item_period_unique" UNIQUE("user_id","item_key","period_key")
);
--> statement-breakpoint
ALTER TABLE "paycheck_checklist_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "paycheck_plan" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"planned_amount" numeric(10, 2) NOT NULL,
	"actual_amount" numeric(10, 2) NOT NULL,
	"pay_day_1" integer NOT NULL,
	"pay_day_2" integer NOT NULL,
	"bills_transfer_amount" numeric(10, 2) NOT NULL,
	"hysa_transfer_amount" numeric(10, 2) NOT NULL,
	"hysa_account_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paycheck_plan_pay_day_1_check" CHECK ("paycheck_plan"."pay_day_1" between 1 and 31),
	CONSTRAINT "paycheck_plan_pay_day_2_check" CHECK ("paycheck_plan"."pay_day_2" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "paycheck_plan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bills_line_items" ADD CONSTRAINT "bills_line_items_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paycheck_plan" ADD CONSTRAINT "paycheck_plan_hysa_account_id_user_id_fk" FOREIGN KEY ("hysa_account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills_line_items" ADD CONSTRAINT "bills_line_items_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "paycheck_checklist_checks" ADD CONSTRAINT "paycheck_checklist_checks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "paycheck_plan" ADD CONSTRAINT "paycheck_plan_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;