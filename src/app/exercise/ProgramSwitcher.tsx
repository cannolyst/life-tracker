"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setActiveProgram } from "./programs/actions";

type Program = { id: string; name: string; active: boolean };

export function ProgramSwitcher({ programs }: { programs: Program[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {programs.map((program) => (
        <button
          key={program.id}
          type="button"
          onClick={() => {
            if (!program.active) startTransition(() => setActiveProgram(program.id));
          }}
          disabled={isPending}
          className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
            program.active
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-400 hover:text-neutral-100"
          }`}
        >
          {program.name}
        </button>
      ))}
      <Link
        href="/exercise/programs"
        className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-100"
      >
        Manage
      </Link>
    </div>
  );
}
