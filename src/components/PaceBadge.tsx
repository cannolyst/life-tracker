export function PaceBadge({ onTrack }: { onTrack: boolean | null }) {
  if (onTrack === null) return null;
  return onTrack ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
      ✓ Ahead of pace
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-950 px-2 py-0.5 text-xs font-medium text-red-400">
      ⚠ Behind pace
    </span>
  );
}
