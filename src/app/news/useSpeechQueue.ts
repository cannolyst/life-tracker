"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkForSpeech } from "@/lib/brief";

// One thing to read aloud (a story, or one beat of the brief). It is spoken
// as several sentence-sized chunks; skip jumps over the whole entry.
export type SpeechEntry = {
  text: string;
  label: string;
  // Fires once, when this entry starts being read.
  onStart?: () => void;
};

type Chunk = { text: string; entry: number };
type Status = "idle" | "playing" | "paused";

export function useSpeechQueue() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [current, setCurrent] = useState<{ label: string; position: number; total: number } | null>(null);

  const entries = useRef<SpeechEntry[]>([]);
  const chunks = useRef<Chunk[]>([]);
  const index = useRef(0);
  const startedEntry = useRef(-1);
  // Bumped on every play/skip/stop so callbacks from a cancelled utterance
  // can tell they're stale and do nothing.
  const run = useRef(0);

  useEffect(() => {
    setSupported("speechSynthesis" in window);
    return () => {
      run.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakAt = useCallback(function speakAt(runId: number) {
    if (runId !== run.current) return;
    const chunk = chunks.current[index.current];
    if (!chunk) {
      setStatus("idle");
      setCurrent(null);
      return;
    }

    if (chunk.entry !== startedEntry.current) {
      startedEntry.current = chunk.entry;
      const entry = entries.current[chunk.entry];
      entry.onStart?.();
      setCurrent({ label: entry.label, position: chunk.entry + 1, total: entries.current.length });
    }
    setStatus("playing");

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    const advance = () => {
      if (runId !== run.current) return;
      index.current += 1;
      speakAt(runId);
    };
    utterance.onend = advance;
    utterance.onerror = (event) => {
      // A deliberate cancel() is reported as an error; anything else just
      // moves on to the next chunk rather than getting stuck.
      if (event.error === "canceled" || event.error === "interrupted") return;
      advance();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const play = useCallback(
    (items: SpeechEntry[]) => {
      if (!("speechSynthesis" in window) || items.length === 0) return;
      run.current += 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      entries.current = items;
      chunks.current = items.flatMap((entry, i) =>
        chunkForSpeech(entry.text).map((text) => ({ text, entry: i })),
      );
      index.current = 0;
      startedEntry.current = -1;
      speakAt(run.current);
    },
    [speakAt],
  );

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setStatus("playing");
  }, []);

  const skip = useCallback(() => {
    run.current += 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const currentEntry = chunks.current[index.current]?.entry ?? -1;
    while (index.current < chunks.current.length && chunks.current[index.current].entry === currentEntry) {
      index.current += 1;
    }
    speakAt(run.current);
  }, [speakAt]);

  const stop = useCallback(() => {
    run.current += 1;
    window.speechSynthesis?.cancel();
    entries.current = [];
    chunks.current = [];
    setStatus("idle");
    setCurrent(null);
  }, []);

  return { supported, status, current, play, pause, resume, skip, stop };
}
