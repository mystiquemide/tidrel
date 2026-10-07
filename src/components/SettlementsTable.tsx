import Link from "next/link";
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
  open: "bg-violet-tint text-violet",
  repaid: "bg-cloud text-ink",
  "self-funded": "bg-cloud text-slate",
  "drawn-not-settled": "bg-warn/10 text-warn",
};

function StateBadge({ s }: { s: Settlement }) {
  const state = s.state;
  const label = state === "repaid" && s.reference === null ? "Repaid, no payout" : STATE_LABEL[state];
  return (
    <span className={`inline-flex items-center rounded-pill px-2.5 py-1 text-caption font-medium whitespace-nowrap ${STATE_TONE[state]}`}>
      {label}
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
      className="rounded-input underline decoration-ash underline-offset-4 hover:decoration-ink"
    >
      {children}
    </a>
  );
}

/** The trade reference opens its receipt, which in turn links every transaction. */
function RefLink({ hash, children }: { hash: string | null; children: React.ReactNode }) {
  if (!hash) return <>{children}</>;
  return (
    <Link
      href={`/receipt/${hash}`}
      className="rounded-input underline decoration-ash underline-offset-4 hover:decoration-ink"
    >
      {children}
    </Link>
  );
}

function ReceiptLink({ hash }: { hash: string }) {
  return (
    <Link href={`/receipt/${hash}`} className="inline-flex items-center gap-1 rounded-input text-small font-medium text-violet hover:underline">
      Receipt
    </Link>
  );
}

const cells = (s: Settlement) => ({
  ref: s.reference ?? (s.state === "drawn-not-settled" ? "Awaiting payout" : "No payout"),
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
                <tr className="border-b border-mist">
                  {["Reference", "Counterparties", "Drawn", "Open for", "Cost", "State", ""].map((h) => (
                    <th key={h || "receipt"} scope="col" className="eyebrow px-6 py-4 font-medium">
                      {h || <span className="sr-only">Receipt</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const c = cells(s);
                  return (
                    <tr key={`${s.drawTxHash}-${s.txHash}`} className="border-b border-mist text-graphite transition-colors last:border-b-0 hover:bg-cloud">
                      <td className="num px-6 py-4 text-ink">
                        <RefLink hash={s.txHash}>{c.ref}</RefLink>
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
                      <td className="px-6 py-4"><StateBadge s={s} /></td>
                      <td className="px-6 py-4 text-right">{s.txHash && <ReceiptLink hash={s.txHash} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-mist md:hidden">
              {rows.map((s) => {
                const c = cells(s);
                return (
                  <li key={`${s.drawTxHash}-${s.txHash}`} className="px-6 py-5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="num text-body text-ink">
                        <RefLink hash={s.txHash}>{c.ref}</RefLink>
                      </span>
                      <StateBadge s={s} />
                    </div>
                    {s.txHash && (
                      <Link
                        href={`/receipt/${s.txHash}`}
                        className="mt-4 inline-flex h-10 items-center rounded-pill bg-cloud px-5 text-small font-medium text-ink hover:bg-mist"
                      >
                        View receipt
                      </Link>
                    )}
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small">
                      {[
                        ["Counterparties", c.legs, null],
                        ["Drawn", c.drawn, s.drawTxHash],
                        ["Open for", c.open, s.repayTxHash],
                        ["Cost", c.cost, s.repayTxHash],
                      ].map(([k, v, h]) => (
                        <div key={k as string}>
                          <dt className="text-caption text-slate">{k}</dt>
                          <dd className="num text-ink">
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
