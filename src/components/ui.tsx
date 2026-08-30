import { type ReactNode } from "react";
import { dateOnlyInAppTimezone } from "@/lib/timezone";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-neutral-800 bg-neutral-900 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className="h-full rounded-full bg-emerald-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function formatCurrency(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Formats a calendar-day value (a date-only DB column, or a Date built by
// dateOnlyInAppTimezone) — these are all anchored to UTC midnight, so we
// format in UTC to recover the exact stored day. Never pass a genuine
// instant/timestamp here directly — convert it with dateOnlyInAppTimezone
// first, otherwise the displayed day can shift by one depending on viewer
// timezone.
export function formatDate(date: Date | string | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const inputClass =
  "w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500";

export const labelClass = "text-sm text-neutral-400";

export const buttonClass =
  "rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 disabled:opacity-60";

export function buildBalancePoints(
  startingBalance: number,
  startDate: Date | string,
  txns: { date: Date | string; amount: number | string }[],
) {
  // startDate is a genuine timestamp (account.createdAt) — convert to its
  // Chicago calendar day first so it's on equal footing with the date-only
  // transaction values before formatting.
  const startDateOnly = dateOnlyInAppTimezone(
    typeof startDate === "string" ? new Date(startDate) : startDate,
  );
  const points = [{ date: formatDate(startDateOnly), balance: startingBalance }];
  let running = startingBalance;
  for (const t of txns) {
    running += Number(t.amount);
    points.push({ date: formatDate(t.date), balance: running });
  }
  return points;
}
