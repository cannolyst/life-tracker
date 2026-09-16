"use client";

import { useState } from "react";
import { ExerciseCard, type Exercise } from "./ExerciseCard";
import { MUSCLE_GROUPS } from "@/lib/muscleGroups";
import { jewelFor } from "@/lib/jewels";

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const toggleFilter = (group: string) => {
    setActiveFilters((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  const filtered =
    activeFilters.length === 0
      ? exercises
      : exercises.filter((e) => e.muscleGroups.some((g) => activeFilters.includes(g)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {MUSCLE_GROUPS.map((group) => {
          const active = activeFilters.includes(group);
          return (
            <button
              key={group}
              type="button"
              onClick={() => toggleFilter(group)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                active
                  ? "border-neutral-100 bg-neutral-100 text-neutral-900"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"
              }`}
            >
              {group}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveFilters([])}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-500">No exercises match the selected muscle group(s).</p>
        ) : (
          filtered.map((exercise) => {
            const fullIndex = exercises.findIndex((e) => e.id === exercise.id);
            return (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                jewel={jewelFor(fullIndex)}
                isFirst={fullIndex === 0}
                isLast={fullIndex === exercises.length - 1}
                showReorder={activeFilters.length === 0}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
