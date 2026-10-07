import Image from "next/image";
import Link from "next/link";
import { DEMO_DESK_ADDRESS } from "@/lib/chain";
import { formatDurationWords, formatUsdc } from "@/lib/format";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { PillLink } from "./PillLink";

/**
 * Full-bleed violet curtain with the claim set low and left, as the reference does.
 * The photograph is darkened toward the bottom left when it is processed, so white
 * text there stays above 6:1 without any overlay in CSS. The proof line under the
 * actions is read from Arc and is left out when the read fails.
 */
export async function Hero() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const proof = head && head.openSeconds !== null && head.interestUsdc !== null ? head : null;

  return (
    <section className="on-image relative isolate flex min-h-[640px] items-end overflow-hidden bg-ink text-porcelain h-[92svh] max-h-[900px]">
      <Image
        src="/images/hero.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-32 pb-14 md:px-8 md:pb-20">
        <h1 className="text-[44px] leading-[1.05] tracking-[-0.02em] text-porcelain sm:text-[56px] md:text-display">
          <span className="block">Settle in USDC.</span>
          <span className="block">Keep your bitcoin.</span>
        </h1>
        <p className="mt-6 max-w-[34rem] text-lead text-porcelain/85">
          Post cirBTC once. Tidrel draws the exact USDC a trade needs and repays it the
          moment USDC comes back.
        </p>
        <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <PillLink href="/desk" variant="inverse">
            Open the desk
          </PillLink>
          <Link
            href={`/view/${DEMO_DESK_ADDRESS}`}
            className="rounded-input text-body font-medium text-porcelain underline decoration-porcelain/40 underline-offset-[6px] hover:decoration-porcelain"
          >
            See a live desk, no wallet needed
          </Link>
        </div>
        {proof && (
          <Link
            href="/proof"
            className="mt-10 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-input border-t border-porcelain/20 pt-5 text-small text-porcelain/80 hover:text-porcelain"
          >
            <span className="eyebrow text-porcelain/70">Latest loan on Arc mainnet</span>
            <span>
              Open for <span className="num text-porcelain">{formatDurationWords(proof.openSeconds!)}</span>, cost{" "}
              <span className="num text-porcelain">{formatUsdc(proof.interestUsdc!, 6)} USDC</span> in{" "}
              <span className="whitespace-nowrap">
                interest <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
