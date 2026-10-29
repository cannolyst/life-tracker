"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/logout-actions";
import { Sparkle } from "@/components/Sparkle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { JEWELS } from "@/lib/jewels";

type NavLink = { href: string; label: string; group?: "hub" | "tab" };

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// On wide screens: a fixed left sidebar with every page, the current one highlighted.
function Sidebar({ links, theme }: { links: NavLink[]; theme: "light" | "dark" }) {
  const pathname = usePathname();
  const hub = [{ href: "/", label: "Home" }, ...links.filter((l) => l.group === "hub")];
  const tabs = links.filter((l) => l.group !== "hub");
  const item = (link: { href: string; label: string }) => (
    <Link
      key={link.href}
      href={link.href}
      aria-current={isActive(pathname, link.href) ? "page" : undefined}
      className={`flex min-h-10 items-center rounded-md px-3 text-sm ${
        isActive(pathname, link.href)
          ? "bg-neutral-800 font-medium text-neutral-100"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      {link.label}
    </Link>
  );

  return (
    <aside
      aria-label="Pages"
      className="app-sidebar font-display fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-1 overflow-y-auto border-r border-neutral-800 bg-neutral-900 px-3 py-4 lg:flex"
    >
      <Link href="/" className="mb-3 flex min-h-11 items-center gap-1.5 px-3 text-lg font-semibold text-neutral-100">
        <Sparkle className="h-4 w-4" color={JEWELS[0].color} />
        Life Tracker
      </Link>
      {hub.map(item)}
      {tabs.length > 0 && <div className="my-2 border-t border-neutral-800" />}
      {tabs.map(item)}
      <div className="my-2 border-t border-neutral-800" />
      {item({ href: "/guide", label: "Guide" })}
      {item({ href: "/settings", label: "Settings" })}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-800 px-3 pt-3">
        <form action={logout}>
          <button type="submit" className="min-h-10 text-sm text-neutral-400 hover:text-neutral-100">
            Sign out
          </button>
        </form>
        <ThemeToggle compact theme={theme} />
      </div>
    </aside>
  );
}

export function NavClient({
  links,
  theme,
}: {
  links: NavLink[];
  theme: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
    <Sidebar links={links} theme={theme} />
    <header className="relative border-b border-neutral-800 lg:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-display flex min-h-11 items-center gap-1.5 text-lg font-semibold text-neutral-100"
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
          <Link href="/guide" className="text-neutral-400 hover:text-neutral-100">
            Guide
          </Link>
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
          className="flex h-11 w-11 items-center justify-center rounded-md text-xl text-neutral-400 hover:text-neutral-100 sm:hidden"
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
              href="/guide"
              onClick={() => setOpen(false)}
              className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
            >
              Guide
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
            >
              Settings
            </Link>
          </div>
          <div className="border-t border-neutral-800 pt-3">
            <form action={logout}>
              <button type="submit" className="font-display text-left text-neutral-300">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
    </>
  );
}
