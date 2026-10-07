"use client";

import { formatUsdcTight } from "@/lib/format";

/** Tells you when USDC lands in the wallet while a loan is open, with the repay one tap away. */
export function ArrivalToast({
  arrivedUsdc,
  repayUsdc,
  onRepay,
  onDismiss,
}: {
  arrivedUsdc: string;
  repayUsdc: string;
  onRepay: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="card fixed inset-x-4 bottom-24 z-40 p-5 text-text shadow-2xl shadow-black/50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
    >
      <p className="text-[16px] text-text">
        <span className="num">{formatUsdcTight(arrivedUsdc)} USDC</span> arrived. Repay{" "}
        <span className="num">{formatUsdcTight(repayUsdc)} USDC</span> now?
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onRepay}
          className="inline-flex flex-1 items-center justify-center rounded-pill bg-tide px-5 py-3 text-[14px] font-medium text-ink hover:brightness-95"
        >
          Repay
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center justify-center rounded-pill bg-ink px-5 py-3 text-[14px] font-medium text-ebb hover:bg-line hover:text-text"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
