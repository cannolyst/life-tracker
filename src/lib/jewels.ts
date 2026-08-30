// The five jewel tones from tracker-app's original goal/category colors,
// tuned for a light ("paper") background — used directly since this app
// now shares that same cream theme.
export const JEWELS = [
  { name: "amethyst", color: "#6E4E93", soft: "#F0EBF5" },
  { name: "sapphire", color: "#33578F", soft: "#E8EEF5" },
  { name: "emerald", color: "#2E7D5C", soft: "#E7F2EC" },
  { name: "ruby", color: "#A2314F", soft: "#F6E9EC" },
  { name: "gold", color: "#A9822E", soft: "#F5EFDD" },
] as const;

export const NEUTRAL_JEWEL = { name: "none", color: "#8B8394", soft: "#EFEDF1" };

export function jewelFor(index: number) {
  return JEWELS[((index % JEWELS.length) + JEWELS.length) % JEWELS.length];
}

// A soft pastel background + solid text pair for a "done"/"active" chip.
export function jewelChipStyle(jewel: { color: string; soft: string }) {
  return {
    backgroundColor: jewel.soft,
    borderColor: jewel.color,
    color: jewel.color,
  };
}
