"use client";

import { useEffect, useState } from "react";

/**
 * Displays the current date and time from the user's PC clock. Updates every second.
 */
export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="shrink-0 text-sm text-muted-foreground tabular-nums"
      title={now.toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" })}
    >
      {now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })}{" "}
      {now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </span>
  );
}
