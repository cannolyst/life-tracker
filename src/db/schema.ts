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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
  (table) => [check("accounts_type_check", sql`${table.type} in ('savings','debt')`)],
);

export const savingsDetails = pgTable("savings_details", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  dailyGoal: numeric("daily_goal", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
});

export const debtDetails = pgTable(
  "debt_details",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
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
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
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
  ],
);

export const debtStatements = pgTable("debt_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  statementDate: date("statement_date").notNull(),
  minimumPaymentDue: numeric("minimum_payment_due", {
    precision: 12,
    scale: 2,
  }).notNull(),
  interestCharged: numeric("interest_charged", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  statementBalance: numeric("statement_balance", { precision: 12, scale: 2 }),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Points / habit tracker ---
// Ported from tracker-app's goals/tasks/completions/rewards. Named
// "habit_*" to avoid colliding with the finance `goals` table above.

export const habitCategories = pgTable("habit_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const habitTasks = pgTable("habit_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => habitCategories.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  points: integer("points").notNull(),
  // Repeatable tasks (e.g. "drink 8oz of water") can be logged more than
  // once per day; non-repeatable tasks are a once-a-day checkbox.
  repeatable: boolean("repeatable").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const habitCompletions = pgTable("habit_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => habitTasks.id, { onDelete: "cascade" }),
  date: date("date").notNull().defaultNow(),
  // Snapshotted so editing a task's point value later doesn't rewrite history.
  pointsAwarded: integer("points_awarded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cost: integer("cost").notNull(),
  priceUsd: numeric("price_usd", { precision: 12, scale: 2 }),
  link: text("link"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const redemptions = pgTable("redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  rewardId: uuid("reward_id").references(() => rewards.id, {
    onDelete: "set null",
  }),
  // Snapshotted so a deleted reward keeps its redemption history intact.
  rewardName: text("reward_name").notNull(),
  pointsCost: integer("points_cost").notNull(),
  date: date("date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Cleaning tracker ---

export const cleaningAreas = pgTable("cleaning_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cleaningTasks = pgTable("cleaning_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id").references(() => cleaningAreas.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  frequencyDays: integer("frequency_days").notNull(),
  points: integer("points").notNull(),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cleaningCompletions = pgTable("cleaning_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => cleaningTasks.id, { onDelete: "cascade" }),
  date: date("date").notNull().defaultNow(),
  pointsAwarded: integer("points_awarded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Lists (books to read, movies to watch, etc. — no points) ---

export const listCategories = pgTable("list_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listItems = pgTable("list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => listCategories.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- To-do (flat list — no points) ---

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Year in review (books read, concerts, trips, etc. — no points) ---

export const yearReviewCategories = pgTable("year_review_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const yearReviewItems = pgTable("year_review_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => yearReviewCategories.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  date: date("date").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// People you can tag on a year-in-review item (e.g. who you ate with).
// Reused across items so the same person doesn't get re-created each time.
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const yearReviewItemPeople = pgTable(
  "year_review_item_people",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => yearReviewItems.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.personId] })],
);
