import { explorerTx, RUN_BUDGET_USDC } from "@/lib/chain";
import { formatDurationWords, formatUsdc, shortHash } from "@/lib/format";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";
import { SettlementsTable } from "./SettlementsTable";

export async function ProofBand() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const rows = data.ok ? [...data.settlements].reverse() : [];
  const proven = head && head.openSeconds !== null && head.interestUsdc !== null;

  return (
    <section className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-36">
        <p style={{ "--i": 0 } as React.CSSProperties} className="load eyebrow">Mainnet proof</p>

        {proven ? (
          <>
            <h1 style={{ "--i": 1 } as React.CSSProperties} className="load mt-5 max-w-[20ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
              A loan against bitcoin that existed for{" "}
              <span className="text-violet">{formatDurationWords(head.openSeconds!)}</span>.
            </h1>
            <p style={{ "--i": 2 } as React.CSSProperties} className="load mt-6 max-w-2xl text-lead text-slate">
              It drew <span className="num text-ink">{formatUsdc(head.drawnUsdc, 2)} USDC</span>, paid{" "}
              <span className="num text-ink">{head.legs}</span> counterparties in one transaction, and cost{" "}
              <span className="num text-ink">{formatUsdc(head.interestUsdc!, 6)} USDC</span> in interest.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PillLink href={explorerTx(head.drawTxHash!)}>View the draw</PillLink>
              <PillLink href={explorerTx(head.txHash!)} variant="secondary">
                View the payout
              </PillLink>
              <PillLink href={explorerTx(head.repayTxHash!)} variant="secondary">
                View the repay
              </PillLink>
            </div>

            <dl className="mt-16 grid gap-px overflow-hidden border border-mist bg-mist sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "USDC drawn", v: formatUsdc(head.drawnUsdc, 2), unit: "USDC" },
                { k: "Loan open for", v: formatDurationWords(head.openSeconds!), unit: "" },
                { k: "Interest paid", v: formatUsdc(head.interestUsdc!, 6), unit: "USDC" },
                { k: "Paid in one transaction", v: String(head.legs), unit: "counterparties" },
              ].map((f) => (
                <div
                  key={f.k}
                  className="bg-porcelain p-6 md:p-8"
                >
                  <dt className="eyebrow">{f.k}</dt>
                  <dd className="mt-6 flex flex-wrap items-baseline gap-x-2">
                    <span className="num text-[30px] leading-none text-ink">{f.v}</span>
                    {f.unit && <span className="text-body text-slate">{f.unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <h1 className="mt-5 max-w-[20ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
              {data.ok ? "First settlements land with the mainnet run." : "Arc mainnet is not responding right now."}
            </h1>
            <p className="mt-6 max-w-2xl text-lead text-slate">
              {data.ok
                ? "Every figure on this page is read from Arc mainnet. There is nothing to show until a draw has been repaid."
                : "Every figure here is read live from the chain, so nothing is shown until it answers. Try again in a moment."}
            </p>
            {!data.ok && (
              <div className="mt-10">
                <PillLink href="/proof">Try again</PillLink>
              </div>
            )}
          </>
        )}

        {rows.length > 0 && (
          <div id="cycles" className="mt-16 scroll-mt-24">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-h4 font-medium">Every cycle of the run</h2>
              <span className="num rounded-pill bg-cloud px-3 py-1 text-small text-ink">{rows.length}</span>
            </div>
            <div className="card mt-5 overflow-hidden">
              <SettlementsTable rows={rows} />
            </div>
          </div>
        )}

        <p className="mt-10 max-w-3xl text-small text-slate">
          Mainnet run sized to a {RUN_BUDGET_USDC} USDC budget. Counterparties in this run are
          builder-controlled wallets. The same code path runs at any size.
          {data.ok && head && (
            <>
              {" "}
              Read from Arc mainnet at block <span className="num">{data.blockNumber.toString()}</span>
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
