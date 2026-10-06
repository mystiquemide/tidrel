import { explorerTx } from "@/lib/chain";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";

type LinkKey = "draw" | "payout" | "repay";

const STEPS: {
  label: string;
  title: string;
  body: string;
  link: LinkKey;
  linkLabel: string;
}[] = [
  {
    label: "Draw",
    title: "Exact USDC against cirBTC.",
    body: "Tidrel draws only the shortfall a trade needs, never more, and your bitcoin stays posted as collateral.",
    link: "draw",
    linkLabel: "See the draw on Arc mainnet",
  },
  {
    label: "Settle",
    title: "One Arc mainnet transaction.",
    body: "Every counterparty is paid together, and each payment is tagged with your trade reference on chain.",
    link: "payout",
    linkLabel: "See the payout on Arc mainnet",
  },
  {
    label: "Repay",
    title: "On arrival.",
    body: "The debt stays open for seconds, not days. When USDC comes back, one signature closes it.",
    link: "repay",
    linkLabel: "See the repay on Arc mainnet",
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
    <section id="how-it-works" className="scroll-mt-16 bg-ink text-text focus:outline-none">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-24 md:py-32">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[40px] leading-[1.05] font-[550] tracking-[-0.03em] md:text-h2">
              How it works
            </h2>
            <p className="mt-4 text-lead text-ebb">
              Three steps. Each one is a transaction on Arc mainnet that you can open and check.
            </p>
          </div>
          <PillLink href="/safety" variant="dark" className="self-start md:self-auto">
            Read the safety rules
          </PillLink>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => {
            const hash = hashes[step.link];
            return (
              <li
                key={step.label}
                className="flex flex-col rounded-card bg-panel p-6 md:p-8"
              >
                <p className="text-[14px] font-medium text-tide">{step.label}</p>
                <h3 className="mt-3 text-sub font-medium text-text">{step.title}</h3>
                <p className="mt-3 text-small text-ebb">{step.body}</p>
                <div className="mt-auto pt-8">
                  {hash && (
                    <a
                      href={explorerTx(hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-badge py-1 text-small font-medium text-tide underline decoration-tide/40 underline-offset-4 hover:decoration-tide"
                    >
                      {step.linkLabel}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
