import { notFound } from "next/navigation";
import { getExerciseHistory } from "@/db/queries";
import { requireUserId } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { Card, formatDate } from "@/components/ui";
import { ExerciseHistoryChart } from "./ExerciseHistoryChart";
import { ExerciseSetsChart } from "./ExerciseSetsChart";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const data = await getExerciseHistory(exerciseId, await requireUserId());
  if (!data) notFound();
  const { exercise, history } = data;

  const recentHistory = history.slice().reverse().slice(-20);

  // Duration exercises (Plank, etc.) still get the simple "best hold time
  // per session" bar — there's no weight/reps breakdown to stack there.
  const durationChartData = recentHistory.map((entry) => ({
    dateKey: entry.date,
    label: formatDate(new Date(`${entry.date}T00:00:00Z`)),
    score: Math.max(0, ...entry.sets.map((s) => s.durationSeconds ?? 0)),
  }));

  // Weight exercises: one stacked bar per session, one segment per distinct
  // weight used, so the actual weight for each chunk of work is visible
  // (via the tooltip) instead of being collapsed into a single "best set"
  // number. Sets sharing a weight are combined into one taller segment —
  // its height is their combined reps, and hovering lists each set's own
  // rep count so different-rep sets at the same weight aren't hidden.
  function groupSetsByWeight(sets: { weight: string | null; reps: number | null }[]) {
    const groups: { weight: number | null; repsList: number[] }[] = [];
    for (const s of sets) {
      const weight = s.weight != null ? Number(s.weight) : null;
      const reps = s.reps ?? 0;
      const existing = groups.find((g) => g.weight === weight);
      if (existing) existing.repsList.push(reps);
      else groups.push({ weight, repsList: [reps] });
    }
    return groups;
  }

  const groupedHistory = recentHistory.map((entry) => groupSetsByWeight(entry.sets));
  const maxSets = Math.max(0, ...groupedHistory.map((groups) => groups.length));
  const setsChartData = recentHistory.map((entry, entryIndex) => {
    const point: { dateKey: string; label: string; [key: string]: string | number | number[] } = {
      dateKey: entry.date,
      label: formatDate(new Date(`${entry.date}T00:00:00Z`)),
    };
    groupedHistory[entryIndex].forEach((g, i) => {
      point[`reps_${i}`] = g.repsList.reduce((sum, r) => sum + r, 0);
      point[`weight_${i}`] = g.weight ?? 0;
      point[`repsList_${i}`] = g.repsList;
    });
    return point;
  });

  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold">{exercise.name}</h1>

        {history.length > 0 && exercise.tracksDuration && (
          <Card>
            <h2 className="mb-3 font-medium">Best hold time per session</h2>
            <ExerciseHistoryChart data={durationChartData} unitLabel="sec" />
          </Card>
        )}

        {history.length > 0 && !exercise.tracksDuration && (
          <Card>
            <h2 className="mb-3 font-medium">Sets per session</h2>
            <ExerciseSetsChart data={setsChartData} maxSets={maxSets} />
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
