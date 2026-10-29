"use server";

import { headers } from "next/headers";
import { requireUserId } from "@/lib/session";
import { removeSubscription, saveSubscription, sendToUser } from "@/db/notifications";

type Result = { ok: true } | { ok: false; error: string };

export async function subscribePushAction(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<Result> {
  const userId = await requireUserId();
  if (!sub.endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "That device couldn’t be registered." };
  }
  const userAgent = (await headers()).get("user-agent") ?? "";
  await saveSubscription(userId, { endpoint: sub.endpoint, ...sub.keys }, userAgent);
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<Result> {
  const userId = await requireUserId();
  await removeSubscription(userId, endpoint);
  return { ok: true };
}

export async function sendTestPushAction(): Promise<Result> {
  const userId = await requireUserId();
  const delivered = await sendToUser(userId, {
    title: "Life Tracker",
    body: "Notifications are working. Nothing else to do.",
    url: "/settings",
    tag: "test",
  });
  return delivered > 0
    ? { ok: true }
    : { ok: false, error: "Nothing was delivered. Try turning notifications off and on again." };
}
