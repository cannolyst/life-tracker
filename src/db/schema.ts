import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  date,
  integer,
  check,
  primaryKey,
  foreignKey,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// NOTE on multi-tenancy: every table has a `user_id` column (nullable for
// now — see the migration plan). It intentionally has no `.references()`
// call here: it points at Supabase Auth's `auth.users(id)`, a table in a
// schema drizzle-kit doesn't manage, so that FK is added by hand in the
// generated migration SQL instead of being declared here.
//
// Every "root" table additionally gets a composite `unique(id, user_id)`,
// and every child table's foreign key to its parent is a composite
// `(parent_id, user_id) references parent(id, user_id)` instead of a
// plain `parent_id references parent(id)`. This makes Postgres itself
// reject a child row whose user_id doesn't match its parent's — a
// database-enforced guarantee instead of a convention every insert has to
// remember.

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    startingBalance: numeric("starting_balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("accounts_type_check", sql`${table.type} in ('savings','debt')`),
    unique("accounts_id_user_id_unique").on(table.id, table.userId),
  ],
).enableRLS();

export const savingsDetails = pgTable(
  "savings_details",
  {
    accountId: uuid("account_id").primaryKey(),
    userId: uuid("user_id").notNull(),
    dailyGoal: numeric("daily_goal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "savings_details_account_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const debtDetails = pgTable(
  "debt_details",
  {
    accountId: uuid("account_id").primaryKey(),
    userId: uuid("user_id").notNull(),
    apr: numeric("apr", { precision: 6, scale: 4 }).notNull(),
    dailyMicropaymentGoal: numeric("daily_micropayment_goal", {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default("0"),
    statementDay: integer("statement_day").notNull(),
  },
  (table) => [
    check(
      "debt_details_statement_day_check",
      sql`${table.statementDay} between 1 and 28`,
    ),
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "debt_details_account_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    date: date("date").notNull().defaultNow(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "transactions_category_check",
      sql`${table.category} in ('one_time','recurring_goal','minimum_payment','interest')`,
    ),
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "transactions_account_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const debtStatements = pgTable(
  "debt_statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    statementDate: date("statement_date").notNull(),
    minimumPaymentDue: numeric("minimum_payment_due", {
      precision: 12,
      scale: 2,
    }).notNull(),
    interestCharged: numeric("interest_charged", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    statementBalance: numeric("statement_balance", { precision: 12, scale: 2 }),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "debt_statements_account_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id").notNull(),
    targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
    targetDate: date("target_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "goals_account_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// --- Points / habit tracker ---
// Ported from tracker-app's goals/tasks/completions/rewards. Named
// "habit_*" to avoid colliding with the finance `goals` table above.

export const habitCategories = pgTable(
  "habit_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("habit_categories_id_user_id_unique").on(table.id, table.userId)],
).enableRLS();

export const habitTasks = pgTable(
  "habit_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id"),
    name: text("name").notNull(),
    points: integer("points").notNull(),
    // Repeatable tasks (e.g. "drink 8oz of water") can be logged more than
    // once per day; non-repeatable tasks are a once-a-day checkbox.
    repeatable: boolean("repeatable").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("habit_tasks_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.categoryId, table.userId],
      foreignColumns: [habitCategories.id, habitCategories.userId],
      name: "habit_tasks_category_id_user_id_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id").notNull(),
    date: date("date").notNull().defaultNow(),
    // Snapshotted so editing a task's point value later doesn't rewrite history.
    pointsAwarded: integer("points_awarded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.taskId, table.userId],
      foreignColumns: [habitTasks.id, habitTasks.userId],
      name: "habit_completions_task_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    cost: integer("cost").notNull(),
    priceUsd: numeric("price_usd", { precision: 12, scale: 2 }),
    link: text("link"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("rewards_id_user_id_unique").on(table.id, table.userId)],
).enableRLS();

export const redemptions = pgTable(
  "redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    rewardId: uuid("reward_id"),
    // Snapshotted so a deleted reward keeps its redemption history intact.
    rewardName: text("reward_name").notNull(),
    pointsCost: integer("points_cost").notNull(),
    date: date("date").notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.rewardId, table.userId],
      foreignColumns: [rewards.id, rewards.userId],
      name: "redemptions_reward_id_user_id_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

// --- Cleaning tracker ---

export const cleaningAreas = pgTable(
  "cleaning_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("cleaning_areas_id_user_id_unique").on(table.id, table.userId)],
).enableRLS();

export const cleaningTasks = pgTable(
  "cleaning_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    areaId: uuid("area_id"),
    name: text("name").notNull(),
    frequencyDays: integer("frequency_days").notNull(),
    points: integer("points").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cleaning_tasks_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.areaId, table.userId],
      foreignColumns: [cleaningAreas.id, cleaningAreas.userId],
      name: "cleaning_tasks_area_id_user_id_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

export const cleaningCompletions = pgTable(
  "cleaning_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id").notNull(),
    date: date("date").notNull().defaultNow(),
    pointsAwarded: integer("points_awarded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.taskId, table.userId],
      foreignColumns: [cleaningTasks.id, cleaningTasks.userId],
      name: "cleaning_completions_task_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// --- Lists (books to read, movies to watch, etc. — no points) ---

export const listCategories = pgTable(
  "list_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    // Position on the Lists page (0 = first); reordered with the up/down arrows.
    orderIndex: integer("order_index").notNull().default(0),
    // What the list is for, so it can appear in context: groceries (Sunday reset),
    // movies (low-energy evenings), books (Shutdown). Null = a plain collection.
    context: text("context"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("list_categories_id_user_id_unique").on(table.id, table.userId),
    check(
      "list_categories_context_check",
      sql`${table.context} is null or ${table.context} in ('groceries','movies','books')`,
    ),
  ],
).enableRLS();

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.categoryId, table.userId],
      foreignColumns: [listCategories.id, listCategories.userId],
      name: "list_items_category_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// --- To-do (flat list — no points) ---

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  // Set when an open to-do was moved into the Inbox (Phase 4); moved ones are hidden, never deleted.
  movedAt: timestamp("moved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

// --- Year in review (books read, concerts, trips, etc. — no points) ---

export const yearReviewCategories = pgTable(
  "year_review_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("year_review_categories_id_user_id_unique").on(table.id, table.userId)],
).enableRLS();

export const yearReviewItems = pgTable(
  "year_review_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    text: text("text").notNull(),
    // Precision varies per entry: year is always known; month and the exact
    // day are filled in only as far as the entry's real precision goes
    // (year-only, month+year, or a full date).
    year: integer("year").notNull(),
    month: integer("month"),
    date: date("date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("year_review_items_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.categoryId, table.userId],
      foreignColumns: [yearReviewCategories.id, yearReviewCategories.userId],
      name: "year_review_items_category_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// People you can tag on a year-in-review item (e.g. who you ate with).
// Reused across items so the same person doesn't get re-created each time.
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("people_id_user_id_unique").on(table.id, table.userId),
    unique("people_user_id_name_unique").on(table.userId, table.name),
  ],
).enableRLS();

export const yearReviewItemPeople = pgTable(
  "year_review_item_people",
  {
    itemId: uuid("item_id").notNull(),
    personId: uuid("person_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.personId] }),
    foreignKey({
      columns: [table.itemId, table.userId],
      foreignColumns: [yearReviewItems.id, yearReviewItems.userId],
      name: "year_review_item_people_item_id_user_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.personId, table.userId],
      foreignColumns: [people.id, people.userId],
      name: "year_review_item_people_person_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// Places you can tag on a year-in-review item (e.g. what city).
// Reused across items so the same place doesn't get re-created each time.
export const places = pgTable(
  "places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("places_id_user_id_unique").on(table.id, table.userId),
    unique("places_user_id_name_unique").on(table.userId, table.name),
  ],
).enableRLS();

export const yearReviewItemPlaces = pgTable(
  "year_review_item_places",
  {
    itemId: uuid("item_id").notNull(),
    placeId: uuid("place_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.placeId] }),
    foreignKey({
      columns: [table.itemId, table.userId],
      foreignColumns: [yearReviewItems.id, yearReviewItems.userId],
      name: "year_review_item_places_item_id_user_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.placeId, table.userId],
      foreignColumns: [places.id, places.userId],
      name: "year_review_item_places_place_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// --- Workout tracker ---

// A saved, switchable workout structure (e.g. "A/B Split", "Body Part
// Split"). Exactly one is "active" per user at a time; enforced by
// application logic in setActiveProgram rather than a DB constraint, since
// this is a UX nicety rather than a tenant-isolation boundary.
export const workoutPrograms = pgTable(
  "workout_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("workout_programs_id_user_id_unique").on(table.id, table.userId)],
).enableRLS();

export const workoutDays = pgTable(
  "workout_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    programId: uuid("program_id").notNull(),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workout_days_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.programId, table.userId],
      foreignColumns: [workoutPrograms.id, workoutPrograms.userId],
      name: "workout_days_program_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    dayId: uuid("day_id").notNull(),
    name: text("name").notNull(),
    // Plank/Side Plank track a hold time instead of weight x reps.
    tracksDuration: boolean("tracks_duration").notNull().default(false),
    targetReps: integer("target_reps").notNull().default(12),
    weightIncrement: numeric("weight_increment", { precision: 6, scale: 2 })
      .notNull()
      .default("5"),
    // Which muscle group(s) this exercise targets (e.g. "Leg Press" ->
    // ["Quads"]). A Postgres text array rather than a join table — this is
    // just a tag list, not a relation anything else references.
    muscleGroups: text("muscle_groups")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    orderIndex: integer("order_index").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workout_exercises_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.dayId, table.userId],
      foreignColumns: [workoutDays.id, workoutDays.userId],
      name: "workout_exercises_day_id_user_id_fk",
    }).onDelete("cascade"),
    // Keep this literal list in sync with MUSCLE_GROUPS in src/lib/muscleGroups.ts.
    check(
      "workout_exercises_muscle_groups_check",
      sql`${table.muscleGroups} <@ ARRAY['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Core','Glutes','Quads','Hamstrings','Calves']::text[]`,
    ),
  ],
).enableRLS();

// One row per workout performed on a given day of the split.
export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    dayId: uuid("day_id").notNull(),
    date: date("date").notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("workout_sessions_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.dayId, table.userId],
      foreignColumns: [workoutDays.id, workoutDays.userId],
      name: "workout_sessions_day_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    exerciseId: uuid("exercise_id").notNull(),
    setNumber: integer("set_number").notNull(),
    weight: numeric("weight", { precision: 6, scale: 2 }),
    reps: integer("reps"),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.sessionId, table.userId],
      foreignColumns: [workoutSessions.id, workoutSessions.userId],
      name: "workout_sets_session_id_user_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.exerciseId, table.userId],
      foreignColumns: [workoutExercises.id, workoutExercises.userId],
      name: "workout_sets_exercise_id_user_id_fk",
    }).onDelete("cascade"),
  ],
).enableRLS();

// --- Per-user module visibility (which nav tabs a user has chosen to show) ---

// One row per user; no child table ever references this row, so the
// owner's id is the primary key directly (same pattern as
// savingsDetails/debtDetails) rather than a separate id + composite unique.
export const moduleSettings = pgTable("module_settings", {
  userId: uuid("user_id").primaryKey(),
  showPoints: boolean("show_points").notNull().default(true),
  showCleaning: boolean("show_cleaning").notNull().default(true),
  showExercise: boolean("show_exercise").notNull().default(true),
  showFinance: boolean("show_finance").notNull().default(true),
  showLists: boolean("show_lists").notNull().default(true),
  showTodo: boolean("show_todo").notNull().default(true),
  showYearReview: boolean("show_year_review").notNull().default(true),
  showEmotionCheckin: boolean("show_emotion_check_in").notNull().default(true),
  showNews: boolean("show_news").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS();

// --- Emotion check-in (repeatable, multiple-times-a-day mood log) ---

export const emotionEntries = pgTable(
  "emotion_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    date: date("date").notNull().defaultNow(),
    moment: text("moment").notNull(),
    category: text("category").notNull(),
    word: text("word").notNull(),
    zone: text("zone").notNull(),
    mode: text("mode").notNull(),
    // Snapshotted so editing the task's point value later doesn't rewrite
    // history — same reasoning as habitCompletions.pointsAwarded.
    pointsAwarded: integer("points_awarded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "emotion_entries_category_check",
      sql`${table.category} in ('mad','sad','glad','scared','surprised','disgusted')`,
    ),
    check(
      "emotion_entries_zone_check",
      sql`${table.zone} in ('chest','throat','stomach','jaw','none')`,
    ),
    check("emotion_entries_mode_check", sql`${table.mode} in ('quiet','stuck','big')`),
  ],
).enableRLS();

// --- Paycheck & debt payoff plan (a recurring, per-pay-period checklist on
// the Finance page — connects to the real accounts/goals above) ---

// One row per user; no child table ever references this row, so the
// owner's id is the primary key directly (same pattern as moduleSettings).
export const paycheckPlan = pgTable(
  "paycheck_plan",
  {
    userId: uuid("user_id").primaryKey(),
    plannedAmount: numeric("planned_amount", { precision: 10, scale: 2 }).notNull(),
    actualAmount: numeric("actual_amount", { precision: 10, scale: 2 }).notNull(),
    payDay1: integer("pay_day_1").notNull(),
    payDay2: integer("pay_day_2").notNull(),
    billsTransferAmount: numeric("bills_transfer_amount", { precision: 10, scale: 2 }).notNull(),
    hysaTransferAmount: numeric("hysa_transfer_amount", { precision: 10, scale: 2 }).notNull(),
    // Nullable: links this plan's HYSA row to a real savings account so its
    // live balance/progress can be shown alongside the plan.
    hysaAccountId: uuid("hysa_account_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("paycheck_plan_pay_day_1_check", sql`${table.payDay1} between 1 and 31`),
    check("paycheck_plan_pay_day_2_check", sql`${table.payDay2} between 1 and 31`),
    foreignKey({
      columns: [table.hysaAccountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "paycheck_plan_hysa_account_id_user_id_fk",
    }),
  ],
).enableRLS();

export const billsLineItems = pgTable(
  "bills_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    monthlyAmount: numeric("monthly_amount", { precision: 10, scale: 2 }).notNull(),
    // Nullable: links a bill to a real debt account (e.g. Chase Sapphire) so
    // its live balance/APR/payoff date can be shown next to the bill row.
    accountId: uuid("account_id"),
    // Nullable day-of-month this bill is due (not a specific calendar date —
    // bills recur monthly, so a fixed day avoids re-entering a date every
    // cycle, matching paycheckPlan.payDay1/2's same convention).
    dueDay: integer("due_day"),
    orderIndex: integer("order_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
      name: "bills_line_items_account_id_user_id_fk",
    }),
    check("bills_line_items_due_day_check", sql`${table.dueDay} is null or ${table.dueDay} between 1 and 31`),
  ],
).enableRLS();

// A checked box for one item ("bills_transfer", "hysa_transfer", or
// "bill_<billsLineItems.id>") for one pay period. Checked state is derived
// per-period from row existence rather than a boolean column, so a new pay
// period naturally starts unchecked with no reset job needed.
export const paycheckChecklistChecks = pgTable(
  "paycheck_checklist_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    itemKey: text("item_key").notNull(),
    periodKey: text("period_key").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("paycheck_checklist_checks_user_item_period_unique").on(
      table.userId,
      table.itemKey,
      table.periodKey,
    ),
  ],
).enableRLS();

// --- Weekly tasks (a checklist on the Points page that resets every week) ---

export const weeklyTasks = pgTable(
  "weekly_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id"),
    name: text("name").notNull(),
    points: integer("points").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("weekly_tasks_id_user_id_unique").on(table.id, table.userId),
    foreignKey({
      columns: [table.categoryId, table.userId],
      foreignColumns: [habitCategories.id, habitCategories.userId],
      name: "weekly_tasks_category_id_user_id_fk",
    }).onDelete("set null"),
  ],
).enableRLS();

// One completion per task per week — checked state is derived from row
// existence for the current weekKey (see weekKeyIn in
// src/lib/timezone.ts), same trick as paycheckChecklistChecks, so a new
// week naturally starts unchecked with no reset job. date is the actual
// day it was checked (for the Points page's today/yesterday stats and
// chart), separate from weekKey (which week it counts toward).
export const weeklyTaskCompletions = pgTable(
  "weekly_task_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    taskId: uuid("task_id").notNull(),
    weekKey: text("week_key").notNull(),
    date: date("date").notNull().defaultNow(),
    // Snapshotted so editing a task's point value later doesn't rewrite
    // history — same reasoning as habitCompletions.pointsAwarded.
    pointsAwarded: integer("points_awarded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.taskId, table.userId],
      foreignColumns: [weeklyTasks.id, weeklyTasks.userId],
      name: "weekly_task_completions_task_id_user_id_fk",
    }).onDelete("cascade"),
    unique("weekly_task_completions_user_task_week_unique").on(
      table.userId,
      table.taskId,
      table.weekKey,
    ),
  ],
).enableRLS();

// --- News: daily brief ---

// A story counts as "seen" for 24h after the brief serves it or the user
// opens/plays it in the app (never just from appearing in the feed). Keyed
// by a hash of the story URL; one row per user per story, refreshed in
// place when it's seen again.
export const briefSeen = pgTable(
  "brief_seen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    storyId: text("story_id").notNull(),
    title: text("title").notNull(),
    section: text("section").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("brief_seen_user_id_story_id_unique").on(table.userId, table.storyId),
    check("brief_seen_section_check", sql`${table.section} in ('national','chicago','tech')`),
  ],
).enableRLS();

// The secret behind a user's personal ?token= brief link (for the iOS
// Shortcut, which has no login session). Only a SHA-256 hash is stored, so
// the link itself is shown once at generation and can't be read back out of
// the database. One row per user — regenerating replaces it.
export const briefTokens = pgTable("brief_tokens", {
  userId: uuid("user_id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// --- Per-user settings for the central hub (time zone, day structure,
// calendar, brief city, notification preferences, feature switches) ---

// One row per user, created lazily on first save — no row means defaults.
// Distinct from module_settings, which only controls which nav tabs show.
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id").primaryKey(),
    // IANA zone name; every "what day is it" calculation uses this.
    timezone: text("timezone").notNull().default("America/Chicago"),
    // Block boundaries as minutes after local midnight. Transition begins
    // when work ends; Evening and Shutdown have their own start times.
    launchStartMinutes: integer("launch_start_minutes").notNull().default(300), // 5:00
    workStartMinutes: integer("work_start_minutes").notNull().default(480), // 8:00
    workEndMinutes: integer("work_end_minutes").notNull().default(960), // 4:00 pm
    eveningStartMinutes: integer("evening_start_minutes").notNull().default(1020), // 5:00 pm
    shutdownStartMinutes: integer("shutdown_start_minutes").notNull().default(1200), // 8:00 pm
    // The user's iCloud public calendar link, AES-256-GCM encrypted — the
    // server must be able to read it back to fetch the feed, so it can't be
    // hashed, and it is never sent to the browser. The hint is a short,
    // non-secret fragment for "link saved" UI.
    calendarUrlEncrypted: text("calendar_url_encrypted"),
    calendarUrlHint: text("calendar_url_hint"),
    briefCity: text("brief_city").notNull().default("Chicago"),
    // What the dashboard greeting calls the user; blank means no name.
    displayName: text("display_name"),
    // { lunchCard, shutdownNudge, sundayReset, urgentFlags } — stored now,
    // acted on once notifications ship.
    notificationPrefs: jsonb("notification_prefs")
      .notNull()
      .default(sql`'{"lunchCard":true,"shutdownNudge":true,"sundayReset":true,"urgentFlags":true}'::jsonb`),
    // Feature switches keyed by id (see src/lib/features.ts). A missing key
    // means off — new features are opt-in for everyone.
    features: jsonb("features").notNull().default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "user_settings_block_order_check",
      sql`${table.launchStartMinutes} < ${table.workStartMinutes} and ${table.workStartMinutes} < ${table.workEndMinutes} and ${table.workEndMinutes} <= ${table.eveningStartMinutes} and ${table.eveningStartMinutes} < ${table.shutdownStartMinutes} and ${table.shutdownStartMinutes} < 1440 and ${table.launchStartMinutes} >= 0`,
    ),
  ],
).enableRLS();

// A user's calendar feeds (iCloud public links, Google "secret address in
// iCal format"). Several per user — the app merges their events. The link is
// AES-256-GCM encrypted: the server has to read it back to fetch the feed,
// and it is never sent to the browser. The hint is a short non-secret
// fragment for the "link saved" UI. This replaces the single link that used
// to live on user_settings (those columns are left in place, now unused).
export const calendarLinks = pgTable(
  "calendar_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(), // "icloud" | "google"
    label: text("label").notNull(),
    urlEncrypted: text("url_encrypted").notNull(),
    hint: text("hint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("calendar_links_provider_check", sql`${table.provider} in ('icloud', 'google')`)],
).enableRLS();

// --- Daily Spark (dashboard) ---

// One row per user per day: which spark they were shown. Written the first
// time the day's spark is picked, so the pick is stable all day and the
// no-repeat-within-a-year rule has a history to check. spark_id points into
// src/data/sparks.json.
export const sparkDays = pgTable(
  "spark_days",
  {
    userId: uuid("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD in the user's time zone
    sparkId: text("spark_id").notNull(),
    type: text("type").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
).enableRLS();

// The user's Sparks collection (the "Save" tap).
export const savedSparks = pgTable(
  "saved_sparks",
  {
    userId: uuid("user_id").notNull(),
    sparkId: text("spark_id").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.sparkId] })],
).enableRLS();

// --- Time blocks & planning (Phase 3) ---

// The small task list behind the evening buckets, tomorrow's plan and Someday.
// Deliberately minimal: Phase 4 (Tasks & lists) builds the Inbox flow and
// Action-vs-Collection on top of this table. Habits, cleaning, weekly tasks and
// workouts keep living in their own tables.
export const planTasks = pgTable(
  "plan_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    // The normal ("high-energy") version of the task.
    title: text("title").notNull(),
    // An easier version shown when the user checks in as low energy.
    lowTitle: text("low_title"),
    bucket: text("bucket").notNull().default("inbox"), // learning | body | home | inbox
    minutes: integer("minutes"),
    // Phase 4: an action has a verb, a size, an energy tag, an area (bucket) and a block.
    verb: text("verb"),
    energy: text("energy"), // high | low | null (any)
    block: text("block"), // launch | work | transition | evening | shutdown | null (any)
    // The first step, spelled out, shown on the card under the 5-minute Start.
    firstStep: text("first_step"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    // "Not this one" swaps: how often, and the last local day it happened.
    skipCount: integer("skip_count").notNull().default(0),
    skippedDate: text("skipped_date"),
    // Set when this task was copied over from the old To-do list (so a re-run never duplicates).
    sourceTodoId: uuid("source_todo_id"),
    status: text("status").notNull().default("open"), // open | done | someday
    // Local day (YYYY-MM-DD) this task is planned for; null = not planned.
    plannedFor: text("planned_for"),
    // The one task that leads that day's Launch block.
    isPriority: boolean("is_priority").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    // Local day it was finished on, so "finished today" needs no time-zone math.
    doneDate: text("done_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("plan_tasks_bucket_check", sql`${table.bucket} in ('learning','body','home','inbox')`),
    check("plan_tasks_status_check", sql`${table.status} in ('open','done','someday')`),
    check("plan_tasks_energy_check", sql`${table.energy} is null or ${table.energy} in ('high','low')`),
    check(
      "plan_tasks_block_check",
      sql`${table.block} is null or ${table.block} in ('launch','work','transition','evening','shutdown')`,
    ),
    unique("plan_tasks_user_source_todo_unique").on(table.userId, table.sourceTodoId),
    check("plan_tasks_minutes_check", sql`${table.minutes} is null or (${table.minutes} between 1 and 600)`),
  ],
).enableRLS();

// The Transition block's one-tap check-in (point-neutral) and its 20-minute rest.
export const energyCheckins = pgTable(
  "energy_checkins",
  {
    userId: uuid("user_id").notNull(),
    date: text("date").notNull(),
    level: text("level").notNull(), // high | low
    restStartedAt: timestamp("rest_started_at", { withTimezone: true }),
    restDone: boolean("rest_done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    check("energy_checkins_level_check", sql`${table.level} in ('high','low')`),
  ],
).enableRLS();

// "Out tonight" for a day: written automatically when an evening calendar
// event exists, or by the user's own tap (which always wins over auto).
// A day marked out protects the streak.
export const dayFlags = pgTable(
  "day_flags",
  {
    userId: uuid("user_id").notNull(),
    date: text("date").notNull(),
    outTonight: boolean("out_tonight").notNull(),
    source: text("source").notNull(), // auto | manual
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date] }),
    check("day_flags_source_check", sql`${table.source} in ('auto','manual')`),
  ],
).enableRLS();

// The Shutdown "log the day" (and the out-tonight quick log): one line per day.
export const dayLogs = pgTable(
  "day_logs",
  {
    userId: uuid("user_id").notNull(),
    date: text("date").notNull(),
    note: text("note").notNull().default(""),
    finishedCount: integer("finished_count").notNull().default(0),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
).enableRLS();
