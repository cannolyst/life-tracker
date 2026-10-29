import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { listCategories, listItems, people, recurringItems, subscriptions } from "./schema";
import type { CalendarEvent } from "@/lib/calendarParse";
import {
  mentionsPerson,
  nextBirthday,
  recurringStatus,
  seeNudgeDue,
  subscriptionStatus,
  turningAge,
  type Cycle,
  type RecurringStatus,
  type SubscriptionStatus,
} from "@/lib/lifeAdmin";
import { dateKeyIn } from "@/lib/timezone";

export type RecurringRow = {
  id: string;
  name: string;
  intervalDays: number;
  lastDone: string | null;
  skippedDate: string | null;
  status: RecurringStatus;
};

export type SubscriptionRow = {
  id: string;
  name: string;
  amount: number;
  cycle: Cycle;
  autopay: boolean;
  trialEnds: string | null;
  status: SubscriptionStatus;
};

export type PersonRow = {
  id: string;
  name: string;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  seeEveryWeeks: number | null;
  lastSeen: string | null;
  giftListId: string | null;
  giftIdeas: number;
  birthday: { dateKey: string; daysUntil: number; turning: number | null } | null;
  nudge: { weeksSince: number } | null;
};

export type LifeAdmin = {
  recurring: RecurringRow[];
  subscriptions: SubscriptionRow[];
  people: PersonRow[];
};

/** Everything on the Life admin page and the dashboard's life admin lines, with today's meaning worked out. */
export async function getLifeAdmin(userId: string, tz: string, todayKey: string): Promise<LifeAdmin> {
  const [recurringRows, subRows, peopleRows] = await Promise.all([
    db
      .select()
      .from(recurringItems)
      .where(and(eq(recurringItems.userId, userId), eq(recurringItems.archived, false)))
      .orderBy(asc(recurringItems.createdAt)),
    db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.archived, false)))
      .orderBy(asc(subscriptions.createdAt)),
    db.select().from(people).where(eq(people.userId, userId)).orderBy(asc(people.name)),
  ]);

  const giftListIds = peopleRows.map((p) => p.giftListId).filter((id): id is string => id !== null);
  const giftCounts =
    giftListIds.length > 0
      ? await db
          .select({ categoryId: listItems.categoryId, n: count() })
          .from(listItems)
          .where(and(eq(listItems.userId, userId), inArray(listItems.categoryId, giftListIds), eq(listItems.done, false)))
          .groupBy(listItems.categoryId)
      : [];
  const giftByList = new Map(giftCounts.map((g) => [g.categoryId, Number(g.n)]));

  const recurring = recurringRows
    .map((r) => ({
      id: r.id,
      name: r.name,
      intervalDays: r.intervalDays,
      lastDone: r.lastDone,
      skippedDate: r.skippedDate,
      status: recurringStatus(
        { lastDone: r.lastDone, intervalDays: r.intervalDays, createdKey: dateKeyIn(tz, r.createdAt) },
        todayKey,
      ),
    }))
    .sort((a, b) => a.status.daysUntil - b.status.daysUntil);

  const subs = subRows
    .map((s) => ({
      id: s.id,
      name: s.name,
      amount: Number(s.amount),
      cycle: s.cycle as Cycle,
      autopay: s.autopay,
      trialEnds: s.trialEnds,
      status: subscriptionStatus({ nextCharge: s.nextCharge, cycle: s.cycle as Cycle, trialEnds: s.trialEnds }, todayKey),
    }))
    .sort((a, b) => a.status.daysUntil - b.status.daysUntil);

  const peopleOut: PersonRow[] = peopleRows.map((p) => {
    const next = p.birthMonth && p.birthDay ? nextBirthday(p.birthMonth, p.birthDay, todayKey) : null;
    return {
      id: p.id,
      name: p.name,
      birthMonth: p.birthMonth,
      birthDay: p.birthDay,
      birthYear: p.birthYear,
      seeEveryWeeks: p.seeEveryWeeks,
      lastSeen: p.lastSeen,
      giftListId: p.giftListId,
      giftIdeas: p.giftListId ? (giftByList.get(p.giftListId) ?? 0) : 0,
      birthday: next ? { ...next, turning: turningAge(p.birthYear, next.dateKey) } : null,
      nudge: seeNudgeDue(
        { seeEveryWeeks: p.seeEveryWeeks, lastSeen: p.lastSeen, createdKey: dateKeyIn(tz, p.createdAt) },
        todayKey,
      ),
    };
  });

  return { recurring, subscriptions: subs, people: peopleOut };
}

/**
 * "See them every X weeks" resets itself: when a calendar event that has
 * already started mentions someone, they count as seen that day. Only moves
 * the date forward, and only for people who have a cadence set.
 */
export async function syncSeenFromCalendar(
  userId: string,
  events: CalendarEvent[],
  tz: string,
  rows: PersonRow[],
  nowMs: number,
): Promise<Map<string, string>> {
  const updated = new Map<string, string>();
  const names = rows.map((p) => p.name);
  for (const person of rows) {
    if (!person.seeEveryWeeks) continue;
    let latest: string | null = null;
    for (const event of events) {
      if (new Date(event.start).getTime() > nowMs) continue;
      if (!mentionsPerson(event.title, person.name, names)) continue;
      const day = dateKeyIn(tz, new Date(event.start));
      if (latest === null || day > latest) latest = day;
    }
    if (latest && (person.lastSeen === null || latest > person.lastSeen)) {
      await db
        .update(people)
        .set({ lastSeen: latest })
        .where(and(eq(people.id, person.id), eq(people.userId, userId)));
      updated.set(person.id, latest);
    }
  }
  return updated;
}

/** The user's lists, for the gift-idea collection check. */
export async function getListName(userId: string, listId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: listCategories.name })
    .from(listCategories)
    .where(and(eq(listCategories.id, listId), eq(listCategories.userId, userId)));
  return row?.name ?? null;
}
