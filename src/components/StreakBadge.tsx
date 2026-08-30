export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-400">
      🔥 {streak} day{streak === 1 ? "" : "s"}
    </span>
  );
}
