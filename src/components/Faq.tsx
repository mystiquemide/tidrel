import Link from "next/link";
import { formatUsdc } from "@/lib/format";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { MIN_HEALTH } from "@/lib/settle";

/** The questions a desk asks before connecting a wallet, answered plainly. */
export async function Faq() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const floor = MIN_HEALTH.toFixed(2);

  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "What does a loan cost?",
      a: (
        <>
          Interest for the seconds the loan is open, at the variable rate of the cirBTC and USDC
          market on Morpho Blue. Tidrel adds no fee.
          {head?.interestUsdc != null && (
            <>
              {" "}The latest loan in the mainnet run cost{" "}
              <span className="num text-ink">{formatUsdc(head.interestUsdc, 6)} USDC</span> in total.
            </>
          )}
        </>
      ),
    },
    {
      q: "What happens if the bitcoin price drops?",
      a: (
        <>
          Your loan health drops with it. Tidrel refuses any new draw below {floor} and your desk
          warns you as health falls. Below 1.00 the market can liquidate part of your cirBTC, so
          repay or add collateral before then. Loans here stay open for seconds, which keeps that
          window small.
        </>
      ),
    },
    {
      q: "Who holds my bitcoin?",
      a: (
        <>
          Your cirBTC sits as collateral in the Morpho Blue market, in your wallet&apos;s own
          position. Tidrel never holds funds or keys, and its contract has no owner.{" "}
          <Link href="/contracts" className="rounded-input text-violet underline underline-offset-4">
            See the contracts
          </Link>
          .
        </>
      ),
    },
    {
      q: "What do I need to start?",
      a: (
        <>
          A regular wallet on Arc mainnet that holds cirBTC. Your first draw posts the cirBTC it
          needs. To look around first,{" "}
          <Link href="/desk" className="rounded-input text-violet underline underline-offset-4">
            open the desk
          </Link>{" "}
          and pick &ldquo;View the demo desk&rdquo;.
        </>
      ),
    },
  ];

  return (
    <section aria-labelledby="faq" className="bg-porcelain">
      <div className="mx-auto grid w-full max-w-[1224px] gap-10 px-6 pb-24 md:px-8 md:pb-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 id="faq" className="mt-4 text-[30px] leading-[1.1] tracking-[-0.015em] md:text-h2">
            Before you connect a wallet.
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <details key={it.q} className="group rounded-panel bg-cloud px-6 open:pb-6 md:px-8">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-h4 font-medium text-ink marker:hidden md:py-6 [&::-webkit-details-marker]:hidden">
                {it.q}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-porcelain text-ink transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M6 1v10M1 6h10" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-2xl text-body text-slate">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
