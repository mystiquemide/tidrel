"use client";

import { useEffect, useRef, useState } from "react";
import type { Address, EIP1193Provider } from "viem";
import { explorerTx } from "@/lib/chain";
import { browserAdapter } from "@/lib/kit";
import { formatDuration, formatFixed, formatUsdc } from "@/lib/format";
import type { Settlement } from "@/lib/history";
import { type Position } from "@/lib/position";
import { readPositionOnServer } from "@/lib/positionRead";
import {
  executeRepay,
  kitRepayDeps,
  planRepay,
  quoteRepay,
  RepayRefusalError,
  type RepayOutcome,
  type RepayPlan,
} from "@/lib/repay";
import { describeError } from "@/lib/settleFlow";

type Props = {
  open: boolean;
  address: Address;
  provider: EIP1193Provider;
  settlements: Settlement[];
  /** Shown first in the amount box, for example what just arrived. Capped at the debt and the wallet. */
  suggestedUsdc?: string;
  onClose: () => void;
  onChanged: () => void;
};

const field =
  "w-full rounded-cell border border-mist bg-porcelain px-3.5 py-3 text-[16px] text-ink transition-colors placeholder:text-slate hover:border-ash/60 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/25 disabled:opacity-60";
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-pill bg-violet px-6 text-[16px] font-medium text-porcelain transition-colors hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-small text-graphite">{label}</dt>
      <dd className="num text-right text-small text-ink">{value}</dd>
    </div>
  );
}

/** Repay the open loan. The default is the smaller of the wallet's USDC and the debt; collateral stays posted. */
export function RepaySheet({ open, address, provider, settlements, suggestedUsdc, onClose, onChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  // The parent gives this sheet a new key per opening, so the suggestion seeds a fresh box.
  const [amount, setAmount] = useState(suggestedUsdc ?? "");
  const [planned, setPlanned] = useState<{ key: string; plan: RepayPlan | null; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ outcome: RepayOutcome; openSeconds: number | null; interest: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // A fresh read each time the sheet opens, and the suggested amount goes into the box.
  useEffect(() => {
    if (!open) return;
    let live = true;
    readPositionOnServer(address)
      .then((p) => {
        if (!live) return;
        setPosition(p);
        setPositionError(null);
      })
      .catch((e) => live && setPositionError(e instanceof Error ? e.message : "unknown reason"));
    return () => {
      live = false;
    };
  }, [open, address, epoch]);

  const key = JSON.stringify([amount.trim(), position?.blockNumber?.toString(), position?.debtUsdc, position?.walletUsdc]);

  useEffect(() => {
    if (!open || !position || done) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const plan = await planRepay(
          position,
          amount.trim() ? { amountUsdc: amount.trim() } : {},
          { quoteRepay, newKey: () => crypto.randomUUID() },
        );
        if (live) setPlanned({ key, plan, error: false });
      } catch {
        if (live) setPlanned({ key, plan: null, error: true });
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, position, amount, key, done]);

  const current = planned?.key === key ? planned : null;
  const plan = current?.plan ?? null;
  const canRepay = !!plan && !plan.refusal && !busy && !done;

  async function repay() {
    if (!plan || plan.refusal || !position) return;
    setBusy(true);
    setFailure(null);
    try {
      const outcome = await executeRepay(plan, kitRepayDeps(browserAdapter(provider) as never, address));
      const drawTimes = settlements
        .filter((s) => (s.state === "open" || s.state === "drawn-not-settled") && s.drawAt !== null)
        .map((s) => s.drawAt as number);
      setDone({
        outcome,
        openSeconds: drawTimes.length ? Math.max(0, Math.floor(Date.now() / 1000) - Math.min(...drawTimes)) : null,
        interest: position.accruedInterestUsdc,
      });
      onChanged();
    } catch (e) {
      setFailure(e instanceof RepayRefusalError ? e.message : describeError(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setFailure(null);
    setPlanned(null);
    setPosition(null);
    setEpoch((n) => n + 1);
  }

  const noLoanYet = plan?.refusal === "NO_LOAN" && Number(position?.debtUsdc ?? 0) > 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="repay-title"
      onClose={() => {
        if (done) reset();
        onClose();
      }}
      onCancel={(e) => busy && e.preventDefault()}
      className="card m-auto max-h-[100svh] w-full max-w-[100vw] overflow-y-auto rounded-none p-0 text-ink sm:max-h-[92svh] sm:w-[min(94vw,520px)] sm:rounded-card"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="repay-title" className="text-h3 font-medium tracking-[-0.02em]">
            Repay
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-graphite hover:text-ink disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="mt-8" role="status">
            <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-violet-tint text-violet" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10.5l4 4 8-9" />
              </svg>
            </span>
            <p className="mt-4 text-[22px] leading-tight font-medium tracking-[-0.01em] text-ink">Repaid</p>
            {done.openSeconds !== null && (
              <p className="mt-2 text-[16px] text-graphite">
                Open <span className="num">{formatDuration(done.openSeconds)}</span>, cost{" "}
                <span className="num">{formatUsdc(done.interest, 6)} USDC</span>.
              </p>
            )}
            {done.outcome.dust && (
              <p className="mt-3 text-small text-graphite">
                A sliver of debt, <span className="num">{formatFixed(done.outcome.remainingDebtUsdc, 6)} USDC</span>, is left that a repay
                cannot clear. Your collateral stays posted.
              </p>
            )}
            <p className="mt-5 rounded-cell border border-mist bg-cloud px-4 py-3 text-small">
              <a
                href={explorerTx(done.outcome.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-input text-violet underline decoration-violet/40 underline-offset-4 hover:decoration-violet"
              >
                See the repay on Arc mainnet
              </a>
            </p>
            <div className="mt-8">
              <button type="button" onClick={onClose} className="h-12 w-full rounded-pill bg-cloud px-6 text-[16px] font-medium text-ink transition-colors hover:bg-mist">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (canRepay) void repay();
            }}
          >
            <dl className="divide-y divide-mist rounded-cell border border-mist bg-cloud px-4">
              <Line label="Borrowed now" value={position ? `${formatUsdc(position.debtUsdc, 2)} USDC` : "Reading"} />
              <Line label="In your wallet" value={position ? `${formatUsdc(position.walletUsdc, 2)} USDC` : "Reading"} />
            </dl>

            <label htmlFor="repay-amount" className="mt-6 block text-small font-medium text-graphite">
              Amount to repay
            </label>
            <input
              id="repay-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              placeholder={plan && !plan.refusal ? plan.repayUsdc : "Everything you can"}
              inputMode="decimal"
              autoComplete="off"
              className={`${field} num mt-2`}
            />
            <p className="mt-2 text-caption text-slate">
              Leave it empty to repay the smaller of your USDC and the debt. Your collateral stays posted.
            </p>

            <dl className="mt-6 divide-y divide-mist rounded-cell border border-mist bg-cloud px-4">
              {plan && !plan.refusal ? (
                <>
                  <Line label="Repaying" value={`${formatUsdc(plan.repayUsdc, 2)} USDC`} />
                  <Line
                    label="Debt after"
                    value={`${formatUsdc(String(Math.max(0, Number(plan.debtUsdc) - Number(plan.repayUsdc))), 2)} USDC`}
                  />
                  {plan.resultingHealth !== null && !plan.fullRepay && (
                    <Line label="Health after" value={plan.resultingHealth.toFixed(2)} />
                  )}
                </>
              ) : (
                <p className="py-4 text-small text-slate">
                  {positionError
                    ? `Your loan did not load from Arc mainnet (${positionError}). Try again in a moment.`
                    : !position
                      ? "Reading your loan."
                      : current?.error
                        ? "Circle's Borrow service did not return a quote. Try again in a moment."
                        : !current
                          ? "Reading what this will take."
                          : "Check the amount above to see the repay."}
                </p>
              )}
            </dl>

            {plan?.refusal && (
              <p role="alert" className="mt-4 text-small text-warn">
                {noLoanYet
                  ? "Circle's Borrow service has not caught up with your loan yet. Try again in a moment."
                  : plan.detail}
              </p>
            )}
            {failure && (
              <p role="alert" className="mt-4 text-small text-warn">
                {failure}{/nothing was (sent|moved|repaid)/i.test(failure) ? "" : " Nothing was repaid."}
              </p>
            )}

            <div className="mt-6">
              <button type="submit" disabled={!canRepay} className={primary}>
                {busy ? "Repaying" : plan && !plan.refusal ? "Repay" : "Repay"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
