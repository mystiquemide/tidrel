import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";
import { explorerAddress, explorerTx } from "@/lib/chain";
import { formatDuration, formatUsdc, formatUsdcTight, shortHash } from "@/lib/format";
import { getDemoCycles } from "@/lib/landing";
import { getReceipt } from "@/lib/receipt";

// Read from Arc on request and kept for five minutes.
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

const link =
  "rounded-input text-violet underline decoration-violet/30 underline-offset-4 hover:decoration-violet";

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(
    new Date(ts * 1000),
  ) + " UTC";

export default async function ReceiptPage({ params }: Props) {
  const tx = (await params).tx;
  const r = await getReceipt(tx);
  // A hash that is malformed, absent from Arc mainnet or not a Tidrel payout has no receipt to show.
  if (!r.ok && r.reason !== "chain") notFound();

  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1 bg-porcelain">
        <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-36">
          {!r.ok ? (
            <>
              <p style={{ "--i": 0 } as React.CSSProperties} className="load eyebrow">Settlement receipt</p>
              <h1 style={{ "--i": 1 } as React.CSSProperties} className="load mt-5 max-w-[20ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
                Arc mainnet is not responding right now.
              </h1>
              <p style={{ "--i": 2 } as React.CSSProperties} className="load mt-6 max-w-2xl text-lead text-slate">
                This receipt is read live from the chain, so nothing is shown until it answers. Try again in a moment.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <PillLink href={`/receipt/${tx}`}>Try again</PillLink>
                <PillLink href="/proof" variant="secondary">
                  See the mainnet proof
                </PillLink>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">Settlement receipt</p>
              <h1 className="num mt-5 text-[30px] leading-[1.1] tracking-[-0.01em] break-all md:text-[48px]">
                {r.payout.reference}
              </h1>
              <p className="mt-6 max-w-2xl text-lead text-slate">
                <span className="num text-ink">{formatUsdcTight(r.payout.totalUsdc)} USDC</span> paid to{" "}
                <span className="num text-ink">{r.payout.legs.length}</span>{" "}
                {r.payout.legs.length === 1 ? "counterparty" : "counterparties"} in one transaction from{" "}
                <a href={explorerAddress(r.payout.payer)} target="_blank" rel="noopener noreferrer" className={`num ${link}`}>
                  {shortHash(r.payout.payer)}
                </a>
                , on {when(r.timestamp)}.
              </p>

              <div className="card mt-12 overflow-hidden">
                <table className="w-full border-collapse text-left text-small">
                  <thead>
                    <tr className="border-b border-mist">
                      <th scope="col" className="eyebrow px-4 py-4 font-medium md:px-6">Counterparty</th>
                      <th scope="col" className="eyebrow px-4 py-4 text-right font-medium md:px-6">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.payout.legs.map((l, i) => (
                      <tr key={`${l.to}-${i}`} className="border-b border-mist last:border-b-0">
                        <td className="num px-4 py-4 break-all text-ink md:px-6">
                          <a
                            href={explorerAddress(l.to)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-input underline decoration-ash underline-offset-4 hover:decoration-ink"
                          >
                            {l.to}
                          </a>
                        </td>
                        <td className="num px-4 py-4 text-right whitespace-nowrap text-ink md:px-6">
                          {formatUsdcTight(l.amountUsdc)} USDC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="mt-4 grid gap-px overflow-hidden rounded-panel border border-mist bg-mist text-small sm:grid-cols-2 lg:grid-cols-4">
                {r.cycle?.drawTxHash && (
                  <div className="bg-cloud p-6">
                    <dt className="eyebrow">Draw</dt>
                    <dd className="num mt-3 text-body">
                      <a href={explorerTx(r.cycle.drawTxHash)} target="_blank" rel="noopener noreferrer" className={link}>
                        {formatUsdc(r.cycle.drawnUsdc, 2)} USDC
                      </a>
                    </dd>
                  </div>
                )}
                <div className="bg-cloud p-6">
                  <dt className="eyebrow">Payout</dt>
                  <dd className="num mt-3 text-body">
                    <a href={explorerTx(r.txHash)} target="_blank" rel="noopener noreferrer" className={link}>
                      {shortHash(r.txHash)}
                    </a>
                  </dd>
                </div>
                {r.cycle?.repayTxHash && (
                  <div className="bg-cloud p-6">
                    <dt className="eyebrow">Repay</dt>
                    <dd className="num mt-3 text-body">
                      <a href={explorerTx(r.cycle.repayTxHash)} target="_blank" rel="noopener noreferrer" className={link}>
                        {shortHash(r.cycle.repayTxHash)}
                      </a>
                    </dd>
                  </div>
                )}
                {r.cycle && r.cycle.openSeconds !== null && r.cycle.interestUsdc !== null && (
                  <div className="bg-cloud p-6">
                    <dt className="eyebrow">Open for, and cost</dt>
                    <dd className="num mt-3 text-body text-ink">
                      {formatDuration(r.cycle.openSeconds)}, {formatUsdc(r.cycle.interestUsdc, 6)} USDC
                    </dd>
                  </div>
                )}
                {r.cycle && !r.cycle.drawTxHash && (
                  <div className="bg-cloud p-6">
                    <dt className="eyebrow">Funding</dt>
                    <dd className="mt-3 text-body text-ink">Paid from the wallet, nothing drawn</dd>
                  </div>
                )}
              </dl>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <PillLink href={explorerTx(r.txHash)}>View the payout on Arc mainnet</PillLink>
                <PillLink href={`/view/${r.payout.payer}`} variant="secondary">
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
