import { ADDRESSES, explorerAddress } from "@/lib/chain";
import { PillLink } from "./PillLink";
import { TidrelMark } from "./TidrelMark";

const PROOF_LINKS = [
  { label: "cirBTC", href: explorerAddress(ADDRESSES.cirBtc) },
  { label: "Multicall3From", href: explorerAddress(ADDRESSES.multicall3From) },
  { label: "TidrelSettler", href: explorerAddress(ADDRESSES.settler) },
  { label: "Morpho Blue", href: explorerAddress(ADDRESSES.morpho) },
];

export function Hero() {
  return (
    <section className="on-light bg-tide-wash text-ink">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[1200px] flex-col items-center justify-center px-6 py-20 text-center md:py-28">
        <span className="inline-flex items-center gap-2 rounded-badge bg-bone px-3 py-2 text-[14px] font-medium">
          <TidrelMark size={18} strokeWidth={2.8} className="text-tide-deep" />
          Settlement credit on Arc
        </span>

        <h1 className="mt-8 text-[44px] leading-[1.02] font-[550] tracking-[-0.03em] sm:text-[56px] md:text-display">
          <span className="block">Settle in USDC.</span>
          <span className="block">Keep your bitcoin.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lead text-body">
          Post cirBTC once. Tidrel draws the exact USDC a trade needs and repays
          it the moment USDC comes back.
        </p>

        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          <PillLink href="/desk" variant="primary">
            Open the desk
          </PillLink>
          <PillLink href="/proof" variant="soft">
            See the mainnet run
          </PillLink>
        </div>

        <p className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-small text-body">
          <span className="font-medium text-ink">Live on Arc mainnet</span>
          {PROOF_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-badge text-tide-deep underline decoration-tide-deep/40 underline-offset-4 hover:decoration-tide-deep"
            >
              {l.label}
            </a>
          ))}
        </p>
      </div>
    </section>
  );
}
