"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionState } from "./actions";
import { Sparkle } from "@/components/Sparkle";
import { JEWELS } from "@/lib/jewels";

const initialState: ActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6"
      >
        <h1 className="flex items-center gap-1.5 text-lg font-semibold text-neutral-100">
          <Sparkle className="h-4 w-4" color={JEWELS[0].color} />
          Life Tracker
        </h1>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-neutral-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-neutral-400">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-neutral-300 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
