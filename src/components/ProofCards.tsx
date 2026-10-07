import { formatDurationWords, formatUsdc } from "@/lib/format";
import type { CSSProperties } from "react";
import { Roll, Words } from "./Motion";
import { Reveal } from "./Reveal";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";

/**
 * The headline loan and the run around it, read from Arc. If the chain cannot be read
 * or no cycle is repaid yet, nothing is rendered: the proof page carries the honest
 * empty state, and the home page never shows a number it does not have.
 */
export async function ProofCards() {
  const data = await getDemoCycles();
  if (!data.ok) return null;
  const head = headlineCycle(data.settlements);
  if (!head || head.openSeconds === null || head.interestUsdc === null) return null;

  const repaid = data.settlements.filter(
    // Full cycles only: a draw, a payout to counterparties, and a repay.
    (s) => s.state === "repaid" && s.drawTxHash && s.txHash && s.openSeconds !== null,
  );
  const times = repaid.map((s) => s.openSeconds as number);
  const shortest = Math.min(...times);
  const longest = Math.max(...times);

  return (
    <section aria-labelledby="proof-title" className="bg-porcelain">
      <Reveal className="mx-auto grid w-full max-w-[1224px] gap-10 px-6 pb-24 md:px-8 md:pb-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-12">
        <div>
          <p className="eyebrow rv">Mainnet proof</p>
          <h2 id="proof-title" className="mt-4 text-[30px] leading-[1.1] tracking-[-0.015em] md:text-h2">
            <Words text="Numbers from a real loan on Arc mainnet." start={1} />
          </h2>
          <p className="rv mt-4 text-body text-slate" style={{ "--i": 6 } as CSSProperties}>
            Read from the chain, not typed in. Every figure links to its transaction on the proof page.
          </p>
        </div>

        <div className="rv-scale grid overflow-hidden rounded-card border border-mist md:grid-cols-2" style={{ "--i": 2 } as CSSProperties}>
          <div className="on-image flex min-h-[320px] flex-col justify-between gap-10 bg-violet p-8 text-porcelain md:p-10">
            <p className="eyebrow text-porcelain/75">Headline cycle</p>
            <div>
              <p className="text-[30px] leading-[1.15] tracking-[-0.015em] md:text-h3">
                A loan against bitcoin that existed for <Roll value={formatDurationWords(head.openSeconds)} />.
              </p>
              <PillLink href="/proof" variant="inverse" size="sm" className="mt-8">
                See the mainnet proof
              </PillLink>
            </div>
          </div>
          <dl className="grid grid-rows-2 divide-y divide-mist">
            <div className="flex flex-col justify-between gap-6 p-8 md:p-10">
              <dt className="eyebrow">Interest for the whole loan</dt>
              <dd className="num text-[32px] leading-none text-ink md:text-[40px]">
                <Roll value={formatUsdc(head.interestUsdc, 6)} /> <span className="text-lead text-slate">USDC</span>
              </dd>
            </div>
            <div className="flex flex-col justify-between gap-6 p-8 md:p-10">
              <dt className="eyebrow">
                <Roll value={String(repaid.length)} /> {repaid.length === 1 ? "settlement" : "settlements"} drawn, paid and repaid
              </dt>
              <dd className="text-[24px] leading-tight text-ink md:text-[28px]">
                {shortest === longest
                  ? `Open for ${formatDurationWords(shortest)}`
                  : `${formatDurationWords(shortest)} to ${formatDurationWords(longest)} each`}
              </dd>
            </div>
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
