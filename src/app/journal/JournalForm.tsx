"use client";

import { useRef, useState, useTransition } from "react";
import { MOODS, SPARK_PROMPT, factLines, photoDateNote, type JournalFacts } from "@/lib/journal";
import { removeJournalPhotoAction, saveJournalAction } from "./actions";
import { preparePhoto } from "./photo";

export type JournalFormEntry = {
  id: string | null;
  hasPhoto: boolean;
  photoTakenOn: string | null;
  fallback: "weather" | "map" | null;
  prompt: string;
  reflection: string;
  mood: string | null;
  completed: boolean;
};

const chip = "min-h-11 rounded-full border px-4 text-sm";

function mapSrc(place: NonNullable<JournalFacts["place"]>): string {
  const d = 0.05;
  const bbox = [place.lon - d, place.lat - d, place.lon + d, place.lat + d].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${place.lat}%2C${place.lon}`;
}

// One night's entry: the drafted facts, a photo (or weather / a map), one
// prompt, and an optional mood. Nothing here earns or costs points.
export function JournalForm({
  date,
  entry,
  facts,
  prompt,
  hasSpark,
}: {
  date: string;
  entry: JournalFormEntry;
  facts: JournalFacts;
  prompt: string;
  hasSpark: boolean;
}) {
  const [entryId, setEntryId] = useState(entry.id);
  const [hasPhoto, setHasPhoto] = useState(entry.hasPhoto);
  const [photoKey, setPhotoKey] = useState(0);
  const [takenOn, setTakenOn] = useState(entry.photoTakenOn);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fallback, setFallback] = useState(entry.fallback);
  const [promptText, setPromptText] = useState(entry.prompt || prompt);
  const [reflection, setReflection] = useState(entry.reflection);
  const [mood, setMood] = useState(entry.mood);
  const [completed, setCompleted] = useState(entry.completed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const lines = factLines(facts);
  const dateNote = photoDateNote(takenOn, date);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const prepared = await preparePhoto(file);
      const form = new FormData();
      form.set("photo", new File([prepared.blob], "photo.jpg", { type: "image/jpeg" }));
      form.set("date", date);
      form.set("takenOn", prepared.takenOn ?? "");
      const res = await fetch("/api/journal/photo", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "That photo couldn’t be saved. Try again.");
        return;
      }
      setLocalPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(prepared.blob);
      });
      setEntryId(body.id ?? entryId);
      setHasPhoto(true);
      setPhotoKey((k) => k + 1);
      setTakenOn(prepared.takenOn);
      setFallback(null);
    } catch {
      setMessage("That photo couldn’t be read. Try another one.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const save = (finish: boolean) =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveJournalAction(date, { reflection, mood, prompt: promptText, fallback, finish });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (finish) setCompleted(true);
      setMessage(finish ? "Saved. Goodnight." : "Saved as a draft. You can finish it until noon tomorrow.");
    });

  return (
    <div className="space-y-4">
      {lines.length > 0 && (
        <ul className="space-y-1 rounded-md bg-neutral-800/60 px-3 py-3 text-sm text-neutral-300">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        {hasPhoto ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated route; not optimizable */}
            <img
              key={photoKey}
              src={localPreview ?? `/api/journal/photo/${entryId}`}
              alt="Your photo for this day"
              className="max-h-80 w-full rounded-md object-cover"
            />
            {dateNote && <p className="text-sm text-neutral-400">{dateNote}</p>}
          </div>
        ) : fallback === "weather" && facts.weather ? (
          <p className="rounded-md bg-neutral-800/60 px-3 py-6 text-center text-sm text-neutral-300">
            {facts.weather.summary} · {Math.round(facts.weather.high)}° / {Math.round(facts.weather.low)}°
            {facts.place ? ` · ${facts.place.name}` : ""}
          </p>
        ) : fallback === "map" && facts.place ? (
          <iframe
            title={`Map of ${facts.place.name}`}
            src={mapSrc(facts.place)}
            className="h-52 w-full rounded-md border-0"
            loading="lazy"
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            id={`journal-photo-${date}`}
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <label
            htmlFor={`journal-photo-${date}`}
            className={`${chip} inline-flex cursor-pointer items-center border-neutral-600 text-neutral-200 ${busy ? "opacity-60" : ""}`}
          >
            {busy ? "Saving photo…" : hasPhoto ? "Choose a different photo" : "Pick a photo"}
          </label>
          {hasPhoto && (
            <button
              type="button"
              disabled={pending || busy}
              className={`${chip} border-neutral-700 text-neutral-300 disabled:opacity-60`}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeJournalPhotoAction(date);
                  if (result.ok) {
                    setHasPhoto(false);
                    setLocalPreview(null);
                    setTakenOn(null);
                  } else setMessage(result.error);
                })
              }
            >
              Remove photo
            </button>
          )}
        </div>

        {!hasPhoto && (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500">No photo tonight? Use the weather or a map instead.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={fallback === "weather"}
                disabled={!facts.weather}
                onClick={() => setFallback(fallback === "weather" ? null : "weather")}
                className={`${chip} disabled:opacity-50 ${fallback === "weather" ? "border-neutral-300 text-neutral-100" : "border-neutral-700 text-neutral-300"}`}
              >
                Weather
              </button>
              <button
                type="button"
                aria-pressed={fallback === "map"}
                disabled={!facts.place}
                onClick={() => setFallback(fallback === "map" ? null : "map")}
                className={`${chip} disabled:opacity-50 ${fallback === "map" ? "border-neutral-300 text-neutral-100" : "border-neutral-700 text-neutral-300"}`}
              >
                Map
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor={`journal-text-${date}`} className="block text-sm font-medium text-neutral-200">
          {promptText}
        </label>
        {hasSpark && (
          <button
            type="button"
            onClick={() => setPromptText(promptText === SPARK_PROMPT ? prompt : SPARK_PROMPT)}
            className="tap text-left text-xs text-neutral-500 underline"
          >
            {promptText === SPARK_PROMPT ? "Use tonight’s usual prompt" : `Or: ${SPARK_PROMPT}`}
          </button>
        )}
        <textarea
          id={`journal-text-${date}`}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          maxLength={1500}
          rows={4}
          placeholder="A line or two is plenty (optional)"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs text-neutral-500">How did it feel? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mood === m.id}
              onClick={() => setMood(mood === m.id ? null : m.id)}
              className={`${chip} ${mood === m.id ? "border-neutral-300 text-neutral-100" : "border-neutral-700 text-neutral-300"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || busy}
          onClick={() => save(true)}
          className="min-h-11 rounded-md bg-neutral-100 px-4 font-medium text-neutral-900 disabled:opacity-60"
        >
          {completed ? "Saved ✓" : "Finish entry"}
        </button>
        {!completed && (
          <button
            type="button"
            disabled={pending || busy}
            onClick={() => save(false)}
            className="min-h-11 rounded-md border border-neutral-700 px-4 text-neutral-300 disabled:opacity-60"
          >
            Save for later
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm text-neutral-400">
          {message}
        </p>
      )}
    </div>
  );
}
