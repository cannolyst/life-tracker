"use client";

import { useState, useTransition } from "react";
import { buttonClass, labelClass } from "@/components/ui";
import { generateBriefToken } from "./brief-actions";

export function BriefLinkCard({ createdLabel }: { createdLabel: string | null }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasLink = createdLabel !== null || url !== null;

  function generate() {
    if (
      hasLink &&
      !confirm("Make a new link? Your current link (and any Shortcut using it) will stop working.")
    ) {
      return;
    }
    startTransition(async () => {
      const { token } = await generateBriefToken();
      setUrl(`${window.location.origin}/api/brief?format=speech&token=${token}`);
      setCopied(false);
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        A private link that returns your daily brief as plain text, so an iPhone Shortcut can read it
        aloud when your alarm goes off. Anyone with the link can hear your brief, so keep it to yourself.
      </p>

      {url ? (
        <div className="space-y-2">
          <p className={labelClass}>Your link — shown once, copy it now</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none"
            />
            <button type="button" onClick={copy} className={buttonClass}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        hasLink && <p className="text-sm text-neutral-500">A link is active (created {createdLabel}).</p>
      )}

      <button type="button" onClick={generate} disabled={pending} className={buttonClass}>
        {pending ? "Generating..." : hasLink ? "Make a new link" : "Generate link"}
      </button>

      <details className="text-sm text-neutral-400">
        <summary className="cursor-pointer text-neutral-300">Set up the alarm Shortcut</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the Shortcuts app, go to Automation, and tap New Automation.</li>
          <li>Choose Alarm, pick the alarm, and select “Is Stopped” (or “Goes Off”).</li>
          <li>Add the action “Get Contents of URL” and paste your link as the URL (method GET).</li>
          <li>Add “Speak Text” and set its text to the Contents of URL result.</li>
          <li>Choose “Run Immediately”, then turn off “Notify When Run”.</li>
        </ol>
      </details>
    </div>
  );
}
