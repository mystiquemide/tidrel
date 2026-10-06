"use client";

import { useEffect, useRef, useState } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { settlerAbi } from "@/lib/abis";
import { ADDRESSES, arcChain, explorerTx } from "@/lib/chain";
import { publicClient } from "@/lib/client";
import { formatUsdc } from "@/lib/format";
import { findReference, type Settlement } from "@/lib/history";
import { kitDrawDeps, quoteDraw } from "@/lib/draw";
import { browserAdapter } from "@/lib/kit";
import { hasCollateral, readPosition, type Position } from "@/lib/position";
import {
  executeDraw,
  executePayouts,
  planSettlement,
  SettleRefusal,
  type SettlementPlan,
} from "@/lib/settle";
import { MAX_REFERENCE_BYTES, referenceToBytes32 } from "@/lib/settler";
import { runSettlement, type Outcome, type Step } from "@/lib/settleFlow";

type Row = { id: number; to: string; amount: string };
type Props = {
  open: boolean;
  address: Address;
  provider: EIP1193Provider;
  settlements: Settlement[];
  onClose: () => void;
  /** Opens the repay sheet, used when a draw went through but the payout did not. */
  onRepay: () => void;
  /** Called after a draw or payout went through, so the desk reads fresh figures. */
  onChanged: () => void;
};

const STEP_TEXT: Record<Step, (draw: string, legs: number) => string> = {
  checking: () => "Checking the reference",
  drawing: (draw) => `Drawing ${draw} USDC`,
  paying: (_d, legs) => `Paying ${legs} ${legs === 1 ? "counterparty" : "counterparties"}`,
};

const field =
  "w-full rounded-badge border border-line bg-ink px-3 py-3 text-[16px] text-text placeholder:text-muted focus:border-tide focus:outline-none";
const primary =
  "inline-flex w-full items-center justify-center rounded-pill bg-tide px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:brightness-95 disabled:opacity-50";

function Line({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-small text-ebb">{label}</dt>
      <dd className="num text-right text-small text-text">
        {value}
        {note && <span className="ml-2 text-muted">{note}</span>}
      </dd>
    </div>
  );
}

function TxLink({ hash, children }: { hash: string; children: React.ReactNode }) {
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-badge text-tide underline decoration-tide/40 underline-offset-4 hover:decoration-tide"
    >
      {children}
    </a>
  );
}

/** The settle sheet: a reference, who to pay, and a live read of what it will cost before anything is signed. */
export function SettleSheet({ open, address, provider, settlements, onClose, onRepay, onChanged }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const nextId = useRef(2);
  // Bumped after a settlement so the next one reads a fresh position.
  const [epoch, setEpoch] = useState(0);
  const [reference, setReference] = useState("");
  const [rows, setRows] = useState<Row[]>([{ id: 1, to: "", amount: "" }]);
  const [position, setPosition] = useState<Position | null>(null);
  const [positionError, setPositionError] = useState(false);
  const [planned, setPlanned] = useState<{ key: string; plan: SettlementPlan | null; error: boolean } | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Read the wallet's position fresh each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    let live = true;
    readPosition(address)
      .then((p) => live && (setPosition(p), setPositionError(false)))
      .catch(() => live && setPositionError(true));
    return () => {
      live = false;
    };
  }, [open, address, epoch]);

  const refTrim = reference.trim();
  const refBytes = new TextEncoder().encode(refTrim).length;
  const ready = refTrim !== "" && rows.every((r) => r.to.trim() !== "" && r.amount.trim() !== "");
  const key = JSON.stringify([refTrim, rows.map((r) => [r.to.trim(), r.amount.trim()]), position?.blockNumber?.toString()]);

  // Plan a moment after the last keystroke. The plan is a read: nothing is signed.
  useEffect(() => {
    if (!open || !ready || !position || outcome || step) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const plan = await planSettlement(
          { reference: refTrim, legs: rows.map((r) => ({ to: r.to.trim(), amountUsdc: r.amount.trim() })) },
          {
            wallet: address,
            loanId: position.loanId,
            hasCollateral: hasCollateral(position),
            walletUsdc: position.walletUsdc,
            walletCirBtc: position.walletCirBtc,
            marketLiquidityUsdc: position.marketLiquidityUsdc,
          },
          {
            quoteDraw,
            findReference: async (r) => findReference(settlements, r),
            newKey: () => crypto.randomUUID(),
          },
        );
        if (live) setPlanned({ key, plan, error: false });
      } catch {
        if (live) setPlanned({ key, plan: null, error: true });
      }
    }, 500);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, ready, key, position, outcome, step, address, refTrim, rows, settlements]);

  const current = ready && planned?.key === key ? planned : null;
  const plan = current?.plan ?? null;
  const planning = ready && !!position && !current && !outcome;
  const busy = step !== null;
  const canSettle = !!plan && !plan.refusal && !busy && !outcome;

  async function start(skipDraw?: { drawTx: string }) {
    if (!plan || plan.refusal || !position) return;
    setOutcome(null);
    const walletClient = createWalletClient({ account: address, chain: arcChain, transport: custom(provider) });
    const result = await runSettlement({
      plan,
      skipDraw,
      onStep: setStep,
      checkReference: async () => {
        const used = await publicClient
          .readContract({
            address: ADDRESSES.settler,
            abi: settlerAbi,
            functionName: "settled",
            args: [address, referenceToBytes32(plan.reference)],
          })
          .catch(() => false);
        if (used) throw new SettleRefusal("DUPLICATE_REF", "This reference was already settled by this wallet.");
      },
      draw: async () =>
        executeDraw(plan, { wallet: address, loanId: position.loanId }, kitDrawDeps(browserAdapter(provider) as never, address)),
      payout: () => executePayouts({ plan, walletClient, publicClient: publicClient as never }),
    });
    setStep(null);
    setOutcome(result);
    if (result.kind === "settled" || result.kind === "drawn-not-settled") onChanged();
  }

  function reset() {
    setReference("");
    setRows([{ id: 1, to: "", amount: "" }]);
    setPlanned(null);
    setOutcome(null);
    setStep(null);
    setPosition(null);
    setEpoch((n) => n + 1);
  }

  const legsCount = plan?.legs.length ?? rows.length;
  const working = step ? STEP_TEXT[step](plan?.drawUsdc ?? "0", legsCount) : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="settle-title"
      onClose={() => {
        if (outcome?.kind === "settled") reset();
        onClose();
      }}
      onCancel={(e) => busy && e.preventDefault()}
      className="m-auto max-h-[100svh] w-full max-w-[100vw] overflow-y-auto bg-panel p-0 text-text backdrop:bg-ink/80 sm:max-h-[92svh] sm:w-[min(94vw,560px)] sm:rounded-card sm:border sm:border-line"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 id="settle-title" className="text-h2 font-[550] tracking-[-0.024em]">
            Settle a trade
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-ebb hover:text-text disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {outcome?.kind === "settled" ? (
          <div className="mt-8" role="status">
            <p className="text-lead text-text">
              Settled.{" "}
              {outcome.drawTx && plan ? `${formatUsdc(plan.drawUsdc, 2)} USDC drawn.` : "Paid from your wallet, nothing drawn."}
            </p>
            <p className="mt-4 flex flex-col gap-2 text-small">
              {outcome.drawTx && <TxLink hash={outcome.drawTx}>See the draw on Arc mainnet</TxLink>}
              <TxLink hash={outcome.payoutTx}>See the payout on Arc mainnet</TxLink>
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button type="button" onClick={reset} className={primary}>
                Settle another trade
              </button>
              <button type="button" onClick={onClose} className="rounded-pill bg-ink px-6 py-3.5 text-[15px] font-medium text-text hover:bg-line">
                Done
              </button>
            </div>
          </div>
        ) : outcome?.kind === "drawn-not-settled" ? (
          <div className="mt-8" role="alert">
            <p className="text-lead text-warn">Drawn, not settled.</p>
            <p className="mt-3 text-[16px] text-ebb">
              The draw went through but the payout did not. {outcome.error} Your counterparties have not been paid.
            </p>
            <p className="mt-4 text-small">
              <TxLink hash={outcome.drawTx}>See the draw on Arc mainnet</TxLink>
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button type="button" disabled={busy} onClick={() => start({ drawTx: outcome.drawTx })} className={primary}>
                Retry payout
              </button>
              <button type="button" disabled={busy} onClick={onRepay} className="rounded-pill bg-ink px-6 py-3.5 text-[15px] font-medium text-text hover:bg-line disabled:opacity-50">
                Repay now
              </button>
            </div>
            {working && <p className="mt-4 text-small text-ebb" role="status">{working}</p>}
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSettle) void start();
            }}
          >
            <label htmlFor="settle-ref" className="text-small text-ebb">
              Reference
            </label>
            <input
              id="settle-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={busy}
              placeholder="Trade reference"
              autoComplete="off"
              spellCheck={false}
              className={`${field} mt-2`}
            />
            <p className={`mt-2 text-caption ${refBytes > MAX_REFERENCE_BYTES ? "text-warn" : "text-muted"}`}>
              Public on Arc mainnet, so keep it free of anything private. Use a new reference each time, up to {MAX_REFERENCE_BYTES} characters.
            </p>

            <fieldset className="mt-6" disabled={busy}>
              <legend className="text-small text-ebb">Pay to</legend>
              <ul className="mt-2 flex flex-col gap-3">
                {rows.map((r, i) => (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_92px_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                    <input
                      aria-label={`Recipient ${i + 1} address`}
                      value={r.to}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, to: e.target.value } : x)))}
                      placeholder="0x address"
                      autoComplete="off"
                      spellCheck={false}
                      className={`${field} num min-w-0 text-small`}
                    />
                    <input
                      aria-label={`Recipient ${i + 1} amount in USDC`}
                      value={r.amount}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, amount: e.target.value } : x)))}
                      placeholder="USDC"
                      inputMode="decimal"
                      autoComplete="off"
                      className={`${field} num text-small`}
                    />
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        aria-label={`Remove recipient ${i + 1}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-ebb hover:text-text"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 5l10 10M15 5L5 15" />
                        </svg>
                      </button>
                    ) : (
                      <span className="h-10 w-10" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setRows((rs) => [...rs, { id: nextId.current++, to: "", amount: "" }])}
                className="mt-3 rounded-badge py-1 text-small font-medium text-tide hover:underline"
              >
                Add counterparty
              </button>
            </fieldset>

            <dl className="mt-6 divide-y divide-line border-y border-line">
              {plan && !plan.refusal ? (
                <>
                  <Line label="Total" value={`${formatUsdc(plan.totalUsdc, 2)} USDC`} />
                  <Line
                    label="From your wallet"
                    value={`${formatUsdc(String(Math.max(0, Number(plan.totalUsdc) - Number(plan.drawUsdc))), 2)} USDC`}
                  />
                  <Line
                    label="Tidrel draws"
                    value={`${formatUsdc(plan.drawUsdc, 2)} USDC`}
                    note={position && plan.drawUsdc !== "0" ? `at ${(position.borrowApy * 100).toFixed(2)}% a year` : undefined}
                  />
                  {plan.collateralToPostCirBtc && Number(plan.collateralToPostCirBtc) > 0 && (
                    <Line label="Collateral posted now" value={`${plan.collateralToPostCirBtc} cirBTC`} />
                  )}
                  {plan.resultingHealth !== null && (
                    <Line label="Health after" value={plan.resultingHealth.toFixed(2)} />
                  )}
                </>
              ) : (
                <p className="py-4 text-small text-muted">
                  {positionError
                    ? "Could not read your position from Arc mainnet. Try again in a moment."
                    : !ready
                      ? "Add a reference and who to pay to see the cost."
                      : planning || !position
                        ? "Reading what this will cost."
                        : current?.error
                          ? "Could not price this draw. Try again in a moment."
                          : "Fix the line below to see the cost."}
                </p>
              )}
            </dl>

            {plan?.mergedDuplicates && !plan.refusal && (
              <p className="mt-3 text-caption text-muted">Duplicate recipients were added together.</p>
            )}
            {plan?.refusal && (
              <p role="alert" className="mt-4 text-small text-warn">
                {plan.detail}
              </p>
            )}
            {outcome?.kind === "failed" && (
              <p role="alert" className="mt-4 text-small text-warn">
                {outcome.error} Nothing was sent.
              </p>
            )}
            {working && (
              <p role="status" className="mt-4 text-small text-ebb">
                {working}
              </p>
            )}

            <div className="mt-6">
              <button type="submit" disabled={!canSettle} className={primary}>
                {busy ? "Working" : plan && plan.drawUsdc !== "0" ? "Draw and settle" : "Settle"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

