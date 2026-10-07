import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";
import { explorerAddress, explorerTx } from "@/lib/chain";
import { formatDuration, formatUsdc, formatUsdcTight, shortHash } from "@/lib/format";
import { getDemoCycles } from "@/lib/landing";
import { getReceipt } from "@/lib/receipt";

// Read from Arc on request and kept for five minutes. No footer on this page.
export const revalidate = 300;

type Props = { params: Promise<{ tx: string }> };

// The demo desk's payouts are built ahead of time, so the receipts a visitor reaches from the proof page open at once.
export async function generateStaticParams() {
  const d = await getDemoCycles().catch(() => null);
  return d && d.ok ? d.settlements.flatMap((s) => (s.txHash ? [{ tx: s.txHash }] : [])) : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getReceipt((await params).tx);
  return {
    title: r.ok ? `Receipt ${r.payout.reference}` : "Settlement receipt",
    description: "A settlement on Arc mainnet, read from chain with a link to every transaction.",
  };
}

const MESSAGES = {
  invalid: "That is not a transaction hash.",
  "not-found": "That transaction is not on Arc mainnet.",
  "not-a-payout": "That transaction is not a Tidrel payout.",
  chain: "Chain data is unavailable right now. Try again in a moment.",
} as const;

const link =
  "rounded-badge text-tide-deep underline decoration-tide-deep/40 underline-offset-4 hover:decoration-tide-deep";

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(
    new Date(ts * 1000),
  ) + " UTC";

export default async function ReceiptPage({ params }: Props) {
  const r = await getReceipt((await params).tx);

  return (
    <>
      <SkipLink />
      <NavBar tone="light" />
      <main id="main" className="on-light flex-1 bg-paper text-ink">
        <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          {!r.ok ? (
            <>
              <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[44px]">
                {MESSAGES[r.reason]}
              </h1>
              <div className="mt-10">
                <PillLink href="/proof" variant="ink">
                  See the mainnet proof
                </PillLink>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] font-medium tracking-[0.08em] text-body uppercase">Settlement receipt</p>
              <h1 className="num mt-4 text-[30px] leading-[1.1] font-medium tracking-[-0.02em] break-all md:text-[44px]">
                {r.payout.reference}
              </h1>
              <p className="mt-5 max-w-2xl text-lead text-body">
                <span className="num text-ink">{formatUsdcTight(r.payout.totalUsdc)} USDC</span> paid to{" "}
                <span className="num text-ink">{r.payout.legs.length}</span>{" "}
                {r.payout.legs.length === 1 ? "counterparty" : "counterparties"} in one transaction from{" "}
                <a href={explorerAddress(r.payout.payer)} target="_blank" rel="noopener noreferrer" className={`num ${link}`}>
                  {shortHash(r.payout.payer)}
                </a>
                , on {when(r.timestamp)}.
              </p>

              <div className="mt-12 overflow-hidden rounded-[24px] bg-ink px-2 py-2 text-text md:px-4 md:py-4">
                <table className="w-full border-collapse text-left text-small">
                  <thead>
                    <tr className="border-b border-line text-caption text-muted">
                      <th scope="col" className="px-4 py-3 font-medium md:px-6">Counterparty</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium md:px-6">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.payout.legs.map((l, i) => (
                      <tr key={`${l.to}-${i}`} className="border-b border-line last:border-b-0">
                        <td className="num px-4 py-4 break-all md:px-6">
                          <a
                            href={explorerAddress(l.to)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-badge underline decoration-muted/50 underline-offset-4 hover:decoration-text"
                          >
                            {l.to}
                          </a>
                        </td>
                        <td className="num px-4 py-4 text-right whitespace-nowrap md:px-6">
                          {formatUsdcTight(l.amountUsdc)} USDC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 grid gap-4 rounded-[24px] border border-ink/10 bg-bone p-6 text-small sm:grid-cols-2 md:grid-cols-4 md:p-8">
                {r.cycle?.drawTxHash && (
                  <div>
                    <dt className="text-caption text-body">Draw</dt>
                    <dd className="num mt-1">
                      <a href={explorerTx(r.cycle.drawTxHash)} target="_blank" rel="noopener noreferrer" className={link}>
                        {formatUsdc(r.cycle.drawnUsdc, 2)} USDC
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-caption text-body">Payout</dt>
                  <dd className="num mt-1">
                    <a href={explorerTx(r.txHash)} target="_blank" rel="noopener noreferrer" className={link}>
                      {shortHash(r.txHash)}
                    </a>
                  </dd>
                </div>
                {r.cycle?.repayTxHash && (
                  <div>
                    <dt className="text-caption text-body">Repay</dt>
                    <dd className="num mt-1">
                      <a href={explorerTx(r.cycle.repayTxHash)} target="_blank" rel="noopener noreferrer" className={link}>
                        {shortHash(r.cycle.repayTxHash)}
                      </a>
                    </dd>
                  </div>
                )}
                {r.cycle && r.cycle.openSeconds !== null && r.cycle.interestUsdc !== null && (
                  <div>
                    <dt className="text-caption text-body">Open for, and cost</dt>
                    <dd className="num mt-1">
                      {formatDuration(r.cycle.openSeconds)}, {formatUsdc(r.cycle.interestUsdc, 6)} USDC
                    </dd>
                  </div>
                )}
                {r.cycle && !r.cycle.drawTxHash && (
                  <div>
                    <dt className="text-caption text-body">Funding</dt>
                    <dd className="mt-1">Paid from the wallet, nothing drawn</dd>
                  </div>
                )}
              </dl>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <PillLink href={explorerTx(r.txHash)} variant="ink">
                  View the payout on Arc mainnet
                </PillLink>
                <PillLink href={`/view/${r.payout.payer}`} variant="soft">
                  See the desk
                </PillLink>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
