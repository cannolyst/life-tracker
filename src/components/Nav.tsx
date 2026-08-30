import Link from "next/link";
import { logout } from "@/app/logout-actions";

export function Nav() {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-neutral-100">
          Life Tracker
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/points" className="text-neutral-400 hover:text-neutral-100">
            Points
          </Link>
          <Link href="/cleaning" className="text-neutral-400 hover:text-neutral-100">
            Cleaning
          </Link>
          <Link href="/finance" className="text-neutral-400 hover:text-neutral-100">
            Finance
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-neutral-400 hover:text-neutral-100"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
