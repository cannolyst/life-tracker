"use client";

import { useEffect, useState } from "react";

function minutesNow(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

// `initialOn` comes from the server so the page is already warm on first
// paint; after that the veil follows the clock in the user's own time zone.
export function EveningVeil({
  initialOn,
  tz,
  shutdownStartMinutes,
  launchStartMinutes,
}: {
  initialOn: boolean;
  tz: string;
  shutdownStartMinutes: number;
  launchStartMinutes: number;
}) {
  const [on, setOn] = useState(initialOn);

  useEffect(() => {
    const update = () => {
      const m = minutesNow(tz);
      setOn(m >= shutdownStartMinutes || m < launchStartMinutes);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [tz, shutdownStartMinutes, launchStartMinutes]);

  return <div className="evening-veil" data-on={on} aria-hidden="true" />;
}
