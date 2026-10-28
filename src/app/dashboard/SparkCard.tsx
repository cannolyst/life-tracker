"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { SPARK_TYPE_LABEL, type Spark } from "@/lib/sparks";
import { setSparkSaved } from "./actions";

export function SparkCard({ spark, saved }: { spark: Spark; saved: boolean }) {
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !optimisticSaved;
    startTransition(async () => {
      setOptimisticSaved(next);
      await setSparkSaved(spark.id, next);
    });
  }

  return (
    <section aria-label="Daily spark" className="rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-neutral-500">Today’s spark · {SPARK_TYPE_LABEL[spark.type]}</p>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={optimisticSaved}
          className="-mr-2 -mt-2 rounded-md px-3 text-sm text-neutral-400"
        >
          {optimisticSaved ? "Saved ✓" : "Save"}
        </button>
      </div>

      {spark.type === "word" ? (
        <>
          <p className="mt-1 text-lg font-medium text-neutral-100">{spark.text}</p>
          <p className="mt-1 text-sm text-neutral-400">{spark.detail}</p>
        </>
      ) : (
        <>
          <p className="mt-1 text-base leading-relaxed text-neutral-200">
            {spark.type === "quote" ? `“${spark.text}”` : spark.text}
          </p>
          {spark.type === "quote" && spark.detail && (
            <p className="mt-1 text-sm text-neutral-500">— {spark.detail}</p>
          )}
        </>
      )}

      <Link href="/sparks" className="tap mt-1 -ml-1 px-1 text-xs text-neutral-500">
        Your saved sparks
      </Link>
    </section>
  );
}
