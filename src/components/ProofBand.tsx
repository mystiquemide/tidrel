import { explorerTx, RUN_BUDGET_USDC } from "@/lib/chain";
import {
  formatDuration,
  formatDurationWords,
  formatUsdc,
  shortHash,
} from "@/lib/format";
import type { Settlement, SettlementState } from "@/lib/history";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";
import { TidrelMark } from "./TidrelMark";

const STATE_LABEL: Record<SettlementState, string> = {
  open: "Open",
  repaid: "Repaid",
  "self-funded": "Paid from wallet",
  "drawn-not-settled": "Drawn, not settled",
};

const STATE_TONE: Record<SettlementState, string> = {
  open: "text-tide",
  repaid: "text-ebb",
  "self-funded": "text-muted",
  "drawn-not-settled": "text-warn",
};

function TxLink({ hash, children }: { hash: string | null; children: React.ReactNode }) {
  if (!hash) return <>{children}</>;
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-badge underline decoration-muted/50 underline-offset-4 hover:decoration-text"
    >
      {children}
    </a>
  );
}

const cells = (s: Settlement) => ({
  ref: s.reference ?? "No payout yet",
  legs: s.legs ? String(s.legs) : "None",
  drawn: s.drawTxHash ? `${formatUsdc(s.drawnUsdc, 2)} USDC` : "None",
  open: s.openSeconds === null ? "Open" : formatDuration(s.openSeconds),
  cost: s.interestUsdc === null ? "Pending" : `${formatUsdc(s.interestUsdc, 6)} USDC`,
});

export async function ProofBand() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const rows = data.ok ? [...data.settlements].reverse() : [];

  return (
    <section id="proof" className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-24 md:py-32">
        <span className="inline-flex items-center gap-2 rounded-badge bg-panel px-3 py-2 text-[14px] font-medium">
          <TidrelMark size={18} strokeWidth={2.8} className="text-tide" />
          Mainnet proof
        </span>

        {head && head.openSeconds !== null && head.interestUsdc !== null ? (
          <>
            <h2 className="mt-8 max-w-[18ch] text-[40px] leading-[1.04] font-[550] tracking-[-0.03em] md:text-display">
              A loan against bitcoin that existed for{" "}
              <span className="text-tide">
                {formatDurationWords(head.openSeconds)}
              </span>
              .
            </h2>
            <p className="mt-6 max-w-2xl text-lead text-ebb">
              It drew{" "}
              <span className="num text-text">{formatUsdc(head.drawnUsdc, 2)} USDC</span>, paid{" "}
              <span className="num text-text">{head.legs}</span> counterparties in one
              transaction, and cost{" "}
              <span className="num text-text">{formatUsdc(head.interestUsdc, 6)} USDC</span> in
              interest.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PillLink href={explorerTx(head.drawTxHash!)} variant="light">
                View the draw
              </PillLink>
              <PillLink href={explorerTx(head.txHash!)} variant="dark">
                View the payout
              </PillLink>
              <PillLink href={explorerTx(head.repayTxHash!)} variant="dark">
                View the repay
              </PillLink>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-8 max-w-[20ch] text-[40px] leading-[1.04] font-[550] tracking-[-0.03em] md:text-display">
              {data.ok ? "First settlements land with the mainnet run." : "Chain data is unavailable right now."}
            </h2>
            <p className="mt-6 max-w-2xl text-lead text-ebb">
              {data.ok
                ? "Every figure on this page is read from Arc. There is nothing to show until a draw has been repaid."
                : "Every figure on this page is read from Arc, so nothing is shown until the read works. Try again in a moment."}
            </p>
          </>
        )}

        {rows.length > 0 && (
          <div className="mt-16">
            <table className="hidden w-full border-collapse text-left text-small md:table">
              <thead>
                <tr className="border-b border-line text-caption text-muted">
                  {["Reference", "Counterparties", "Drawn", "Open for", "Cost", "State"].map((h) => (
                    <th key={h} scope="col" className="py-3 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const c = cells(s);
                  return (
                    <tr key={`${s.drawTxHash}-${s.txHash}`} className="border-b border-line">
                      <td className="num py-4 pr-4 text-text">
                        <TxLink hash={s.txHash}>{c.ref}</TxLink>
                      </td>
                      <td className="num py-4 pr-4">{c.legs}</td>
                      <td className="num py-4 pr-4">
                        <TxLink hash={s.drawTxHash}>{c.drawn}</TxLink>
                      </td>
                      <td className="num py-4 pr-4">
                        <TxLink hash={s.repayTxHash}>{c.open}</TxLink>
                      </td>
                      <td className="num py-4 pr-4">
                        <TxLink hash={s.repayTxHash}>{c.cost}</TxLink>
                      </td>
                      <td className={`py-4 font-medium ${STATE_TONE[s.state]}`}>{STATE_LABEL[s.state]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-line border-y border-line md:hidden">
              {rows.map((s) => {
                const c = cells(s);
                return (
                  <li key={`${s.drawTxHash}-${s.txHash}`} className="py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="num text-body text-text">
                        <TxLink hash={s.txHash}>{c.ref}</TxLink>
                      </span>
                      <span className={`text-small font-medium ${STATE_TONE[s.state]}`}>
                        {STATE_LABEL[s.state]}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small">
                      {[
                        ["Counterparties", c.legs, null],
                        ["Drawn", c.drawn, s.drawTxHash],
                        ["Open for", c.open, s.repayTxHash],
                        ["Cost", c.cost, s.repayTxHash],
                      ].map(([k, v, h]) => (
                        <div key={k as string}>
                          <dt className="text-caption text-muted">{k}</dt>
                          <dd className="num text-text">
                            <TxLink hash={h as string | null}>{v}</TxLink>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-10 max-w-3xl text-small text-muted">
          Mainnet run sized to a {RUN_BUDGET_USDC} USDC budget.
          Counterparties in this run are builder-controlled wallets. The same code path runs at
          any size.
          {data.ok && head && (
            <>
              {" "}
              Read from Arc at block <span className="num">{data.blockNumber.toString()}</span>
              {head.txHash ? (
                <>
                  , latest payout <span className="num">{shortHash(head.txHash)}</span>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}
