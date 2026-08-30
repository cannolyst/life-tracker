import type { MinimumPaymentStatus } from "@/lib/minimumPayment";
import { formatCurrency } from "./ui";

export function MinimumPaymentBadge({ status }: { status: MinimumPaymentStatus | null }) {
  if (!status || status.minimumPaymentDue <= 0) return null;

  return status.paid ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-400">
      ✓ Minimum paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-xs font-medium text-amber-400">
      {formatCurrency(status.remaining)} to minimum
    </span>
  );
}
