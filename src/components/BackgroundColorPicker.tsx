"use client";

import { useTransition } from "react";
import { setBackgroundColor } from "@/app/theme-actions";
import { BACKGROUND_COLORS, type BackgroundColor } from "@/lib/backgroundColors";

const SWATCH_HEX: Record<BackgroundColor, string> = {
  pink: "#f5dee7",
  green: "#dcefdf",
  blue: "#dde8f5",
  purple: "#e7dff2",
  yellow: "#f6f0d9",
  orange: "#f6e4d3",
};

export function BackgroundColorPicker({ color }: { color: BackgroundColor }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      {BACKGROUND_COLORS.map((option) => {
        const active = option === color;
        return (
          <button
            key={option}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => setBackgroundColor(option))}
            aria-label={option}
            aria-pressed={active}
            className={`h-9 w-9 rounded-full border-2 transition disabled:opacity-60 ${
              active ? "border-neutral-100" : "border-transparent hover:border-neutral-600"
            }`}
            style={{ backgroundColor: SWATCH_HEX[option] }}
          />
        );
      })}
    </div>
  );
}
