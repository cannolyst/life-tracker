import Link from "next/link";
import type { ReactNode } from "react";
import { TaskActions } from "./TaskActions";

// The Now card is the one place on the page that carries the accent color.
// It also frames the Transition flow, which takes over the card in that block.
export function NowShell({
  eyebrow,
  title,
  detail,
  href,
  cta,
  taskId,
  firstStep,
  minutes,
  startedElapsedSec,
  swap,
  goal,
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  href?: string;
  cta?: string;
  taskId?: string;
  firstStep?: string;
  minutes?: number | null;
  startedElapsedSec?: number | null;
  swap?: boolean;
  goal?: { title: string; why: string } | null;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Now"
      className="rounded-lg border border-accent px-5 py-5"
      style={{ backgroundColor: "color-mix(in srgb, var(--color-accent) 9%, var(--color-neutral-900))" }}
    >
      <p className="text-xs font-medium text-accent">{eyebrow}</p>
      <p className="mt-1 text-xl font-semibold leading-snug text-neutral-100">{title}</p>
      {detail && <p className="mt-1 text-sm text-neutral-400">{detail}</p>}
      {goal && (
        <p className="mt-2 text-sm text-neutral-300">
          <span className="text-neutral-500">For your goal · </span>
          {goal.title}
          {goal.why && <span className="block text-neutral-400">“{goal.why}”</span>}
        </p>
      )}
      {children}
      {taskId && (
        <TaskActions
          key={taskId}
          taskId={taskId}
          firstStep={firstStep}
          minutes={minutes}
          startedElapsedSec={startedElapsedSec}
          swap={swap}
        />
      )}
      {href && (
        <Link href={href} className="tap mt-4 justify-center rounded-md bg-accent px-4 font-medium text-neutral-900">
          {cta ?? "Open"}
        </Link>
      )}
    </section>
  );
}
