import Image from "next/image";
import { explorerTx } from "@/lib/chain";
import { formatDurationWords, formatUsdc } from "@/lib/format";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";

type LinkKey = "draw" | "payout" | "repay";

const STEPS: {
  title: string;
  body: string;
  image: string;
  alt: string;
  link: LinkKey;
  linkLabel: string;
}[] = [
  {
    title: "Draw",
    body: "Exact USDC against cirBTC. Tidrel draws only the shortfall a trade needs, and your bitcoin stays posted as collateral.",
    image: "/images/draw.webp",
    alt: "A gold bitcoin resting on dark stones.",
    link: "draw",
    linkLabel: "See the draw",
  },
  {
    title: "Settle",
    body: "Every counterparty is paid together in one Arc mainnet transaction, each payment tagged with your trade reference.",
    image: "/images/settle.webp",
    alt: "A container port at dusk, cranes over rows of stacked containers.",
    link: "payout",
    linkLabel: "See the payout",
  },
  {
    title: "Repay",
    body: "The debt stays open for seconds, not days. When USDC comes back, one signature closes it.",
    image: "/images/tide.webp",
    alt: "A wave breaking on black sand, seen from above.",
    link: "repay",
    linkLabel: "See the repay",
  },
];

/** A small panel over each photograph with one figure from the newest repaid cycle. */
function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-cell bg-porcelain/95 px-5 py-4 shadow-float">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1.5 text-[22px] leading-tight text-ink">{value}</p>
    </div>
  );
}

export async function HowItWorks() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const hashes: Record<LinkKey, string | null> = {
    draw: head?.drawTxHash ?? null,
    payout: head?.txHash ?? null,
    repay: head?.repayTxHash ?? null,
  };
  // Each chip shows only when its figure was read from chain.
  const chips: Record<LinkKey, { label: string; value: string } | null> = {
    draw: head ? { label: "Drawn", value: `${formatUsdc(head.drawnUsdc, 2)} USDC` } : null,
    payout: head ? { label: "Paid in one transaction", value: `${head.legs} counterparties` } : null,
    repay:
      head && head.openSeconds !== null
        ? { label: "Loan open for", value: formatDurationWords(head.openSeconds) }
        : null,
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

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-4">
          {STEPS.map((step) => {
            const hash = hashes[step.link];
            const chip = chips[step.link];
            return (
              <li key={step.title} className="flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden rounded-panel bg-cloud">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(min-width: 768px) 400px, 100vw"
                    className="object-cover"
                  />
                  {chip && (
                    <div className="absolute bottom-4 left-4">
                      <Chip {...chip} />
                    </div>
                  )}
                </div>
                <h3 className="mt-6 text-h4 font-medium text-ink">{step.title}</h3>
                <p className="mt-2 text-body text-slate">{step.body}</p>
                {hash && (
                  <div className="mt-auto pt-6">
                    <PillLink href={explorerTx(hash)} variant="secondary" size="sm">
                      {step.linkLabel}
                    </PillLink>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
