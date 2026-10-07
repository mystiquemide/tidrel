import Link from "next/link";
import { getDemoCycles, headlineCycle, proofFigures } from "@/lib/landing";
import { PillLink } from "./PillLink";

/**
 * Four figures from the newest repaid cycle, read from Arc. If the chain cannot be
 * read or no cycle is repaid yet, nothing is rendered: the proof page carries the
 * honest empty state, and the home page never shows a number it does not have.
 */
export async function ProofCards() {
  const data = await getDemoCycles();
  const figures = data.ok ? proofFigures(headlineCycle(data.settlements)) : null;
  if (!figures) return null;

  const cards = [
    { value: figures.drawn, label: "USDC drawn. Only what the trade needed." },
    { value: figures.seconds, label: "seconds the loan stayed open." },
    { value: figures.interest, label: "USDC in interest for the whole loan." },
    { value: figures.legs, label: "counterparties paid in one transaction." },
  ];

  return (
    <section className="on-light bg-paper px-3 pt-4 text-ink md:px-6 md:pt-6">
      <div className="mx-auto w-full max-w-[1320px] rounded-[28px] bg-tide-wash px-6 py-20 md:rounded-[36px] md:px-12 md:py-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-h2">
              Numbers from a real loan on Arc mainnet.
            </h2>
            <p className="mt-4 text-lead text-body">
              Read from the chain, not typed in. Open the proof page to check every one.
            </p>
          </div>
          <PillLink href="/proof" variant="ink" className="self-start md:self-auto">
            See the mainnet proof
          </PillLink>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.label} className="flex">
              <Link
                href="/proof"
                className="flex w-full flex-col justify-between rounded-card border border-ink/10 bg-paper p-6 transition-colors duration-150 hover:border-tide-deep/50 md:p-8"
              >
                <span className="text-[34px] leading-none font-medium tracking-[-0.03em] text-tide-deep md:text-[40px]">
                  {c.value}
                </span>
                <span className="mt-6 text-small text-body">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
