"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** How long the open loan has been drawn, ticking each second. Starts from the draw's block time. */
export function OpenClock({ since }: { since: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="num" aria-label="Time the loan has been open">
      {formatDuration(Math.max(0, now - since))}
    </span>
  );
}
