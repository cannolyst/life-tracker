import { notFound } from "next/navigation";
import { getExerciseHistory } from "@/db/queries";
import { Nav } from "@/components/Nav";
import { Card, formatDate } from "@/components/ui";
import { ExerciseHistoryChart } from "./ExerciseHistoryChart";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const data = await getExerciseHistory(exerciseId);
  if (!data) notFound();
  const { exercise, history } = data;

  const chartData = history
    .slice()
    .reverse()
    .slice(-20)
    .map((entry) => {
      const scores = entry.sets.map((s) =>
        exercise.tracksDuration
          ? (s.durationSeconds ?? 0)
          : s.weight != null && s.reps != null
            ? Number(s.weight) * s.reps
            : 0,
      );
      return {
        dateKey: entry.date,
        label: formatDate(new Date(`${entry.date}T00:00:00Z`)),
        score: Math.max(0, ...scores),
      };
    });

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">{exercise.name}</h1>

        {history.length > 0 && (
          <Card>
            <h2 className="mb-3 font-medium">Best set per session</h2>
            <ExerciseHistoryChart
              data={chartData}
              unitLabel={exercise.tracksDuration ? "sec" : "lb×reps"}
            />
          </Card>
        )}

        <Card>
          <h2 className="mb-3 font-medium">History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li key={entry.date} className="border-b border-neutral-800 pb-2 last:border-0">
                  <p className="mb-1 text-sm font-medium text-neutral-300">
                    {formatDate(new Date(`${entry.date}T00:00:00Z`))}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {entry.sets
                      .map((s) =>
                        exercise.tracksDuration
                          ? `${s.durationSeconds}s`
                          : `${s.weight != null ? Number(s.weight) : "—"} lbs × ${s.reps ?? "—"}`,
                      )
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
