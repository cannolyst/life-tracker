"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatCountdown, restRemainingSeconds, versionFor, type Energy } from "@/lib/planning";
import { finishRest, setEnergy, startRest } from "../plan/actions";
import { NowShell } from "./NowShell";

type Starter = { id: string; title: string; lowTitle: string | null };

const choiceClass =
  "min-h-12 rounded-md border border-accent bg-neutral-900 px-4 text-base font-medium text-neutral-100 disabled:opacity-60";
const quietClass = "min-h-11 rounded-md px-3 text-sm text-neutral-400 disabled:opacity-60";

// The 4–5pm block, as one card that takes you through: a one-tap energy
// check-in, a 20-minute rest, then one easy way to start. None of it earns
// or costs points. Each step is saved, so a refresh picks up where you were.
export function TransitionFlow({
  initialEnergy,
  restStartedAtMs,
  restDone: initialRestDone,
  starter,
  serverNowMs,
}: {
  initialEnergy: Energy | null;
  restStartedAtMs: number | null;
  restDone: boolean;
  starter: Starter | null;
  serverNowMs: number;
}) {
  const [energy, setEnergyState] = useState(initialEnergy);
  const [restStartedAt, setRestStartedAt] = useState(restStartedAtMs);
  const [restDone, setRestDone] = useState(initialRestDone);
  const [pending, startTransition] = useTransition();
  // The server clock and this phone's clock can differ a little; count from the server's.
  const skew = useRef(0);
  useEffect(() => {
    skew.current = Date.now() - serverNowMs;
  }, [serverNowMs]);
  const [remaining, setRemaining] = useState(() =>
    restStartedAtMs ? restRemainingSeconds(restStartedAtMs, serverNowMs) : 0,
  );

  const running = restStartedAt !== null && !restDone;

  useEffect(() => {
    if (!running || restStartedAt === null) return;
    const tick = () => {
      const left = restRemainingSeconds(restStartedAt, Date.now() - skew.current);
      setRemaining(left);
      if (left === 0) {
        setRestDone(true);
        void finishRest();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, restStartedAt]);

  function chooseEnergy(level: Energy) {
    setEnergyState(level);
    startTransition(async () => void (await setEnergy(level)));
  }

  function beginRest() {
    setRestStartedAt(Date.now() - skew.current);
    setRemaining(restRemainingSeconds(Date.now(), Date.now()));
    startTransition(async () => void (await startRest()));
  }

  function skipRest() {
    setRestDone(true);
    startTransition(async () => void (await finishRest()));
  }

  const eyebrow = "Now · Transition";

  if (energy === null) {
    return (
      <NowShell eyebrow={eyebrow} title="How's your energy?" detail="One tap. It doesn't touch your points.">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={pending} onClick={() => chooseEnergy("high")} className={choiceClass}>
            High
          </button>
          <button type="button" disabled={pending} onClick={() => chooseEnergy("low")} className={choiceClass}>
            Low
          </button>
        </div>
      </NowShell>
    );
  }

  if (running) {
    return (
      <NowShell eyebrow={eyebrow} title={formatCountdown(remaining)} detail="Resting. There's nothing to do right now.">
        <button type="button" disabled={pending} onClick={skipRest} className={`${quietClass} mt-3 -ml-3`}>
          I’m ready sooner
        </button>
      </NowShell>
    );
  }

  if (!restDone) {
    return (
      <NowShell
        eyebrow={eyebrow}
        title="Rest for twenty minutes"
        detail={energy === "low" ? "Low energy noted — rest is the right call." : "A short reset before the evening."}
      >
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" disabled={pending} onClick={beginRest} className={choiceClass}>
            Start rest
          </button>
          <button type="button" disabled={pending} onClick={skipRest} className={choiceClass}>
            Skip
          </button>
        </div>
        <button type="button" disabled={pending} onClick={() => chooseEnergy(energy === "high" ? "low" : "high")} className={`${quietClass} mt-2 -ml-3`}>
          Change energy to {energy === "high" ? "low" : "high"}
        </button>
      </NowShell>
    );
  }

  if (starter) {
    const version = versionFor(starter, energy);
    return (
      <NowShell
        eyebrow={eyebrow}
        title={version.title}
        detail={version.easier ? "One easy start — the lighter version, since energy is low." : "One easy start, from the couch if you like."}
        taskId={starter.id}
      />
    );
  }

  return <NowShell eyebrow={eyebrow} title="Nothing waiting" detail="Enjoy the breather. The evening starts soon." />;
}
