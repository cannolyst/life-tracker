"use client";

import { useEffect, useState, useTransition } from "react";
import { sendTestPushAction, subscribePushAction, unsubscribePushAction } from "./push-actions";

type Status = "checking" | "unsupported" | "needs-install" | "blocked" | "off" | "on";

const button = "min-h-11 rounded-md border border-neutral-700 px-4 text-sm text-neutral-200 disabled:opacity-60";

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

async function currentStatus(): Promise<Status> {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  // iPhone only allows push once the app is on the Home Screen.
  if (isIos && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return existing ? "on" : "off";
}

// Turn notifications on or off for this device, and send a test.
export function PushSetup() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    currentStatus()
      .then((next) => live && setStatus(next))
      .catch(() => live && setStatus("unsupported"));
    return () => {
      live = false;
    };
  }, []);

  const turnOn = () =>
    startTransition(async () => {
      setMessage(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const sub =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
          }));
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
        const result = await subscribePushAction(json);
        if (result.ok) setStatus("on");
        else setMessage(result.error);
      } catch {
        setMessage("Notifications couldn’t be turned on here.");
      }
    });

  const turnOff = () =>
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMessage(null);
    });

  const test = () =>
    startTransition(async () => {
      const result = await sendTestPushAction();
      setMessage(result.ok ? "Sent. It should arrive in a moment." : result.error);
    });

  return (
    <div className="space-y-3">
      {status === "checking" && <p className="text-sm text-neutral-500">Checking this device…</p>}
      {status === "unsupported" && (
        <p className="text-sm text-neutral-400">This browser can’t receive notifications.</p>
      )}
      {status === "needs-install" && (
        <p className="text-sm text-neutral-400">
          On iPhone, notifications work once the app is on your Home Screen. In Safari, tap the Share button, choose
          Add to Home Screen, then open Life Tracker from there and come back to this page.
        </p>
      )}
      {status === "blocked" && (
        <p className="text-sm text-neutral-400">
          Notifications are blocked for this app. Allow them in your phone’s Settings, then try again.
        </p>
      )}
      {status === "off" && (
        <button type="button" onClick={turnOn} disabled={pending} className={button}>
          Turn on notifications for this device
        </button>
      )}
      {status === "on" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={test} disabled={pending} className={button}>
            Send a test
          </button>
          <button type="button" onClick={turnOff} disabled={pending} className={button}>
            Turn off for this device
          </button>
        </div>
      )}
      {status === "on" && <p className="text-xs text-neutral-500">Notifications are on for this device.</p>}
      {message && (
        <p role="status" className="text-sm text-neutral-400">
          {message}
        </p>
      )}
    </div>
  );
}
