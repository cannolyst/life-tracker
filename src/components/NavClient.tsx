"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/logout-actions";
import { Sparkle } from "@/components/Sparkle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JEWELS } from "@/lib/jewels";

export function NavClient({
  links,
  theme,
}: {
  links: { href: string; label: string }[];
  theme: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display flex items-center gap-1.5 text-lg font-semibold text-neutral-100"
          onClick={() => setOpen(false)}
        >
          <Sparkle className="h-4 w-4" color={JEWELS[0].color} />
          Life Tracker
        </Link>

        <nav className="font-display hidden items-center gap-4 text-sm sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-400 hover:text-neutral-100"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/settings" className="text-neutral-400 hover:text-neutral-100">
            Settings
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="font-display text-neutral-400 hover:text-neutral-100"
            >
              Sign out
            </button>
          </form>
          <ThemeToggle compact theme={theme} />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-xl text-neutral-400 hover:text-neutral-100 sm:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="font-display flex flex-col gap-4 border-t border-neutral-800 px-4 py-4 text-sm sm:hidden">
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
            >
              Settings
            </Link>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
            <form action={logout}>
              <button type="submit" className="font-display text-left text-neutral-300">
                Sign out
              </button>
            </form>
            <div className="flex items-center gap-2">
              <span className="font-display text-neutral-300">Appearance</span>
              <ThemeToggle theme={theme} />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
