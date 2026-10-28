import type { DayStructure } from "./userSettingsDefaults";

export type BlockId = "launch" | "work" | "transition" | "evening" | "shutdown";

export type DayBlock = {
  id: BlockId;
  label: string;
  startMinutes: number;
  endMinutes: number;
};

const MINUTES_PER_DAY = 24 * 60;

// The five parts of the day, built from the user's own Settings times.
// Transition runs from the end of work to the start of evening; a block with
// no length (work ends exactly when evening starts) is left out.
export function dayBlocks(d: DayStructure): DayBlock[] {
  const all: DayBlock[] = [
    { id: "launch", label: "Launch", startMinutes: d.launchStartMinutes, endMinutes: d.workStartMinutes },
    { id: "work", label: "Work", startMinutes: d.workStartMinutes, endMinutes: d.workEndMinutes },
    { id: "transition", label: "Transition", startMinutes: d.workEndMinutes, endMinutes: d.eveningStartMinutes },
    { id: "evening", label: "Evening", startMinutes: d.eveningStartMinutes, endMinutes: d.shutdownStartMinutes },
    { id: "shutdown", label: "Shutdown", startMinutes: d.shutdownStartMinutes, endMinutes: MINUTES_PER_DAY },
  ];
  return all.filter((b) => b.endMinutes > b.startMinutes);
}

/** The block a time of day falls in, or null in the small hours before Launch begins. */
export function currentBlock(d: DayStructure, minutes: number): DayBlock | null {
  return dayBlocks(d).find((b) => minutes >= b.startMinutes && minutes < b.endMinutes) ?? null;
}

/** 0 → "12:00 am", 960 → "4:00 pm". */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** True from the start of Shutdown until the next morning's Launch — the "darker, warmer" hours. */
export function isEveningTone(d: DayStructure, minutes: number): boolean {
  return minutes >= d.shutdownStartMinutes || minutes < d.launchStartMinutes;
}
