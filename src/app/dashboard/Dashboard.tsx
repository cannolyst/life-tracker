import Link from "next/link";
import { Suspense } from "react";
import { getModuleSettings } from "@/db/queries";
import { getUserSettings } from "@/db/userSettings";
import { getSeenStoryIds } from "@/db/brief";
import { getBriefPlayedToday, getDayAgenda, type DayAgenda } from "@/db/dashboard";
import {
  getDayFlag,
  getDayLog,
  getEnergyToday,
  getCollectionChoices,
  getContextItems,
  getFinishedCount,
  getPlanTasks,
  recordAutoOutTonight,
  type PlanTask,
} from "@/db/planning";
import { getResetState } from "@/db/reset";
import { getEntry, getOnThisDay, entryIsOpen } from "@/db/journal";
import { JournalPanel } from "../journal/JournalPanel";
import { OnThisDayCard } from "../journal/OnThisDayCard";
import { getLifeAdmin, syncSeenFromCalendar, type LifeAdmin } from "@/db/lifeAdmin";
import { getGoals, type GoalView } from "@/db/goals";
import { describeInterval, dueLabel, MANUAL_CHARGE_FLAG_DAYS, BIRTHDAY_COMING_UP_DAYS } from "@/lib/lifeAdmin";
import { RESET_POINTS, isSunday, resetWeekKey } from "@/lib/reset";
import { getTodaysSpark } from "@/db/sparks";
import { getCalendarEvents, type CalendarResult } from "@/lib/calendarService";
import { fetchAllStories } from "@/lib/news";
import { buildBrief, formatBriefDate } from "@/lib/brief";
import { isFeatureOn } from "@/lib/features";
import { dateKeyIn, minutesIntoDayIn } from "@/lib/timezone";
import { currentBlock } from "@/lib/dayBlocks";
import {
  BUCKETS,
  BUCKET_LABEL,
  capacityCap,
  dealCard,
  firstStepFor,
  groupOpenByBucket,
  outTonightState,
  pickLunchTask,
  versionFor,
  type Bucket,
  type Energy,
} from "@/lib/planning";
import {
  addDays,
  buildComingUp,
  buildFlags,
  buildGreeting,
  buildNowCard,
  buildTimeline,
  habitForBlock,
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
import { NowShell } from "./NowShell";
import { TransitionFlow } from "./TransitionFlow";
import { ShutdownSteps } from "./ShutdownSteps";
import { RecurringActions } from "./LifeControls";
import { GoalStrip } from "./GoalStrip";
import { ContextItems, EnergyChips, OutTonightCard, OutTonightToggle, QuickAdd, TaskDoneRow } from "./PlanControls";

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
    ? getCalendarEvents(userId, { days: COMING_UP_DAYS + 1, daysBack: 3 })
    : Promise.resolve(null);

  const [agenda, todaysSpark, storedFlag, resetState, life, allGoals] = await Promise.all([
    getDayAgenda(userId, tz, {
      points: modules.showPoints,
      cleaning: modules.showCleaning,
      exercise: modules.showExercise,
      finance: modules.showFinance,
    }),
    getTodaysSpark(userId, todayKey),
    getDayFlag(userId, todayKey),
    // Only Sundays show the reset card, so only Sundays pay for the lookup.
    isSunday(todayKey) ? getResetState(userId, resetWeekKey(todayKey)) : Promise.resolve(null),
    getLifeAdmin(userId, tz, todayKey),
    getGoals(userId, todayKey),
  ]);
  const activeGoals = allGoals.filter((g) => g.status === "active");

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

  // What the Now card shows before the calendar and plan data have loaded.
  const basicNowCard = buildNowCard({
    structure,
    minutes: nowMinutes,
    habit: habitForBlock(agenda.habitCandidates, currentBlock(structure, nowMinutes)?.id ?? null),
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
    bills: [
      ...agenda.billsUnpaidDaysUntil,
      // Subscriptions you pay by hand are reminded like manual bills; autopay needs none.
      ...life.subscriptions
        .filter((s) => !s.status.isTrial && !s.autopay && s.status.daysUntil >= 0 && s.status.daysUntil <= MANUAL_CHARGE_FLAG_DAYS)
        .map((s) => ({ name: s.name, daysUntil: s.status.daysUntil, href: "/life" })),
    ],
    trials: life.subscriptions
      .filter((s) => s.status.isTrial)
      .map((s) => ({ name: s.name, daysUntil: s.status.daysUntil, amount: s.amount })),
    outTonight: storedFlag?.outTonight === true,
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

        <Suspense fallback={<NowShell {...basicNowCard} />}>
          <NowArea
            userId={userId}
            tz={tz}
            structure={structure}
            nowMinutes={nowMinutes}
            todayKey={todayKey}
            nowMs={now.getTime()}
            agenda={agenda}
            life={life}
            goals={activeGoals}
            calendarPromise={calendarPromise}
            showExercise={modules.showExercise}
            showCleaning={modules.showCleaning}
          />
        </Suspense>

        <GoalStrip goals={activeGoals} />

        {resetState && !resetState.completed && (
          <Link
            href="/reset"
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3"
          >
            <span>
              <span className="block text-sm font-medium text-neutral-200">Sunday reset</span>
              <span className="block text-xs text-neutral-500">
                About ten minutes · +{RESET_POINTS} points when you finish
              </span>
            </span>
            <span aria-hidden className="text-neutral-600">
              ›
            </span>
          </Link>
        )}

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
            life={life}
            agenda={agenda}
            structure={structure}
            todayKey={todayKey}
            tz={tz}
          />
        </Suspense>

        <Suspense fallback={null}>
          <JournalNudges userId={userId} tz={tz} todayKey={todayKey} nowMs={now.getTime()} />
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

        <QuickAdd />

        <p className="px-1 pt-2 text-center text-xs text-neutral-600">
          <Link href="/overview" className="tap px-2 underline">
            Classic overview
          </Link>
        </p>
      </main>
    </div>
  );
}

// Morning: finish last night's entry if it is still open, and look back at "on this day".
async function JournalNudges({ userId, tz, todayKey, nowMs }: { userId: string; tz: string; todayKey: string; nowMs: number }) {
  const yesterdayKey = addDays(todayKey, -1);
  const [yesterday, memories] = await Promise.all([getEntry(userId, yesterdayKey), getOnThisDay(userId, todayKey)]);
  const unfinished = yesterday && !yesterday.completed && entryIsOpen(yesterdayKey, todayKey, tz, new Date(nowMs));
  if (!unfinished && memories.length === 0) return null;
  return (
    <>
      {unfinished && (
        <Link
          href={`/journal?date=${yesterdayKey}`}
          className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-neutral-200">Finish last night’s journal</span>
            <span className="block text-xs text-neutral-500">Open until noon</span>
          </span>
          <span aria-hidden className="text-neutral-600">
            ›
          </span>
        </Link>
      )}
      {memories.length > 0 && <OnThisDayCard memories={memories} />}
    </>
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

// The Now card, and whatever the current block adds beneath it:
//   Launch      the one priority set last night, then workout and habits
//   Work        mostly quiet; an optional lunch card
//   Transition  energy check-in, 20-minute rest, one easy start (takes over the card)
//   Evening     the next task, with Learning / Body / Home / Inbox beneath
//   Shutdown    log the day, tidy the Inbox, plan tomorrow
// "Out tonight" collapses the evening and shutdown to a one-line log.
async function NowArea({
  userId,
  tz,
  structure,
  nowMinutes,
  todayKey,
  nowMs,
  agenda,
  life,
  goals,
  calendarPromise,
  showExercise,
  showCleaning,
}: {
  userId: string;
  tz: string;
  structure: DayStructure;
  nowMinutes: number;
  todayKey: string;
  nowMs: number;
  agenda: DayAgenda;
  life: LifeAdmin;
  goals: GoalView[];
  calendarPromise: Promise<CalendarResult | null>;
  showExercise: boolean;
  showCleaning: boolean;
}) {
  const [events, tasks, energy, storedFlag, log, finishedToday, journalEntry] = await Promise.all([
    calendarPromise.then(eventsOf),
    getPlanTasks(userId),
    getEnergyToday(userId, todayKey),
    getDayFlag(userId, todayKey),
    getDayLog(userId, todayKey),
    getFinishedCount(userId, todayKey),
    getEntry(userId, todayKey),
  ]);

  const hasEveningEvent = events.some((e) => !e.allDay && e.isEvening && eventOnDay(e, todayKey, tz));
  // The first time an evening event is seen, remember it — that is what protects the streak.
  if (!storedFlag && hasEveningEvent) await recordAutoOutTonight(userId, todayKey);
  const out = outTonightState({ stored: storedFlag, hasEveningEvent });
  // A calendar event that mentions someone counts as seeing them (resets their "see every X weeks").
  await syncSeenFromCalendar(userId, events, tz, life.people, nowMs);

  const block = currentBlock(structure, nowMinutes);
  const tomorrowKey = addDays(todayKey, 1);
  const level = energy?.level ?? null;
  const open = tasks.filter((t) => t.status === "open");
  const plannedToday = open.filter((t) => t.plannedFor === todayKey);
  const priority = plannedToday.find((t) => t.isPriority) ?? null;
  const grouped = groupOpenByBucket(open, todayKey);
  const dealt = (blockId: string) => dealCard(open, { todayKey, energy: level, blockId });
  const eveningPick = dealt("evening");
  const lunch = pickLunchTask(open);
  const plannedTomorrow = open.filter((t) => t.plannedFor === tomorrowKey);

  const goalFor = (goalId: string | null) => {
    const goal = goalId ? goals.find((g) => g.id === goalId) : undefined;
    return goal ? { title: goal.title, why: goal.why } : null;
  };

  const pickOf = (task: (typeof open)[number] | null) => {
    if (!task) return null;
    const version = versionFor(task, level);
    const elapsed = task.startedAt ? Math.floor((nowMs - task.startedAt.getTime()) / 1000) : null;
    return {
      id: task.id,
      title: version.title,
      easier: version.easier,
      firstStep: firstStepFor(task),
      goal: goalFor(task.goalId),
      minutes: task.minutes,
      // A Start from hours ago is stale; treat it as not started.
      startedElapsedSec: elapsed !== null && elapsed >= 0 && elapsed < 6 * 3600 ? elapsed : null,
    };
  };

  const card = buildNowCard({
    structure,
    minutes: nowMinutes,
    habit: habitForBlock(agenda.habitCandidates, block?.id ?? null),
    cleaning: agenda.cleaning,
    weekly: agenda.weekly,
    workout: agenda.workout,
    doneToday: finishedToday,
    priorityTask: pickOf(priority),
    plannedTask: pickOf(eveningPick),
    lunchTask: pickOf(lunch),
    outTonight: out.on,
    shutdown: {
      logged: log !== null,
      inboxCount: open.filter((t) => t.bucket === "inbox" && t.plannedFor === null).length,
      plannedCount: plannedTomorrow.length,
      journalDone: journalEntry?.completed ?? false,
    },
  });

  const inEveningOrLater = block?.id === "evening" || block?.id === "shutdown";

  // Life admin that has come due becomes the evening card — unless something is already planned for tonight.
  const recurringCard =
    block?.id === "evening" && !out.on && !(eveningPick && eveningPick.plannedFor === todayKey)
      ? (life.recurring.find((r) => r.status.phase === "due" && r.skippedDate !== todayKey) ?? null)
      : null;

  // Collections surface where they belong: a film or show for a low-energy evening,
  // the next book at Shutdown, and the list picker for filing Inbox items.
  const [movies, books, collections] = await Promise.all([
    block?.id === "evening" && !out.on && level === "low" ? getContextItems(userId, "movies", 2) : null,
    block?.id === "shutdown" && !out.on ? getContextItems(userId, "books", 1) : null,
    block?.id === "shutdown" && !out.on ? getCollectionChoices(userId) : [],
  ]);

  if (block?.id === "transition" && !out.on) {
    const starterTask = dealt("transition");
    const starter = pickOf(starterTask);
    return (
      <>
        <TransitionFlow
          initialEnergy={level}
          restStartedAtMs={energy?.restStartedAt ? energy.restStartedAt.getTime() : null}
          restDone={energy?.restDone ?? false}
          starter={
            starterTask && starter
              ? {
                  id: starter.id,
                  title: starterTask.title,
                  lowTitle: starterTask.lowTitle,
                  firstStep: starter.firstStep,
                  minutes: starter.minutes,
                  startedElapsedSec: starter.startedElapsedSec,
                }
              : null
          }
          serverNowMs={nowMs}
        />
        <OutTonightToggle />
      </>
    );
  }

  return (
    <>
      {recurringCard ? (
        <NowShell
          eyebrow="Now · Evening"
          title={recurringCard.name}
          detail={`Life admin · ${describeInterval(recurringCard.intervalDays)} · ${dueLabel(recurringCard.status.daysUntil)}`}
        >
          <RecurringActions id={recurringCard.id} />
        </NowShell>
      ) : (
        <NowShell {...card} />
      )}

      {inEveningOrLater && out.on && <OutTonightCard initialNote={log?.note ?? ""} logged={log !== null} />}

      {block?.id === "evening" && !out.on && (
        <>
          <EveningSection
            level={level}
            todayKey={todayKey}
            grouped={grouped}
            workoutName={showExercise ? (agenda.workout?.dayName ?? null) : null}
            cleaningNames={showCleaning ? agenda.cleaningDueNames : []}
          />
          {movies && movies.items.length > 0 && (
            <ContextItems
              heading="Something easy to watch"
              note={`From ${movies.listName} — a gentle option for a low-energy evening.`}
              items={movies.items}
              doneLabel="Watched"
            />
          )}
          <OutTonightToggle />
        </>
      )}

      {block?.id === "shutdown" && !out.on && (
        <ShutdownSteps
          logged={log !== null}
          initialNote={log?.note ?? ""}
          finishedToday={finishedToday}
          tomorrowKey={tomorrowKey}
          cap={capacityCap(finishedToday)}
          collections={collections}
          journalDone={journalEntry?.completed ?? false}
          journalStatus={journalEntry?.completed ? "Done ✓" : journalEntry ? "Draft" : "Not yet"}
          journal={
            <Suspense fallback={<p className="text-sm text-neutral-500">Drafting the day…</p>}>
              <JournalPanel userId={userId} date={todayKey} />
            </Suspense>
          }
          tasks={open.map((t) => ({
            id: t.id,
            title: t.title,
            bucket: t.bucket,
            plannedFor: t.plannedFor,
            isPriority: t.isPriority,
          }))}
        />
      )}

      {block?.id === "shutdown" && !out.on && books && books.items.length > 0 && (
        <ContextItems
          heading="Tonight's read"
          note={`Next up in ${books.listName}.`}
          items={books.items}
          doneLabel="Finished"
        />
      )}

      {block?.id === "work" && !out.on && nowMinutes >= structure.workEndMinutes - 90 && <OutTonightToggle />}
    </>
  );
}

function EveningSection({
  level,
  todayKey,
  grouped,
  workoutName,
  cleaningNames,
}: {
  level: Energy | null;
  todayKey: string;
  grouped: Record<Bucket, PlanTask[]>;
  workoutName: string | null;
  cleaningNames: string[];
}) {
  const anything =
    BUCKETS.some((b) => grouped[b].length > 0) || workoutName !== null || cleaningNames.length > 0;

  return (
    <details aria-label="Evening build" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-neutral-200">
        Everything on your list
        <span className="text-xs font-normal text-neutral-500">Learning · Body · Home · Inbox</span>
      </summary>
      <div className="space-y-4 pb-3 pt-2">
      <div className="space-y-2">
        <EnergyChips level={level} />
        {level === "low" && (
          <p className="text-xs text-neutral-500">Showing the easier versions where there are any.</p>
        )}
      </div>

      {!anything && (
        <p className="text-sm text-neutral-500">Nothing waiting. Capture something below, or enjoy the evening.</p>
      )}

      {BUCKETS.map((bucket) => {
        const tasks = grouped[bucket];
        const extraBody = bucket === "body" && workoutName !== null;
        const extraHome = bucket === "home" && cleaningNames.length > 0;
        if (tasks.length === 0 && !extraBody && !extraHome) return null;
        return (
          <div key={bucket}>
            <h3 className="text-xs font-medium text-neutral-500">{BUCKET_LABEL[bucket]}</h3>
            <ul className="mt-1 divide-y divide-neutral-800">
              {tasks.map((task) => {
                const version = versionFor(task, level);
                return (
                  <TaskDoneRow
                    key={task.id}
                    taskId={task.id}
                    title={version.title}
                    hint={
                      [task.plannedFor === todayKey ? "Planned for today" : null, version.easier ? "Easier version" : null, task.minutes ? `${task.minutes} min` : null]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                );
              })}
              {extraBody && (
                <li>
                  <Link href="/exercise" className="flex min-h-11 items-center justify-between text-sm text-neutral-300">
                    <span>Workout: {workoutName}</span>
                    <span aria-hidden className="text-neutral-600">
                      ›
                    </span>
                  </Link>
                </li>
              )}
              {extraHome &&
                cleaningNames.map((name) => (
                  <li key={name}>
                    <Link href="/cleaning" className="flex min-h-11 items-center justify-between text-sm text-neutral-300">
                      <span>{name}</span>
                      <span aria-hidden className="text-neutral-600">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        );
      })}
      </div>
    </details>
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
  life,
  agenda,
  structure,
  todayKey,
  tz,
}: {
  calendarPromise: Promise<CalendarResult | null>;
  life: LifeAdmin;
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
    birthdays: life.people
      .filter((p) => p.birthday && p.birthday.daysUntil >= 1 && p.birthday.daysUntil <= BIRTHDAY_COMING_UP_DAYS)
      .map((p) => ({ name: p.name, dateKey: p.birthday!.dateKey, turning: p.birthday!.turning, giftIdeas: p.giftIdeas })),
    charges: life.subscriptions
      .filter((s) => s.status.daysUntil >= 1 && s.status.daysUntil <= COMING_UP_DAYS)
      .map((s) => ({ name: s.name, amount: s.amount, dateKey: s.status.chargeKey, autopay: s.autopay, trial: s.status.isTrial })),
    tz,
  });
  // Life admin that's within two weeks of coming due, and people it's been a while since you saw.
  const lifeLines = [
    ...life.recurring
      .filter((r) => r.status.phase === "coming")
      .map((r) => `${r.name} — ${dueLabel(r.status.daysUntil)}`),
    ...life.people
      .filter((p) => p.nudge)
      .map((p) => `Maybe reach out to ${p.name} — about ${p.nudge!.weeksSince} weeks`),
  ];
  return (
    <section aria-label="Coming up" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <h2 className="mb-2 text-sm font-medium text-neutral-200">Coming up</h2>
      {days.length === 0 && lifeLines.length === 0 ? (
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
          {lifeLines.length > 0 && (
            <li>
              <p className="text-xs font-medium text-neutral-500">Life admin</p>
              <ul className="mt-1 space-y-1">
                {lifeLines.map((line) => (
                  <li key={line} className="text-sm text-neutral-300">
                    {line}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
