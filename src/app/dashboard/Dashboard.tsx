import Link from "next/link";
import { Suspense } from "react";
import { getModuleSettings } from "@/db/queries";
import { getUserSettings } from "@/db/userSettings";
import { getSeenStoryIds } from "@/db/brief";
import { getBriefPlayedToday, getDayAgenda, type DayAgenda } from "@/db/dashboard";
import { getTodaysSpark } from "@/db/sparks";
import { getCalendarEvents, type CalendarResult } from "@/lib/calendarService";
import { fetchAllStories } from "@/lib/news";
import { buildBrief, formatBriefDate } from "@/lib/brief";
import { isFeatureOn } from "@/lib/features";
import { dateKeyIn, minutesIntoDayIn } from "@/lib/timezone";
import {
  buildComingUp,
  buildFlags,
  buildGreeting,
  buildNowCard,
  buildTimeline,
  eventOnDay,
  greetingHighlights,
  onDeckCount,
  weekdayLong,
  type Timeline,
} from "@/lib/dashboard";
import type { CalendarEvent } from "@/lib/calendarParse";
import type { Section } from "@/lib/newsTypes";
import type { DayStructure } from "@/lib/userSettingsDefaults";
import { Nav } from "@/components/Nav";
import { SparkCard } from "./SparkCard";
import { DashboardBrief } from "./DashboardBrief";

const COMING_UP_DAYS = 4;

function eventsOf(result: CalendarResult | null): CalendarEvent[] {
  return result && result.status === "ok" ? result.events : [];
}

export async function Dashboard({ userId }: { userId: string }) {
  const [settings, modules] = await Promise.all([getUserSettings(userId), getModuleSettings(userId)]);
  const tz = settings.timezone;
  const now = new Date();
  const nowMinutes = minutesIntoDayIn(tz, now);
  const todayKey = dateKeyIn(tz, now);
  const structure: DayStructure = settings;

  // Slow things (Apple/Google calendars, news feeds) start now but are only
  // awaited inside <Suspense>, so the page paints without waiting for them.
  const calendarPromise: Promise<CalendarResult | null> = isFeatureOn(settings.features, "calendar")
    ? getCalendarEvents(userId, { days: COMING_UP_DAYS + 1 })
    : Promise.resolve(null);

  const [agenda, todaysSpark] = await Promise.all([
    getDayAgenda(userId, tz, {
      points: modules.showPoints,
      cleaning: modules.showCleaning,
      exercise: modules.showExercise,
      finance: modules.showFinance,
    }),
    getTodaysSpark(userId, todayKey),
  ]);

  const deck = onDeckCount({
    habitsLeft: agenda.habitsLeft,
    cleaningDue: agenda.cleaningDue,
    weeklyLeft: agenda.weeklyLeft,
  });
  const weekday = weekdayLong(todayKey);
  const greetingBase = {
    name: settings.displayName,
    minutes: nowMinutes,
    weekday,
  };

  const nowCard = buildNowCard({
    structure,
    minutes: nowMinutes,
    habit: agenda.habit,
    cleaning: agenda.cleaning,
    weekly: agenda.weekly,
    workout: agenda.workout,
    doneToday: agenda.doneToday,
  });

  const flags = buildFlags({
    streak: agenda.streak,
    habitDoneToday: agenda.habitDoneToday,
    minutes: nowMinutes,
    structure,
    bills: agenda.billsUnpaidDaysUntil,
  });

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pb-28 pt-6">
        <Suspense
          fallback={
            <Greeting
              text={buildGreeting({
                ...greetingBase,
                highlights: greetingHighlights({
                  workoutName: agenda.workout?.dayName ?? null,
                  todayEvents: [],
                  nowMinutes,
                  onDeckCount: deck,
                  tz,
                }),
              })}
            />
          }
        >
          <CalendarGreeting
            calendarPromise={calendarPromise}
            greetingBase={greetingBase}
            agenda={agenda}
            deck={deck}
            nowMinutes={nowMinutes}
            todayKey={todayKey}
            tz={tz}
          />
        </Suspense>

        {todaysSpark && <SparkCard spark={todaysSpark.spark} saved={todaysSpark.saved} />}

        <NowCardView card={nowCard} />

        {modules.showNews && (
          <Suspense fallback={<SectionShell title="Today’s Brief" note="Loading…" />}>
            <BriefSection
              userId={userId}
              tz={tz}
              city={settings.briefCity}
              defaultOpen={nowMinutes < settings.workStartMinutes}
            />
          </Suspense>
        )}

        <Suspense fallback={<SectionShell title="Today" note="Loading…" />}>
          <TodaySection
            calendarPromise={calendarPromise}
            structure={structure}
            nowMinutes={nowMinutes}
            todayKey={todayKey}
            tz={tz}
          />
        </Suspense>

        <Suspense fallback={null}>
          <ComingUpSection
            calendarPromise={calendarPromise}
            agenda={agenda}
            structure={structure}
            todayKey={todayKey}
            tz={tz}
          />
        </Suspense>

        {flags.length > 0 && (
          <section aria-label="Flags" className="space-y-1">
            <h2 className="px-1 text-xs font-medium text-neutral-500">Worth a look</h2>
            <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-900">
              {flags.map((flag) => (
                <li key={flag.key}>
                  <Link href={flag.href} className="flex min-h-11 items-center justify-between gap-3 px-5 py-2.5 text-sm text-neutral-300">
                    <span>{flag.text}</span>
                    <span aria-hidden className="text-neutral-600">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="px-1 pt-2 text-center text-xs text-neutral-600">
          <Link href="/overview" className="tap px-2 underline">
            Classic overview
          </Link>
        </p>
      </main>
    </div>
  );
}

function Greeting({ text }: { text: string }) {
  // A div, not an h1: the app styles every h1 in uppercase display type, which suits titles but not a sentence.
  return (
    <div role="heading" aria-level={1} className="px-1 text-xl font-semibold leading-snug">
      {text}
    </div>
  );
}

async function CalendarGreeting({
  calendarPromise,
  greetingBase,
  agenda,
  deck,
  nowMinutes,
  todayKey,
  tz,
}: {
  calendarPromise: Promise<CalendarResult | null>;
  greetingBase: { name: string | null; minutes: number; weekday: string };
  agenda: DayAgenda;
  deck: number;
  nowMinutes: number;
  todayKey: string;
  tz: string;
}) {
  const events = eventsOf(await calendarPromise);
  const todayEvents = events.filter((e) => eventOnDay(e, todayKey, tz));
  return (
    <Greeting
      text={buildGreeting({
        ...greetingBase,
        highlights: greetingHighlights({
          workoutName: agenda.workout?.dayName ?? null,
          todayEvents,
          nowMinutes,
          onDeckCount: deck,
          tz,
        }),
      })}
    />
  );
}

// The Now card is the one place on the page that carries the accent color.
function NowCardView({ card }: { card: ReturnType<typeof buildNowCard> }) {
  return (
    <section
      aria-label="Now"
      className="rounded-lg border border-accent px-5 py-5"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 9%, var(--color-neutral-900))" }}
    >
      <p className="text-xs font-medium text-accent">{card.eyebrow}</p>
      <p className="mt-1 text-xl font-semibold leading-snug text-neutral-100">{card.title}</p>
      {card.detail && <p className="mt-1 text-sm text-neutral-400">{card.detail}</p>}
      {card.href && (
        <Link
          href={card.href}
          className="tap mt-4 justify-center rounded-md bg-accent px-4 font-medium text-neutral-900"
        >
          {card.cta ?? "Open"}
        </Link>
      )}
    </section>
  );
}

function SectionShell({ title, note }: { title: string; note?: string }) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <p className="text-sm font-medium text-neutral-200">{title}</p>
      {note && <p className="mt-1 text-sm text-neutral-500">{note}</p>}
    </section>
  );
}

async function BriefSection({
  userId,
  tz,
  city,
  defaultOpen,
}: {
  userId: string;
  tz: string;
  city: string;
  defaultOpen: boolean;
}) {
  const [stories, seen, playedCount] = await Promise.all([
    fetchAllStories({ city }),
    getSeenStoryIds(userId),
    getBriefPlayedToday(userId, tz),
  ]);
  const sectionLabels: Record<Section, string> = { national: "National", chicago: city, tech: "Tech" };
  return (
    <DashboardBrief
      brief={buildBrief(stories, seen)}
      dateLabel={formatBriefDate(tz)}
      playedCount={playedCount}
      defaultOpen={defaultOpen}
      sectionLabels={sectionLabels}
    />
  );
}

function TimelineList({ timeline }: { timeline: Timeline }) {
  return (
    <div>
      {timeline.allDay.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {timeline.allDay.map((title) => (
            <span key={title} className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
              {title}
            </span>
          ))}
        </div>
      )}
      <ol className="space-y-0.5">
        {timeline.rows.map((row) => (
          <li
            key={row.key}
            aria-current={row.state === "now" && row.kind === "block" ? "time" : undefined}
            className={`flex gap-3 py-1.5 text-sm transition-opacity ${row.state === "past" ? "opacity-40" : ""}`}
          >
            <span className="w-36 shrink-0 whitespace-nowrap text-xs leading-5 text-neutral-500">{row.when}</span>
            {row.kind === "block" ? (
              <span className={row.state === "now" ? "font-medium text-neutral-100" : "text-neutral-400"}>
                {row.title}
                {row.state === "now" && <span className="ml-2 text-xs font-normal text-neutral-500">now</span>}
              </span>
            ) : (
              <span className="text-neutral-200">
                <span aria-hidden className="mr-1.5 text-neutral-600">
                  •
                </span>
                {row.title}
                {row.isEvening && <span className="ml-2 text-xs text-neutral-500">evening</span>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

async function TodaySection({
  calendarPromise,
  structure,
  nowMinutes,
  todayKey,
  tz,
}: {
  calendarPromise: Promise<CalendarResult | null>;
  structure: DayStructure;
  nowMinutes: number;
  todayKey: string;
  tz: string;
}) {
  const events = eventsOf(await calendarPromise);
  const timeline = buildTimeline({ structure, nowMinutes, todayKey, events, tz });
  return (
    <section aria-label="Today" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <h2 className="mb-2 text-sm font-medium text-neutral-200">Today</h2>
      <TimelineList timeline={timeline} />
    </section>
  );
}

async function ComingUpSection({
  calendarPromise,
  agenda,
  structure,
  todayKey,
  tz,
}: {
  calendarPromise: Promise<CalendarResult | null>;
  agenda: DayAgenda;
  structure: DayStructure;
  todayKey: string;
  tz: string;
}) {
  const days = buildComingUp({
    todayKey,
    days: COMING_UP_DAYS,
    structure,
    events: eventsOf(await calendarPromise),
    bills: agenda.billsUpcoming,
    cleaning: agenda.cleaningUpcoming,
    tz,
  });
  return (
    <section aria-label="Coming up" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <h2 className="mb-2 text-sm font-medium text-neutral-200">Coming up</h2>
      {days.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing on the horizon for the next few days.</p>
      ) : (
        <ul className="space-y-3">
          {days.map((day) => (
            <li key={day.dateKey}>
              <p className="text-xs font-medium text-neutral-500">{day.label}</p>
              <ul className="mt-1 space-y-1.5">
                {day.items.map((item, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-neutral-200">
                      {item.time && <span className="mr-2 text-xs text-neutral-500">{item.time}</span>}
                      {item.title}
                    </span>
                    {item.prep && <span className="block text-xs text-neutral-500">{item.prep}</span>}
                  </li>
                ))}
                {day.more > 0 && <li className="text-xs text-neutral-500">and {day.more} more</li>}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
