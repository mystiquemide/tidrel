import { explorerTx, RUN_BUDGET_USDC } from "@/lib/chain";
import { formatDurationWords, formatUsdc, shortHash } from "@/lib/format";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";
import { SettlementsTable } from "./SettlementsTable";
import { TidrelMark } from "./TidrelMark";

export async function ProofBand() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const rows = data.ok ? [...data.settlements].reverse() : [];

  return (
    <section className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <span className="inline-flex items-center gap-2 rounded-badge bg-panel px-3 py-2 text-[14px] font-medium">
          <TidrelMark size={18} strokeWidth={2.8} className="text-tide" />
          Mainnet proof
        </span>

        {head && head.openSeconds !== null && head.interestUsdc !== null ? (
          <>
            <h1 className="mt-8 max-w-[18ch] text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[44px]">
              A loan against bitcoin that existed for{" "}
              <span className="text-tide">
                {formatDurationWords(head.openSeconds)}
              </span>
              .
            </h1>
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
            <h1 className="mt-8 max-w-[20ch] text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[44px]">
              {data.ok ? "First settlements land with the mainnet run." : "Chain data is unavailable right now."}
            </h1>
            <p className="mt-6 max-w-2xl text-lead text-ebb">
              {data.ok
                ? "Every figure on this page is read from Arc mainnet. There is nothing to show until a draw has been repaid."
                : "Every figure on this page is read from Arc mainnet, so nothing is shown until the read works. Try again in a moment."}
            </p>
          </>
        )}

        {rows.length > 0 && (
          <div className="mt-16">
            <SettlementsTable rows={rows} />
          </div>
        )}

        <p className="mt-10 max-w-3xl text-small text-muted">
          Mainnet run sized to a {RUN_BUDGET_USDC} USDC budget.
          Counterparties in this run are builder-controlled wallets. The same code path runs at
          any size.
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
