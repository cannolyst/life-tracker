"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Sparkle } from "@/components/Sparkle";
import { TaskList, type Task } from "./TaskList";

export type TaskGroup = {
  key: string;
  name: string;
  jewel?: { color: string; soft: string };
  tasks: Task[];
};

const DONE_JEWEL = { color: "#2E7D5C", soft: "#E7F2EC" };

export function CleaningTasksView({
  categoryGroups,
  timeframeGroups,
}: {
  categoryGroups: TaskGroup[];
  timeframeGroups: TaskGroup[];
}) {
  const [view, setView] = useState<"category" | "timeframe">("category");
  const groups = view === "category" ? categoryGroups : timeframeGroups;
  const showArea = view === "timeframe";
  const isEmpty = groups.every((g) => g.tasks.length === 0);

  return (
    <section className="space-y-4">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setView("category")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            view === "category"
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          By category
        </button>
        <button
          type="button"
          onClick={() => setView("timeframe")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            view === "timeframe"
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          By timeframe
        </button>
      </div>

      {groups.map(
        (group) =>
          group.tasks.length > 0 && (
            <Card key={group.key}>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                {group.jewel && <Sparkle className="h-3.5 w-3.5" color={group.jewel.color} />}
                {group.name}
              </h3>
              <TaskList tasks={group.tasks} jewel={group.jewel ?? DONE_JEWEL} showArea={showArea} />
            </Card>
          ),
      )}
      {isEmpty && (
        <p className="text-sm text-neutral-500">No cleaning tasks yet — add one below.</p>
      )}
    </section>
  );
}
