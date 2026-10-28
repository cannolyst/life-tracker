"use client";

import { useTransition } from "react";
import { setSparkSaved } from "../dashboard/actions";

export function RemoveSparkButton({ sparkId }: { sparkId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setSparkSaved(sparkId, false))}
      className="-ml-3 mt-1 rounded-md px-3 text-sm text-neutral-500 disabled:opacity-60"
    >
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}
