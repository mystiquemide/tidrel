import Image from "next/image";
import { ADDRESSES, DEMO_DESK_ADDRESS, explorerAddress } from "@/lib/chain";
import { shortHash } from "@/lib/format";
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
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 pt-20 text-center md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-badge bg-bone px-3 py-2 text-[14px] font-medium">
          <TidrelMark size={18} strokeWidth={2.8} className="text-tide-deep" />
          Settlement credit on Arc mainnet
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
              className="inline-block rounded-badge py-1 text-tide-deep underline decoration-tide-deep/40 underline-offset-4 hover:decoration-tide-deep"
            >
              {l.label}
            </a>
          ))}
        </p>
      </div>

      {/* A real capture of the demo desk, read from Arc mainnet by the built app. It is
          cut off at the bottom and sits flush on the dark section that follows. */}
      <div className="mx-auto mt-14 w-full max-w-[1100px] px-6">
        <div className="overflow-hidden rounded-t-card border border-b-0 border-ink/15 bg-ink shadow-[0_-8px_40px_rgba(11,14,17,0.12)]">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-3" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-pill bg-line" />
            <span className="h-2.5 w-2.5 rounded-pill bg-line" />
            <span className="h-2.5 w-2.5 rounded-pill bg-line" />
            <span className="num ml-3 truncate rounded-badge bg-ink px-3 py-1 text-caption text-muted">
              tidrel.vercel.app/view/{shortHash(DEMO_DESK_ADDRESS)}
            </span>
          </div>
          <div className="max-h-[300px] overflow-hidden sm:max-h-[460px] md:max-h-[560px]">
            <Image
              src="/captures/desk.png"
              alt="The Tidrel desk for the demo wallet: collateral posted, available to draw, borrowed now, cost so far, and the tide line of its mainnet draws and repays."
              width={2560}
              height={1622}
              priority
              sizes="(min-width: 1148px) 1100px, 100vw"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
