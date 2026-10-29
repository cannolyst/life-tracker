"use client";

import { useState, useTransition } from "react";
import { finishWalkthroughAction } from "./walkthrough-actions";

const STEPS = [
  {
    title: "One thing at a time",
    body: "The card under your greeting is what to do right now. It changes through the day — habits and a workout in the morning, a calm work block, an easy start after work, and a wind-down at night.",
  },
  {
    title: "Your day, laid out",
    body: "Below it you’ll find the day’s blocks and your calendar (turn that on in Settings), plus what’s coming up in the next few days and anything worth a look, like a bill due soon.",
  },
  {
    title: "Capture first, sort later",
    body: "Type anything into the box at the bottom of the home page and it lands in your Inbox. No need to decide anything yet — tidy it during Shutdown.",
  },
  {
    title: "Wind down",
    body: "At Shutdown you log the day, tidy the Inbox, pick tomorrow’s tasks, and add a photo journal entry. Out tonight is one tap if you’re not staying in.",
  },
  {
    title: "Make it yours",
    body: "Settings lets you switch each part on or off, choose your notification times, and set your day’s shape. The Guide explains every page, and you can replay this tour from there.",
  },
];

// A short first-run tour at the top of the home page, shown until it's finished or skipped.
export function Walkthrough() {
  const [step, setStep] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  if (hidden) return null;

  const finish = () => {
    setHidden(true);
    startTransition(async () => {
      await finishWalkthroughAction();
    });
  };

  return (
    <section aria-label="Welcome tour" className="space-y-3 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Welcome · {step + 1} of {STEPS.length}
        </p>
        <button type="button" onClick={finish} disabled={pending} className="tap -my-2 -mr-2 px-2 text-xs text-neutral-500 underline">
          Skip
        </button>
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-medium text-neutral-100">{current.title}</h2>
        <p className="text-sm text-neutral-400">{current.body}</p>
      </div>
      <div className="flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="min-h-11 rounded-md border border-neutral-700 px-4 text-sm text-neutral-300"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={last ? finish : () => setStep(step + 1)}
          disabled={pending}
          className="min-h-11 rounded-md bg-neutral-100 px-5 text-sm font-medium text-neutral-900 disabled:opacity-60"
        >
          {last ? "Got it" : "Next"}
        </button>
      </div>
    </section>
  );
}
