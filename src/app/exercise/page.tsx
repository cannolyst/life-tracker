import Link from "next/link";
import {
  getWorkoutDays,
  getWorkoutDayData,
  getWorkoutWeekProgress,
  getWorkoutDashboardStats,
} from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatDateRange } from "@/components/ui";
import { ExerciseCard, TrendBadge } from "./ExerciseCard";
import { AddExerciseForm } from "./ExerciseForms";
import { jewelFor, jewelChipStyle, JEWELS } from "@/lib/jewels";

export const dynamic = "force-dynamic";

export default async function ExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: dayParam } = await searchParams;
  const days = await getWorkoutDays();

  if (days.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
          <h1 className="text-xl font-semibold">Exercise</h1>
          <p className="text-sm text-neutral-500">No workout days set up yet.</p>
        </main>
      </div>
    );
  }

  const selectedDayId = dayParam && days.some((d) => d.id === dayParam) ? dayParam : days[0].id;
  const [{ day, exercises }, weekProgress, stats] = await Promise.all([
    getWorkoutDayData(selectedDayId),
    getWorkoutWeekProgress(),
    getWorkoutDashboardStats(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Exercise</h1>

        <Card>
          <h2 className="mb-3 font-medium">
            This week&apos;s workouts ({formatDateRange(weekProgress.weekStart, weekProgress.weekEnd)})
          </h2>
          <div className="flex flex-wrap gap-2">
            {weekProgress.days.map((d) => (
              <span
                key={d.id}
                className={
                  d.count > 0
                    ? "rounded-full px-3 py-1.5 text-sm"
                    : "rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-500"
                }
                style={d.count > 0 ? jewelChipStyle(JEWELS[2]) : undefined}
              >
                {d.count > 0 ? "✓ " : ""}
                {d.name}
                {d.count > 1 ? ` ×${d.count}` : ""}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Ready to increase</p>
              <p className="text-2xl font-semibold" style={{ color: JEWELS[4].color }}>
                {stats.readyToIncreaseCount}
              </p>
            </div>
            <div>
              <p className="text-neutral-500">Weekly volume</p>
              <p className="text-2xl font-semibold">
                {stats.thisWeekVolume.toLocaleString()}{" "}
                <span className="text-sm font-normal text-neutral-500">lb·reps</span>
              </p>
              <div className="mt-1">
                <TrendBadge trend={stats.volumeTrend} />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Link
              key={d.id}
              href={`/exercise?day=${d.id}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                d.id === selectedDayId
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-100"
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>

        <div className="space-y-4">
          {exercises.map((exercise, i) => (
            <ExerciseCard key={exercise.id} exercise={exercise} jewel={jewelFor(i)} />
          ))}
        </div>

        <Card>
          <h2 className="mb-3 font-medium">Add exercise to {day.name}</h2>
          <AddExerciseForm dayId={day.id} />
        </Card>
      </main>
    </div>
  );
}
