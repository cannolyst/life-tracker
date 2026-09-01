"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/app/logout-actions";

const LINKS = [
  { href: "/points", label: "Points" },
  { href: "/cleaning", label: "Cleaning" },
  { href: "/finance", label: "Finance" },
  { href: "/lists", label: "Lists" },
  { href: "/todo", label: "To-do" },
  { href: "/year-review", label: "Year in review" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold text-neutral-100" onClick={() => setOpen(false)}>
          Life Tracker
        </Link>

        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-400 hover:text-neutral-100"
            >
              {link.label}
            </Link>
          ))}
          <form action={logout}>
            <button type="submit" className="text-neutral-400 hover:text-neutral-100">
              Sign out
            </button>
          </form>
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
        <nav className="flex flex-col border-t border-neutral-800 px-4 text-sm sm:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-neutral-800 py-3 text-neutral-300 last:border-b-0"
            >
              {link.label}
            </Link>
          ))}
          <form action={logout}>
            <button type="submit" className="w-full py-3 text-left text-neutral-300">
              Sign out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
