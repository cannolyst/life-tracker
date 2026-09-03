"use client";

import { useTransition } from "react";
import { deleteYearReviewCategory } from "./actions";

export function DeleteCategoryButton({
  categoryId,
  categoryName,
}: {
  categoryId: string;
  categoryName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm(`Delete "${categoryName}" and everything logged in it? This can't be undone.`)) {
          startTransition(() => {
            deleteYearReviewCategory(categoryId);
          });
        }
      }}
      className="mt-4 w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-400 hover:text-red-400 disabled:opacity-60"
    >
      {isPending ? "Deleting..." : "Delete category"}
    </button>
  );
}
