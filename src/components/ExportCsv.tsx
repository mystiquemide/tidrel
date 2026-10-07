"use client";

import { settlementsToCsv } from "@/lib/csv";
import type { Settlement } from "@/lib/history";

/** Downloads the settlements as a CSV file, built in the browser from what is on screen. */
export function ExportCsv({ rows, name }: { rows: Settlement[]; name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = URL.createObjectURL(new Blob([settlementsToCsv(rows)], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `tidrel-${name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="inline-flex h-9 items-center rounded-pill bg-cloud px-4 text-small font-medium text-ink transition-colors hover:bg-mist"
    >
      Export CSV
    </button>
  );
}
