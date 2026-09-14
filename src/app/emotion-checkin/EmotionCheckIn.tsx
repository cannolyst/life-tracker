"use client";

import { useState, useTransition } from "react";
import { saveEmotionEntry, type EmotionEntryInput } from "./actions";
import { WHEEL, BODY_ZONES, DEFINITIONS, TERTIARY_DEFINITIONS, type WheelWord, type WheelColor } from "@/lib/emotions";
import { Card, inputClass, buttonClass } from "@/components/ui";

const COLOR_MAP: Record<WheelColor, { dot: string; text: string; border: string; bg: string }> = {
  rose: { dot: "bg-rose-500", text: "text-rose-700", border: "border-rose-300", bg: "bg-rose-50" },
  sky: { dot: "bg-sky-500", text: "text-sky-700", border: "border-sky-300", bg: "bg-sky-50" },
  amber: { dot: "bg-amber-500", text: "text-amber-700", border: "border-amber-300", bg: "bg-amber-50" },
  violet: { dot: "bg-violet-500", text: "text-violet-700", border: "border-violet-300", bg: "bg-violet-50" },
  emerald: { dot: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-300", bg: "bg-emerald-50" },
  teal: { dot: "bg-teal-500", text: "text-teal-700", border: "border-teal-300", bg: "bg-teal-50" },
};

type EmotionEntryRow = {
  id: string;
  moment: string;
  category: string;
  word: string;
  zone: string;
  mode: string;
  pointsAwarded: number;
  createdAt: string | Date;
};

function formatTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function EmotionCheckIn({
  initialEntries,
  pointsPerCheckIn,
}: {
  initialEntries: EmotionEntryRow[];
  pointsPerCheckIn: number;
}) {
  const [moment, setMoment] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<WheelWord | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [mode, setMode] = useState<"quiet" | "stuck" | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<EmotionEntryRow[]>(initialEntries);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeCategory = WHEEL.find((c) => c.key === category);
  const canSave = moment.trim() && word && zone && mode && !isPending;
  const isTertiaryWord = secondary != null && word != null && word !== secondary.label;

  const resetForm = () => {
    setMoment("");
    setCategory(null);
    setSecondary(null);
    setWord(null);
    setZone(null);
    setMode(null);
  };

  const handleSave = () => {
    if (!moment.trim() || !word || !zone || !mode || !activeCategory) return;
    const input: EmotionEntryInput = {
      moment: moment.trim(),
      category: activeCategory.key,
      word,
      zone,
      mode,
    };
    setError(null);
    startTransition(async () => {
      try {
        const saved = await saveEmotionEntry(input);
        setEntries((prev) => [saved as EmotionEntryRow, ...prev]);
        setJustSavedId(saved.id);
        resetForm();
        setTimeout(() => setJustSavedId(null), 2500);
      } catch {
        setError("Couldn't save that check-in — try again.");
      }
    });
  };

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 text-[11px] tracking-wide text-neutral-500">
            Daily Check-In {entries.length > 0 && <span className="text-neutral-600">· {entries.length} today</span>}
          </div>
          <h2 className="text-xl font-medium">How&apos;s it landing right now?</h2>
        </div>
        <div className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-500">
          +{pointsPerCheckIn} pts
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mb-7 space-y-2">
          {entries.map((e) => {
            const cat = WHEEL.find((c) => c.key === e.category);
            const cm = cat ? COLOR_MAP[cat.color] : null;
            const isOpen = expandedId === e.id;
            const def = DEFINITIONS[e.word]?.def ?? TERTIARY_DEFINITIONS[e.word];
            const zoneLabel = BODY_ZONES.find((z) => z.key === e.zone)?.label ?? e.zone;
            return (
              <div key={e.id}>
                <div
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-sm border border-neutral-800 px-3 py-2 transition-colors duration-700 ${
                    justSavedId === e.id && cm ? cm.bg : "bg-neutral-800/40"
                  }`}
                >
                  <span className="w-14 flex-shrink-0 text-[11px] text-neutral-500">{formatTime(e.createdAt)}</span>
                  {cm && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cm.dot}`} />}
                  <span className={`text-xs font-medium ${cm?.text ?? ""}`}>{e.word}</span>
                  <span className="text-[11px] text-neutral-500">· {zoneLabel.toLowerCase()}</span>
                  <span className="ml-auto text-[11px] text-neutral-600">{e.mode}</span>
                </div>
                {isOpen && def && (
                  <div className="ml-14 border-l-2 border-neutral-800 px-3 py-2">
                    <p className="text-[11px] leading-relaxed text-neutral-500">{def}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-7">
        <span className="text-[11px] tracking-wide text-neutral-500">
          {entries.length > 0 ? "Log another moment" : "First check-in of the day"}
        </span>

        {/* Step 1: the moment */}
        <div>
          <h3 className="mb-3 text-[15px] font-medium">What happened</h3>
          <textarea
            value={moment}
            onChange={(e) => setMoment(e.target.value)}
            placeholder="One or two sentences…"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Step 2: wheel — three rings */}
        <div>
          <h3 className="mb-3 text-[15px] font-medium">Name it</h3>

          <div className="mb-3 flex flex-wrap gap-2">
            {WHEEL.map((c) => {
              const cm = COLOR_MAP[c.color];
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setCategory(c.key);
                    setSecondary(null);
                    setWord(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active ? `${cm.border} ${cm.bg} ${cm.text}` : "border-neutral-700 text-neutral-500 hover:border-neutral-600"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cm.dot}`} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {activeCategory && (
            <div className="ml-1 flex flex-wrap gap-2 border-l-2 border-neutral-800 pl-1">
              {activeCategory.words.map((w) => {
                const cm = COLOR_MAP[activeCategory.color];
                const active = secondary?.label === w.label;
                return (
                  <button
                    key={w.label}
                    type="button"
                    onClick={() => {
                      setSecondary(w);
                      setWord(w.label);
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      active ? `${cm.border} ${cm.bg} ${cm.text}` : "border-neutral-700 text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          )}

          {secondary && activeCategory && (
            <div className="ml-2 mt-3 border-l-2 border-neutral-800 pl-3">
              <p className="mb-1.5 text-[11px] text-neutral-500">
                Want to get more precise than &quot;{secondary.label}&quot;?
              </p>
              <div className="flex flex-wrap gap-2">
                {secondary.tertiary.map((t) => {
                  const cm = COLOR_MAP[activeCategory.color];
                  const active = word === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWord(t)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        active ? `${cm.border} ${cm.bg} ${cm.text}` : "border-neutral-700 text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setWord(secondary.label)}
                  className={`rounded-full border px-2.5 py-1 text-xs italic ${
                    word === secondary.label ? "border-neutral-500 bg-neutral-800 text-neutral-300" : "border-neutral-700 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  Just &quot;{secondary.label}&quot;
                </button>
              </div>
            </div>
          )}

          {word && (
            <div className="ml-1 mt-3 border-l-2 border-neutral-800 pl-3">
              {isTertiaryWord && secondary ? (
                <>
                  <p className="mb-0.5 text-[11px] text-neutral-500">
                    {word} <span className="italic">— a shade of {secondary.label}</span>
                  </p>
                  <p className="text-xs leading-relaxed text-neutral-400">{TERTIARY_DEFINITIONS[word]}</p>
                </>
              ) : (
                DEFINITIONS[word] && (
                  <>
                    <p className="text-xs leading-relaxed text-neutral-400">{DEFINITIONS[word].def}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                      <span className="italic">Often shows up when: </span>
                      {DEFINITIONS[word].when}
                    </p>
                  </>
                )
              )}
            </div>
          )}
        </div>

        {/* Step 3: body zone */}
        <div>
          <h3 className="mb-3 text-[15px] font-medium">Where it lived</h3>
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 200 220" className="h-24 w-20 flex-shrink-0">
              <path
                d="M100 10 C 88 10 80 20 80 32 C 80 42 86 48 86 48 L 78 60 C 60 68 55 90 58 110 L 62 160 L 70 210 L 88 210 L 84 150 L 92 150 L 92 210 L 110 210 L 108 150 L 116 150 L 112 210 L 130 210 L 138 160 L 142 110 C 145 90 140 68 122 60 L 114 48 C 114 48 120 42 120 32 C 120 20 112 10 100 10 Z"
                fill="none"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              {BODY_ZONES.filter((z) => z.key !== "none").map((z) => (
                <circle
                  key={z.key}
                  cx={z.cx}
                  cy={z.cy}
                  r={zone === z.key ? 10 : 8}
                  className={`cursor-pointer transition-all ${zone === z.key ? "fill-violet-400" : "fill-stone-300 hover:fill-stone-400"}`}
                  onClick={() => setZone(z.key)}
                />
              ))}
            </svg>
            <div className="flex flex-col gap-1.5">
              {BODY_ZONES.map((z) => (
                <button
                  key={z.key}
                  type="button"
                  onClick={() => setZone(z.key)}
                  className={`rounded-full border px-2.5 py-1 text-left text-xs ${
                    zone === z.key ? "border-violet-300 bg-violet-50 text-violet-700" : "border-neutral-700 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: quiet vs stuck */}
        <div>
          <h3 className="mb-3 text-[15px] font-medium">Quiet, or stuck?</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("quiet")}
              className={`rounded-sm border px-3 py-2.5 text-left ${
                mode === "quiet" ? "border-neutral-500 bg-neutral-800" : "border-neutral-700 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs font-medium">Quiet</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">It genuinely wasn&apos;t much</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("stuck")}
              className={`rounded-sm border px-3 py-2.5 text-left ${
                mode === "stuck" ? "border-neutral-500 bg-neutral-800" : "border-neutral-700 hover:border-neutral-600"
              }`}
            >
              <div className="text-xs font-medium">Stuck</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">Something was there, didn&apos;t surface</div>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className={`${buttonClass} w-full`}
        >
          {isPending ? "Saving..." : "Save check-in"}
        </button>
      </div>
    </Card>
  );
}
