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
    </>
  );
}
