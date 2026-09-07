import Link from "next/link";
import { getWorkoutDays, getWorkoutDayData } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui";
import { ExerciseCard } from "./ExerciseCard";
import { AddExerciseForm } from "./ExerciseForms";
import { jewelFor } from "@/lib/jewels";

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
  const { day, exercises } = await getWorkoutDayData(selectedDayId);

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">Exercise</h1>

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
