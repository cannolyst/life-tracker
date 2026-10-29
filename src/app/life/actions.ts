"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listCategories, listItems, people, recurringItems, subscriptions } from "@/db/schema";
import { getUserSettings } from "@/db/userSettings";
import { requireUserId } from "@/lib/session";
import { dateKeyIn } from "@/lib/timezone";
import { intervalToDays, type IntervalUnit } from "@/lib/lifeAdmin";

export type LifeResult = { ok: true; note?: string } | { ok: false; error: string };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/life");
  revalidatePath("/");
  revalidatePath("/reset");
}

async function context() {
  const userId = await requireUserId();
  const { timezone } = await getUserSettings(userId);
  return { userId, todayKey: dateKeyIn(timezone) };
}

function validDate(value: string | null | undefined): value is string {
  if (!value || !DATE_KEY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/* ---------- recurring ---------- */

export async function addRecurring(input: {
  name: string;
  count: number;
  unit: string;
  lastDone: string | null;
}): Promise<LifeResult> {
  const name = input.name.trim().slice(0, 100);
  if (!name) return { ok: false, error: "Give it a name." };
  if (!Number.isFinite(input.count) || input.count < 1) return { ok: false, error: "How often does it come around?" };
  if (!["days", "weeks", "months", "years"].includes(input.unit)) return { ok: false, error: "Pick days, weeks, months or years." };
  const lastDone = input.lastDone && validDate(input.lastDone) ? input.lastDone : null;

  const { userId } = await context();
  await db.insert(recurringItems).values({
    userId,
    name,
    intervalDays: intervalToDays(input.count, input.unit as IntervalUnit),
    lastDone,
  });
  refresh();
  return { ok: true };
}

/** Done resets the clock: the next one is due a full interval from today. */
export async function markRecurringDone(id: string): Promise<LifeResult> {
  const { userId, todayKey } = await context();
  await db
    .update(recurringItems)
    .set({ lastDone: todayKey, skippedDate: null })
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)));
  refresh();
  return { ok: true };
}

/** "Not tonight": the evening card steps aside until tomorrow. */
export async function skipRecurringTonight(id: string): Promise<LifeResult> {
  const { userId, todayKey } = await context();
  await db
    .update(recurringItems)
    .set({ skippedDate: todayKey })
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)));
  refresh();
  return { ok: true };
}

export async function archiveRecurring(id: string): Promise<LifeResult> {
  const { userId } = await context();
  await db
    .update(recurringItems)
    .set({ archived: true })
    .where(and(eq(recurringItems.id, id), eq(recurringItems.userId, userId)));
  refresh();
  return { ok: true };
}

/* ---------- subscriptions and trials ---------- */

export async function addSubscription(input: {
  name: string;
  amount: number;
  cycle: string;
  nextCharge: string;
  autopay: boolean;
  isTrial: boolean;
}): Promise<LifeResult> {
  const name = input.name.trim().slice(0, 100);
  if (!name) return { ok: false, error: "Give it a name." };
  if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 100000) {
    return { ok: false, error: "Enter what it costs." };
  }
  if (input.cycle !== "monthly" && input.cycle !== "yearly") return { ok: false, error: "Monthly or yearly?" };
  if (!validDate(input.nextCharge)) {
    return { ok: false, error: input.isTrial ? "When does the free trial end?" : "When is the next charge?" };
  }

  const { userId } = await context();
  await db.insert(subscriptions).values({
    userId,
    name,
    amount: input.amount.toFixed(2),
    cycle: input.cycle,
    nextCharge: input.nextCharge,
    autopay: input.autopay,
    trialEnds: input.isTrial ? input.nextCharge : null,
  });
  refresh();
  return { ok: true };
}

export async function toggleSubscriptionAutopay(id: string): Promise<LifeResult> {
  const { userId } = await context();
  await db
    .update(subscriptions)
    .set({ autopay: sql`not ${subscriptions.autopay}` })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  refresh();
  return { ok: true };
}

/** Cancelling a subscription takes it off the list (kept in the database, not shown). */
export async function archiveSubscription(id: string): Promise<LifeResult> {
  const { userId } = await context();
  await db
    .update(subscriptions)
    .set({ archived: true })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  refresh();
  return { ok: true };
}

/* ---------- people ---------- */

export async function addPerson(name: string): Promise<LifeResult> {
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Enter a name." };
  const { userId } = await context();
  await db.insert(people).values({ userId, name: clean }).onConflictDoNothing();
  refresh();
  return { ok: true };
}

export async function savePersonDetails(
  id: string,
  input: { birthMonth: number | null; birthDay: number | null; birthYear: number | null; seeEveryWeeks: number | null },
): Promise<LifeResult> {
  const hasBirthday = input.birthMonth !== null || input.birthDay !== null;
  if (hasBirthday) {
    const { birthMonth: m, birthDay: d } = input;
    if (!m || !d || !Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > 12 || d < 1 || d > 31) {
      return { ok: false, error: "Enter a month (1–12) and day (1–31) for the birthday." };
    }
  }
  const year = input.birthYear;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    return { ok: false, error: "That birth year doesn't look right." };
  }
  const weeks = input.seeEveryWeeks;
  if (weeks !== null && (!Number.isInteger(weeks) || weeks < 1 || weeks > 104)) {
    return { ok: false, error: "See them every 1–104 weeks." };
  }

  const { userId } = await context();
  await db
    .update(people)
    .set({
      birthMonth: hasBirthday ? input.birthMonth : null,
      birthDay: hasBirthday ? input.birthDay : null,
      birthYear: hasBirthday ? year : null,
      seeEveryWeeks: weeks,
    })
    .where(and(eq(people.id, id), eq(people.userId, userId)));
  refresh();
  return { ok: true };
}

/** "I saw them" by hand — the calendar does this automatically when an event mentions their name. */
export async function markPersonSeen(id: string): Promise<LifeResult> {
  const { userId, todayKey } = await context();
  await db
    .update(people)
    .set({ lastSeen: todayKey })
    .where(and(eq(people.id, id), eq(people.userId, userId)));
  refresh();
  return { ok: true };
}

/** Gives a person their own gift-ideas collection (a list), created on request. */
export async function createGiftList(personId: string): Promise<LifeResult> {
  const { userId } = await context();
  const [person] = await db
    .select({ name: people.name, giftListId: people.giftListId })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)));
  if (!person) return { ok: false, error: "Couldn't find that person." };
  if (person.giftListId) return { ok: true };

  const [last] = await db
    .select({ order: listCategories.orderIndex })
    .from(listCategories)
    .where(eq(listCategories.userId, userId))
    .orderBy(sql`${listCategories.orderIndex} desc`)
    .limit(1);
  const [list] = await db
    .insert(listCategories)
    .values({ userId, name: `Gift ideas for ${person.name}`, orderIndex: (last?.order ?? 0) + 1 })
    .returning({ id: listCategories.id });
  await db
    .update(people)
    .set({ giftListId: list.id })
    .where(and(eq(people.id, personId), eq(people.userId, userId)));
  revalidatePath("/lists");
  refresh();
  return { ok: true };
}

export async function addGiftIdea(personId: string, text: string): Promise<LifeResult> {
  const idea = text.trim().slice(0, 200);
  if (!idea) return { ok: false, error: "Type an idea first." };
  const { userId } = await context();
  const [person] = await db
    .select({ giftListId: people.giftListId })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)));
  if (!person?.giftListId) return { ok: false, error: "Start their gift-ideas list first." };
  await db.insert(listItems).values({ userId, categoryId: person.giftListId, text: idea });
  revalidatePath("/lists");
  refresh();
  return { ok: true };
}
