import { explorerTx } from "@/lib/chain";
import { formatDuration, formatUsdc } from "@/lib/format";
import type { Settlement, SettlementState } from "@/lib/history";

const STATE_LABEL: Record<SettlementState, string> = {
  open: "Open",
  repaid: "Repaid",
  "self-funded": "Paid from wallet",
  "drawn-not-settled": "Drawn, not settled",
};

const STATE_TONE: Record<SettlementState, string> = {
  open: "bg-tide/15 text-tide",
  repaid: "bg-raised text-ebb",
  "self-funded": "bg-raised text-muted",
  "drawn-not-settled": "bg-warn/15 text-warn",
};

function StateBadge({ state }: { state: SettlementState }) {
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-caption font-medium whitespace-nowrap ${STATE_TONE[state]}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

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
  open: !s.drawTxHash ? "None" : s.openSeconds === null ? "Open" : formatDuration(s.openSeconds),
  cost: !s.drawTxHash ? "None" : s.interestUsdc === null ? "Pending" : `${formatUsdc(s.interestUsdc, 6)} USDC`,
});

/** Settlement history as a table on desktop and stacked rows on phones. Every figure links to its transaction. */
export function SettlementsTable({ rows }: { rows: Settlement[] }) {
  return (
    <>

            <table className="hidden w-full border-collapse text-left text-small md:table">
              <thead>
                <tr className="border-b border-line text-caption text-muted">
                  {["Reference", "Counterparties", "Drawn", "Open for", "Cost", "State"].map((h) => (
                    <th key={h} scope="col" className="px-6 py-3 font-medium first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const c = cells(s);
                  return (
                    <tr key={`${s.drawTxHash}-${s.txHash}`} className="border-b border-line transition-colors last:border-b-0 hover:bg-raised/60">
                      <td className="num px-6 py-4 text-text">
                        <TxLink hash={s.txHash}>{c.ref}</TxLink>
                      </td>
                      <td className="num px-6 py-4">{c.legs}</td>
                      <td className="num px-6 py-4">
                        <TxLink hash={s.drawTxHash}>{c.drawn}</TxLink>
                      </td>
                      <td className="num px-6 py-4">
                        <TxLink hash={s.repayTxHash}>{c.open}</TxLink>
                      </td>
                      <td className="num px-6 py-4">
                        <TxLink hash={s.repayTxHash}>{c.cost}</TxLink>
                      </td>
                      <td className="px-6 py-4"><StateBadge state={s.state} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {rows.map((s) => {
                const c = cells(s);
                return (
                  <li key={`${s.drawTxHash}-${s.txHash}`} className="px-6 py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="num text-body text-text">
                        <TxLink hash={s.txHash}>{c.ref}</TxLink>
                      </span>
                      <StateBadge state={s.state} />
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
    </>
  );
}
