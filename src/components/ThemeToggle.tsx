"use client";

import { useTransition } from "react";
import { setTheme } from "@/app/theme-actions";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function ThemeToggle({
  theme,
  compact = false,
}: {
  theme: "light" | "dark";
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const toggle = (next: "light" | "dark") => {
    if (next === theme || isPending) return;
    startTransition(() => setTheme(next));
  };

  if (compact) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => toggle(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="flex items-center text-neutral-400 hover:text-neutral-100 disabled:opacity-60"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <div className="inline-flex gap-2 rounded-md bg-neutral-800 p-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => toggle("light")}
        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
          theme === "light" ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"
        }`}
      >
        <SunIcon /> Light
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => toggle("dark")}
        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${
          theme === "dark" ? "bg-neutral-100 text-neutral-900" : "text-neutral-300"
        }`}
      >
        <MoonIcon /> Dark
      </button>
    </div>
  );
}
