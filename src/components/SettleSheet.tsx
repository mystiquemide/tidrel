"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { settlerAbi } from "@/lib/abis";
import { ADDRESSES, arcChain, explorerTx } from "@/lib/chain";
import { publicClient } from "@/lib/client";
import { formatUsdc, formatUsdcTight } from "@/lib/format";
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
import { rememberCounterparties, savedCounterparties } from "@/lib/addressBook";
import { parseRecipients } from "@/lib/csv";
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

const field =
  "w-full rounded-badge border border-line bg-ink px-3.5 py-3 text-[16px] text-text transition-colors placeholder:text-muted hover:border-muted/60 focus:border-tide focus:outline-none focus:ring-2 focus:ring-tide/25 disabled:opacity-60";
const secondary =
  "inline-flex w-full items-center justify-center rounded-pill border border-line bg-panel px-5 py-3 text-[14px] font-medium text-text transition-colors hover:bg-raised disabled:opacity-50";

const STEP_ORDER: Step[] = ["checking", "drawing", "paying"];

function Progress({ step, skipDraw }: { step: Step; skipDraw: boolean }) {
  const steps = STEP_ORDER.filter((s) => !(skipDraw && s !== "paying"));
  const at = steps.indexOf(step);
  return (
    <ol className="mt-5 flex flex-col gap-3" role="status" aria-live="polite">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-3 text-small">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-pill text-[11px] font-medium ${
              i < at ? "bg-tide text-ink" : i === at ? "border border-tide text-tide" : "border border-line text-muted"
            }`}
            aria-hidden="true"
          >
            {i < at ? "✓" : i + 1}
          </span>
          <span className={i === at ? "text-text" : i < at ? "text-ebb" : "text-muted"}>
            {{ checking: "Check the reference", drawing: "Draw USDC", paying: "Pay counterparties" }[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Check() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-tide/15 text-tide" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5l4 4 8-9" />
      </svg>
    </span>
  );
}
const primary =
  "inline-flex w-full items-center justify-center rounded-pill bg-tide px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:brightness-95 disabled:opacity-50";

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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Re-read after a settlement so the payees just paid are offered next time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saved = useMemo(() => (open ? savedCounterparties() : []), [open, outcome]);

  function applyPaste() {
    const out = parseRecipients(pasteText);
    setPasteErrors(out.errors);
    if (out.rows.length === 0) return;
    setRows(out.rows.map((r) => ({ id: nextId.current++, to: r.to, amount: r.amount })));
    if (out.errors.length === 0) {
      setPasteOpen(false);
      setPasteText("");
    }
  }

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
    if (result.kind === "settled") {
      rememberCounterparties(plan.legs.map((l) => l.to));
    }
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

  return (
    <dialog
      ref={ref}
      aria-labelledby="settle-title"
      onClose={() => {
        if (outcome?.kind === "settled") reset();
        onClose();
      }}
      onCancel={(e) => busy && e.preventDefault()}
      className="card m-auto max-h-[100svh] w-full max-w-[100vw] overflow-y-auto rounded-none p-0 text-text sm:max-h-[92svh] sm:w-[min(94vw,560px)] sm:rounded-card"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="settle-title" className="text-h3 font-medium tracking-[-0.02em]">
              Settle a trade
            </h2>
            <p className="mt-1 text-small text-muted">Draw only what the payout needs, then pay in one transaction.</p>
          </div>
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
            <Check />
            <p className="mt-4 text-[22px] leading-tight font-medium tracking-[-0.01em] text-text">Settled</p>
            <p className="mt-2 text-[16px] text-ebb">
              {outcome.drawTx && plan ? `${formatUsdc(plan.drawUsdc, 2)} USDC drawn and paid out.` : "Paid from your wallet, nothing drawn."}
            </p>
            <p className="mt-5 flex flex-col gap-2 rounded-badge border border-line bg-ink/60 px-4 py-3 text-small">
              {outcome.drawTx && <TxLink hash={outcome.drawTx}>See the draw on Arc mainnet</TxLink>}
              <TxLink hash={outcome.payoutTx}>See the payout on Arc mainnet</TxLink>
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button type="button" onClick={reset} className={primary}>
                Settle another trade
              </button>
              <button type="button" onClick={onClose} className={secondary}>
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
              <button type="button" disabled={busy} onClick={onRepay} className={secondary}>
                Repay now
              </button>
            </div>
            {step && <Progress step={step} skipDraw />}
          </div>
        ) : (
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSettle) void start();
            }}
          >
            <div className="flex items-baseline justify-between">
              <label htmlFor="settle-ref" className="text-small font-medium text-ebb">
                Reference
              </label>
              <span className={`num text-caption ${refBytes > MAX_REFERENCE_BYTES ? "text-warn" : "text-muted"}`}>
                {refBytes}/{MAX_REFERENCE_BYTES}
              </span>
            </div>
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
              <legend className="text-small font-medium text-ebb">Pay to</legend>
              <ul className="mt-2 flex flex-col gap-3">
                {rows.map((r, i) => (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_112px_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_132px_auto]">
                    <input
                      aria-label={`Recipient ${i + 1} address`}
                      value={r.to}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, to: e.target.value } : x)))}
                      list="saved-counterparties"
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
                className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-2 text-small font-medium text-tide transition-colors hover:border-tide/60 hover:bg-raised"
              >
                + Add counterparty
              </button>
              <button
                type="button"
                onClick={() => setPasteOpen((v) => !v)}
                className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-2 text-small font-medium text-ebb transition-colors hover:border-muted hover:text-text"
              >
                {pasteOpen ? "Hide list" : "Paste a list"}
              </button>
              {pasteOpen && (
                <div className="mt-3">
                  <label htmlFor="paste-list" className="text-caption text-muted">
                    One counterparty per line: an address, then an amount in USDC. This replaces the list above.
                  </label>
                  <textarea
                    id="paste-list"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    placeholder={"0x...,1.50\n0x...,2.25"}
                    className={`${field} num mt-2 text-small`}
                  />
                  {pasteErrors.map((m) => (
                    <p key={m} role="alert" className="mt-1 text-caption text-warn">
                      {m}
                    </p>
                  ))}
                  <button
                    type="button"
                    onClick={applyPaste}
                    disabled={!pasteText.trim()}
                    className="mt-2 rounded-pill bg-panel px-4 py-2 text-small font-medium text-text transition-colors hover:bg-raised disabled:opacity-50"
                  >
                    Use this list
                  </button>
                </div>
              )}
              <datalist id="saved-counterparties">
                {saved.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </fieldset>

            <dl className="mt-6 divide-y divide-line rounded-badge border border-line bg-ink/60 px-4">
              {plan && !plan.refusal ? (
                <>
                  <p className="py-3 text-small text-ebb">
                    Your wallet pays{" "}
                    <span className="num text-text">{formatUsdcTight(plan.totalUsdc)} USDC</span> to{" "}
                    {plan.legs.length} {plan.legs.length === 1 ? "counterparty" : "counterparties"}
                    {plan.drawUsdc !== "0" ? (
                      <>
                        , after Tidrel draws <span className="num text-text">{formatUsdcTight(plan.drawUsdc)} USDC</span> against your cirBTC
                      </>
                    ) : null}
                    .
                  </p>
                  <Line
                    label="From your wallet"
                    value={`${formatUsdcTight(String(Math.max(0, Number(plan.totalUsdc) - Number(plan.drawUsdc))))} USDC`}
                  />
                  <Line
                    label="Tidrel draws"
                    value={`${formatUsdcTight(plan.drawUsdc)} USDC`}
                    note={position && plan.drawUsdc !== "0" ? `at ${(position.borrowApy * 100).toFixed(2)}% a year` : undefined}
                  />
                  {plan.collateralToPostCirBtc && Number(plan.collateralToPostCirBtc) > 0 && (
                    <Line label="Collateral posted now" value={`${plan.collateralToPostCirBtc} cirBTC`} />
                  )}
                  {position && (
                    <Line
                      label="USDC left in your wallet"
                      value={`${formatUsdcTight(String(Math.max(0, Number(position.walletUsdc) - Number(plan.totalUsdc))))} USDC`}
                    />
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
            {step && <Progress step={step} skipDraw={false} />}

            <div className="mt-6">
              <button type="submit" disabled={!canSettle} className={primary}>
                {busy ? "Confirm in your wallet" : plan && plan.drawUsdc !== "0" ? "Draw and settle" : "Settle"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

