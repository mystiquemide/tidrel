"use client";

import { useEffect, useRef, useState } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { arcChain, explorerTx } from "@/lib/chain";
import { publicClient } from "@/lib/client";
import {
  CollateralRefusalError,
  directCollateralDeps,
  executeCollateral,
  kitCollateralDeps,
  planCollateral,
  quoteCollateral,
  type CollateralMode,
  type CollateralPlan,
} from "@/lib/collateral";
import { formatFixed, formatUsdc } from "@/lib/format";
import { browserAdapter } from "@/lib/kit";
import { readPosition, type Position } from "@/lib/position";
import { describeError } from "@/lib/settleFlow";

type Props = {
  open: boolean;
  address: Address;
  provider: EIP1193Provider;
  onClose: () => void;
  onChanged: () => void;
};

const field =
  "w-full rounded-cell border border-mist bg-porcelain px-3.5 py-3 text-[16px] text-ink transition-colors placeholder:text-slate hover:border-ash/60 focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet/25 disabled:opacity-60";
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-pill bg-violet px-6 text-[16px] font-medium text-porcelain transition-colors hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40";

const COPY: Record<CollateralMode, { tab: string; title: string; hint: string; cta: string; busy: string; done: string }> = {
  add: {
    tab: "Add",
    title: "Add collateral",
    hint: "Posts more cirBTC against your open loan. Health goes up and the liquidation price moves further away.",
    cta: "Add collateral",
    busy: "Adding",
    done: "Collateral added",
  },
  withdraw: {
    tab: "Withdraw",
    title: "Withdraw collateral",
    hint: "Releases cirBTC back to your wallet. If you owe USDC, a small repayment may be bundled in to keep the loan healthy.",
    cta: "Withdraw collateral",
    busy: "Withdrawing",
    done: "Collateral withdrawn",
  },
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-small text-graphite">{label}</dt>
      <dd className="num text-right text-small text-ink">{value}</dd>
    </div>
  );
}

/** Post more cirBTC against the open loan, or take unused cirBTC back. Both are priced before anything is signed. */
export function CollateralSheet({ open, address, provider, onClose, onChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<CollateralMode>("add");
  const [amount, setAmount] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [planned, setPlanned] = useState<{ key: string; plan: CollateralPlan | null; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ mode: CollateralMode; txHash: string; amount: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    readPosition(address)
      .then((p) => {
        if (!live) return;
        setPosition(p);
        setPositionError(false);
      })
      .catch(() => live && setPositionError(true));
    return () => {
      live = false;
    };
  }, [open, address, epoch]);

  const key = JSON.stringify([mode, amount.trim(), position?.blockNumber?.toString()]);

  useEffect(() => {
    if (!open || !position || done || !amount.trim()) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const plan = await planCollateral(position, { mode, amount }, { quote: quoteCollateral, newKey: () => crypto.randomUUID() });
        if (live) setPlanned({ key, plan, error: false });
      } catch {
        if (live) setPlanned({ key, plan: null, error: true });
      }
    }, 450);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, position, mode, amount, key, done]);

  const typed = amount.trim() !== "";
  const current = typed && planned?.key === key ? planned : null;
  const plan = current?.plan ?? null;
  const canRun = !!plan && !plan.refusal && !busy && !done;
  const copy = COPY[mode];

  async function run() {
    if (!plan || plan.refusal) return;
    setBusy(true);
    setFailure(null);
    try {
      const deps =
        plan.route === "kit"
          ? kitCollateralDeps(browserAdapter(provider) as never, address)
          : directCollateralDeps({
              walletClient: createWalletClient({ account: address, chain: arcChain, transport: custom(provider) }),
              publicClient: publicClient as never,
            });
      const out = await executeCollateral(plan, deps);
      setDone({ mode: plan.mode, txHash: out.txHash, amount: plan.amountCirBtc });
      onChanged();
    } catch (e) {
      setFailure(e instanceof CollateralRefusalError ? e.message : describeError(e));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setFailure(null);
    setPlanned(null);
    setAmount("");
    setPosition(null);
    setEpoch((n) => n + 1);
  }

  const posted = position ? formatFixed(position.collateralCirBtc, 8) : "Reading";
  const held = position ? formatFixed(position.walletCirBtc, 8) : "Reading";
  const max = mode === "add" ? position?.walletCirBtc : position?.collateralCirBtc;

  return (
    <dialog
      ref={ref}
      aria-labelledby="collateral-title"
      onClose={() => {
        if (done) reset();
        onClose();
      }}
      onCancel={(e) => busy && e.preventDefault()}
      className="card m-auto max-h-[100svh] w-full max-w-[100vw] overflow-y-auto rounded-none p-0 text-ink sm:max-h-[92svh] sm:w-[min(94vw,520px)] sm:rounded-card"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="collateral-title" className="text-h3 font-medium tracking-[-0.02em]">
            Collateral
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
            <p className="mt-4 text-[20px] leading-tight font-medium tracking-[-0.01em] text-ink">{COPY[done.mode].done}</p>
            <p className="mt-2 text-[16px] text-graphite">
              <span className="num">{formatFixed(done.amount, 8)} cirBTC</span>
            </p>
            <p className="mt-5 rounded-cell border border-mist bg-cloud px-4 py-3 text-small">
              <a
                href={explorerTx(done.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-input text-violet underline decoration-violet/40 underline-offset-4 hover:decoration-violet"
              >
                See it on Arc mainnet
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
              if (canRun) void run();
            }}
          >
            <div role="tablist" aria-label="Collateral action" className="grid grid-cols-2 gap-1 rounded-pill bg-cloud p-1">
              {(["add", "withdraw"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  disabled={busy}
                  onClick={() => {
                    setMode(m);
                    setPlanned(null);
                    setFailure(null);
                  }}
                  className={`h-10 rounded-pill px-4 text-[15px] font-medium transition-colors ${
                    mode === m ? "bg-violet-wash text-ink" : "text-slate hover:text-ink"
                  }`}
                >
                  {COPY[m].tab}
                </button>
              ))}
            </div>
            <p className="mt-4 text-small text-slate">{copy.hint}</p>

            <dl className="mt-5 divide-y divide-mist rounded-cell border border-mist bg-cloud px-4">
              <Line label="Posted as collateral" value={`${posted} cirBTC`} />
              <Line label="In your wallet" value={`${held} cirBTC`} />
            </dl>

            <div className="mt-6 flex items-baseline justify-between">
              <label htmlFor="collateral-amount" className="text-small font-medium text-graphite">
                Amount of cirBTC
              </label>
              {max && Number(max) > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAmount(max)}
                  className="rounded-input text-caption font-medium text-violet hover:underline"
                >
                  Use all
                </button>
              )}
            </div>
            <input
              id="collateral-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              placeholder="0.00000000"
              inputMode="decimal"
              autoComplete="off"
              className={`${field} num mt-2`}
            />

            <dl className="mt-6 divide-y divide-mist rounded-cell border border-mist bg-cloud px-4">
              {plan && !plan.refusal ? (
                <>
                  <Line label={mode === "add" ? "Adding" : "Withdrawing"} value={`${formatFixed(plan.amountCirBtc, 8)} cirBTC`} />
                  {plan.route === "direct" && (
                    <p className="py-3 text-caption text-slate">
                      No loan is open, so this moves cirBTC straight against the market and health does not change.
                      {mode === "add" ? " Your wallet may ask twice: an approval, then the deposit." : ""}
                    </p>
                  )}
                  {plan.resultingHealth !== null && <Line label="Health after" value={plan.resultingHealth.toFixed(2)} />}
                  {plan.liquidationPriceUsd && (
                    <Line label="Liquidation price after" value={`${formatUsdc(plan.liquidationPriceUsd, 2)} USD`} />
                  )}
                  {Number(plan.bundledRepaymentUsdc) > 0 && (
                    <Line label="May repay up to" value={`${formatUsdc(plan.bundledRepaymentUsdc, 2)} USDC`} />
                  )}
                </>
              ) : (
                <p className="py-4 text-small text-slate">
                  {positionError
                    ? "Could not read your loan from Arc mainnet. Try again in a moment."
                    : !position
                      ? "Reading your loan."
                      : !typed
                        ? "Enter an amount to see the effect on your loan."
                        : current?.error
                          ? "Could not price this. Try again in a moment."
                          : !current
                            ? "Reading what this will do."
                            : "Fix the line below to see the effect."}
                </p>
              )}
            </dl>

            {plan?.refusal && (
              <p role="alert" className="mt-4 text-small text-warn">
                {plan.detail}
              </p>
            )}
            {failure && (
              <p role="alert" className="mt-4 text-small text-warn">
                {failure} Nothing was moved.
              </p>
            )}

            <div className="mt-6">
              <button type="submit" disabled={!canRun} className={primary}>
                {busy ? copy.busy : copy.cta}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
