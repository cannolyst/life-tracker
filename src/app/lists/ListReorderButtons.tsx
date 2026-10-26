"use client";

import { useTransition } from "react";
import { moveListUp, moveListDown } from "./actions";

// Lives inside a <summary>, so clicks must not also toggle the <details>.
export function ListReorderButtons({
  categoryId,
  name,
  isFirst,
  isLast,
}: {
  categoryId: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const move = (event: React.MouseEvent, action: (id: string) => Promise<void>) => {
    event.preventDefault();
    event.stopPropagation();
    startTransition(() => action(categoryId));
  };

  const buttonClass =
    "px-1 text-neutral-600 hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-600";

  return (
    <span className="ml-auto flex items-center">
      <button
        type="button"
        disabled={isFirst || pending}
        onClick={(e) => move(e, moveListUp)}
        aria-label={`Move ${name} up`}
        className={buttonClass}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={isLast || pending}
        onClick={(e) => move(e, moveListDown)}
        aria-label={`Move ${name} down`}
        className={buttonClass}
      >
        ↓
      </button>
    </span>
  );
}
