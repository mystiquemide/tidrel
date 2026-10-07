import Image from "next/image";
import { explorerTx } from "@/lib/chain";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";

type LinkKey = "draw" | "payout" | "repay";

// Each screen is a real capture of the built app, read from Arc mainnet by
// scripts/capture.mts. Nothing in them is drawn or edited by hand.
const STEPS: {
  n: string;
  title: string;
  body: string;
  screen: { src: string; w: number; h: number; alt: string };
  link: LinkKey;
  linkLabel: string;
}[] = [
  {
    n: "01",
    title: "Draw exact USDC against cirBTC.",
    body: "Your desk shows what you can draw right now. Tidrel draws only the shortfall a trade needs, and your bitcoin stays posted as collateral.",
    screen: {
      src: "/screens/draw.png",
      w: 1520,
      h: 680,
      alt: "The demo desk on Arc mainnet: USDC available to draw, cirBTC collateral posted, borrowed now and cost so far.",
    },
    link: "draw",
    linkLabel: "See a draw",
  },
  {
    n: "02",
    title: "Pay every counterparty in one transaction.",
    body: "Each payment carries your trade reference on chain, and every settlement gets a receipt you can share.",
    screen: {
      src: "/screens/settle.png",
      w: 1560,
      h: 904,
      alt: "A settlement receipt from Arc mainnet: the trade reference, the total paid and each counterparty with its amount.",
    },
    link: "payout",
    linkLabel: "See a payout",
  },
  {
    n: "03",
    title: "Repay the moment USDC comes back.",
    body: "The debt stays open for seconds, not days. One signature closes it, and the tide line shows every draw and repay.",
    screen: {
      src: "/screens/repay.png",
      w: 1520,
      h: 666,
      alt: "The tide line of the demo desk: one crest per loan, rising at each draw and falling back at each repay.",
    },
    link: "repay",
    linkLabel: "See a repay",
  },
];

export async function HowItWorks() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const hashes: Record<LinkKey, string | null> = {
    draw: head?.drawTxHash ?? null,
    payout: head?.txHash ?? null,
    repay: head?.repayTxHash ?? null,
  };

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-24 bg-porcelain focus:outline-none"
    >
      <div className="mx-auto w-full max-w-[1224px] px-6 pb-24 md:px-8 md:pb-36">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 id="how-it-works-title" className="mt-4 text-[30px] leading-[1.1] tracking-[-0.015em] md:text-h2">
              Three steps, each one a transaction on Arc mainnet.
            </h2>
          </div>
          <PillLink href="/safety" variant="secondary" className="self-start md:self-auto">
            Read the safety rules
          </PillLink>
        </div>

        <ol className="mt-14 flex flex-col gap-16 md:gap-24">
          {STEPS.map((step, i) => {
            const hash = hashes[step.link];
            return (
              <li
                key={step.n}
                className={`grid items-center gap-8 lg:gap-16 ${
                  i % 2 === 1 ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                }`}
              >
                <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="num text-small text-violet">{step.n}</p>
                  <h3 className="mt-3 text-[26px] leading-[1.15] tracking-[-0.01em] text-ink md:text-h3">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-body text-slate">{step.body}</p>
                  {hash && (
                    <PillLink href={explorerTx(hash)} variant="secondary" size="sm" className="mt-8">
                      {step.linkLabel}
                    </PillLink>
                  )}
                </div>
                <figure className={`rounded-card bg-violet-tint p-4 sm:p-6 md:p-8 ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                  <Image
                    src={step.screen.src}
                    alt={step.screen.alt}
                    width={step.screen.w}
                    height={step.screen.h}
                    sizes="(min-width: 1024px) 680px, 100vw"
                    className="h-auto w-full"
                  />
                </figure>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
