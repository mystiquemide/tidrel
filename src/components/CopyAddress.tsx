"use client";

import { useState } from "react";

/** Copies a full address. The label flips for a moment so the click is never silent. */
export function CopyAddress({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
      aria-label={done ? "Address copied" : "Copy full address"}
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-caption text-ebb transition-colors hover:border-muted hover:text-text"
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {done ? <path d="M4 10.5l4 4 8-9" /> : <><rect x="7" y="7" width="9" height="9" rx="2" /><path d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" /></>}
      </svg>
      <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}
