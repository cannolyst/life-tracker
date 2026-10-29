import type { ReactNode } from "react";

// A collapsed "+ Add …" card: one quiet row until you need it, then the form
// opens in place. Closed forms stay mounted, so anything half-typed is kept.
export function AddRow({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral-200">
        <span aria-hidden className="text-neutral-500 transition-transform group-open:rotate-45">
          +
        </span>
        {title}
        {hint && <span className="ml-auto text-xs font-normal text-neutral-500">{hint}</span>}
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}
