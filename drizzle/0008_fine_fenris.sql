ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cleaning_areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cleaning_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "debt_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "debt_statements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "savings_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "todos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "year_review_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "year_review_item_people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "year_review_item_places" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "year_review_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_name_unique";--> statement-breakpoint
ALTER TABLE "places" DROP CONSTRAINT "places_name_unique";--> statement-breakpoint
ALTER TABLE "cleaning_completions" DROP CONSTRAINT "cleaning_completions_task_id_cleaning_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "cleaning_tasks" DROP CONSTRAINT "cleaning_tasks_area_id_cleaning_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "debt_details" DROP CONSTRAINT "debt_details_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "debt_statements" DROP CONSTRAINT "debt_statements_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "goals" DROP CONSTRAINT "goals_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "habit_completions" DROP CONSTRAINT "habit_completions_task_id_habit_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "habit_tasks" DROP CONSTRAINT "habit_tasks_category_id_habit_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "list_items" DROP CONSTRAINT "list_items_category_id_list_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "redemptions" DROP CONSTRAINT "redemptions_reward_id_rewards_id_fk";
--> statement-breakpoint
ALTER TABLE "savings_details" DROP CONSTRAINT "savings_details_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_exercises" DROP CONSTRAINT "workout_exercises_day_id_workout_days_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sessions" DROP CONSTRAINT "workout_sessions_day_id_workout_days_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_session_id_workout_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_exercise_id_workout_exercises_id_fk";
--> statement-breakpoint
ALTER TABLE "year_review_item_people" DROP CONSTRAINT "year_review_item_people_item_id_year_review_items_id_fk";
--> statement-breakpoint
ALTER TABLE "year_review_item_people" DROP CONSTRAINT "year_review_item_people_person_id_people_id_fk";
--> statement-breakpoint
ALTER TABLE "year_review_item_places" DROP CONSTRAINT "year_review_item_places_item_id_year_review_items_id_fk";
--> statement-breakpoint
ALTER TABLE "year_review_item_places" DROP CONSTRAINT "year_review_item_places_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "year_review_items" DROP CONSTRAINT "year_review_items_category_id_year_review_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "cleaning_areas" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "cleaning_completions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "debt_details" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "debt_statements" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "habit_categories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "habit_completions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "list_categories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "list_items" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "rewards" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "savings_details" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_days" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "year_review_categories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "year_review_items" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "cleaning_areas" ADD CONSTRAINT "cleaning_areas_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "habit_categories" ADD CONSTRAINT "habit_categories_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD CONSTRAINT "habit_tasks_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "list_categories" ADD CONSTRAINT "list_categories_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_name_unique" UNIQUE("user_id","name");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_user_id_name_unique" UNIQUE("user_id","name");--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "year_review_categories" ADD CONSTRAINT "year_review_categories_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "year_review_items" ADD CONSTRAINT "year_review_items_id_user_id_unique" UNIQUE("id","user_id");--> statement-breakpoint
ALTER TABLE "cleaning_completions" ADD CONSTRAINT "cleaning_completions_task_id_user_id_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."cleaning_tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_area_id_user_id_fk" FOREIGN KEY ("area_id","user_id") REFERENCES "public"."cleaning_areas"("id","user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_details" ADD CONSTRAINT "debt_details_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_statements" ADD CONSTRAINT "debt_statements_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_task_id_user_id_fk" FOREIGN KEY ("task_id","user_id") REFERENCES "public"."habit_tasks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD CONSTRAINT "habit_tasks_category_id_user_id_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."habit_categories"("id","user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_category_id_user_id_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."list_categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_reward_id_user_id_fk" FOREIGN KEY ("reward_id","user_id") REFERENCES "public"."rewards"("id","user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_user_id_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_day_id_user_id_fk" FOREIGN KEY ("day_id","user_id") REFERENCES "public"."workout_days"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_day_id_user_id_fk" FOREIGN KEY ("day_id","user_id") REFERENCES "public"."workout_days"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_user_id_fk" FOREIGN KEY ("session_id","user_id") REFERENCES "public"."workout_sessions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_user_id_fk" FOREIGN KEY ("exercise_id","user_id") REFERENCES "public"."workout_exercises"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD CONSTRAINT "year_review_item_people_item_id_user_id_fk" FOREIGN KEY ("item_id","user_id") REFERENCES "public"."year_review_items"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD CONSTRAINT "year_review_item_people_person_id_user_id_fk" FOREIGN KEY ("person_id","user_id") REFERENCES "public"."people"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD CONSTRAINT "year_review_item_places_item_id_user_id_fk" FOREIGN KEY ("item_id","user_id") REFERENCES "public"."year_review_items"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD CONSTRAINT "year_review_item_places_place_id_user_id_fk" FOREIGN KEY ("place_id","user_id") REFERENCES "public"."places"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "year_review_items" ADD CONSTRAINT "year_review_items_category_id_user_id_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."year_review_categories"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "cleaning_areas" ADD CONSTRAINT "cleaning_areas_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "cleaning_completions" ADD CONSTRAINT "cleaning_completions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "debt_details" ADD CONSTRAINT "debt_details_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "debt_statements" ADD CONSTRAINT "debt_statements_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "habit_categories" ADD CONSTRAINT "habit_categories_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "habit_tasks" ADD CONSTRAINT "habit_tasks_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "list_categories" ADD CONSTRAINT "list_categories_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "year_review_categories" ADD CONSTRAINT "year_review_categories_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "year_review_item_people" ADD CONSTRAINT "year_review_item_people_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "year_review_item_places" ADD CONSTRAINT "year_review_item_places_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "year_review_items" ADD CONSTRAINT "year_review_items_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
