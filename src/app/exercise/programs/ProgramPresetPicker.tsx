"use client";

import { useActionState, useState } from "react";
import { createProgram, type ActionState } from "./actions";
import { PROGRAM_PRESETS, type ProgramPreset } from "@/lib/workoutPrograms";
import { inputClass, labelClass, buttonClass } from "@/components/ui";

const initialState: ActionState = {};

export function ProgramPresetPicker({
  redirectTo,
  heading,
}: {
  redirectTo: string;
  heading?: string;
}) {
  const [selected, setSelected] = useState<ProgramPreset | null>(null);

  return (
    <div className="space-y-4">
      {heading && <h2 className="text-lg font-semibold">{heading}</h2>}
      <div className="grid gap-3 sm:grid-cols-3">
        {PROGRAM_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelected(preset)}
            className={`rounded-lg border p-4 text-left transition ${
              selected?.id === preset.id
                ? "border-neutral-100 bg-neutral-800"
                : "border-neutral-800 hover:border-neutral-600"
            }`}
          >
            <p className="font-medium">{preset.label}</p>
            <p className="mt-1 text-sm text-neutral-500">{preset.description}</p>
          </button>
        ))}
      </div>
      {selected && (
        <PresetNameForm key={selected.id} preset={selected} redirectTo={redirectTo} />
      )}
    </div>
  );
}

function PresetNameForm({
  preset,
  redirectTo,
}: {
  preset: ProgramPreset;
  redirectTo: string;
}) {
  const action = createProgram.bind(null, preset.id, redirectTo);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[200px] flex-1 space-y-1">
        <label className={labelClass}>Program name</label>
        <input name="name" defaultValue={preset.label} required className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating..." : "Create program"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
