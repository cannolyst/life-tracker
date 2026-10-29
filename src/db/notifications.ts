import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "./index";
import { notificationLog, pushSubscriptions } from "./schema";
import type { PushMessage } from "@/lib/notifications";

export type PushKeys = { endpoint: string; p256dh: string; auth: string };

export async function saveSubscription(userId: string, keys: PushKeys, userAgent: string): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({ userId, ...keys, userAgent: userAgent.slice(0, 300) })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      // The same device signing in as someone else takes the subscription over.
      set: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent.slice(0, 300) },
    });
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function countSubscriptions(userId: string): Promise<number> {
  const rows = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return rows.length;
}

export async function subscribedUserIds(): Promise<string[]> {
  const rows = await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions);
  return rows.map((r) => r.userId);
}

// Claims a kind for a day. False means it already went out (or is being sent).
export async function claimNotification(userId: string, kind: string, date: string): Promise<boolean> {
  const rows = await db
    .insert(notificationLog)
    .values({ userId, kind, date })
    .onConflictDoNothing()
    .returning({ id: notificationLog.id });
  return rows.length > 0;
}

export async function releaseNotification(userId: string, kind: string, date: string): Promise<void> {
  await db
    .delete(notificationLog)
    .where(and(eq(notificationLog.userId, userId), eq(notificationLog.kind, kind), eq(notificationLog.date, date)));
}

function configured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// Sends to every device of one user. Devices the push service says are gone
// (404/410) are forgotten. Returns how many devices accepted it.
export async function sendToUser(userId: string, message: PushMessage): Promise<number> {
  if (!configured()) return 0;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const gone: string[] = [];
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
          { TTL: 60 * 60 * 2, urgency: "normal" },
        );
        delivered += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.endpoint);
        else console.warn("[push] send failed", status ?? error);
      }
    }),
  );
  if (gone.length > 0) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, gone));
  return delivered;
}
