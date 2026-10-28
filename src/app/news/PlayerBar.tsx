"use client";

type Props = {
  status: "playing" | "paused";
  label: string;
  // Shown as "3 of 12" for a queue of stories; hidden for a single story or
  // the brief, where a step count isn't meaningful.
  position?: { current: number; total: number };
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onStop: () => void;
};

const controlClass =
  "rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100";

export function PlayerBar({ status, label, position, onPause, onResume, onSkip, onStop }: Props) {
  return (
    <div
      role="region"
      aria-label="Audio player"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-900"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-500">
            {status === "paused" ? "Paused" : "Now playing"}
            {position ? ` · ${position.current} of ${position.total}` : ""}
          </p>
          <p className="truncate text-sm text-neutral-300">{label}</p>
        </div>
        <button type="button" onClick={status === "paused" ? onResume : onPause} className={controlClass}>
          {status === "paused" ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={onSkip} className={controlClass}>
          Skip
        </button>
        <button type="button" onClick={onStop} aria-label="Stop" className={controlClass}>
          ✕
        </button>
      </div>
    </div>
  );
}
