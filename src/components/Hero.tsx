import Image from "next/image";
import Link from "next/link";
import { PillLink } from "./PillLink";

/**
 * Full-bleed violet curtain with the claim set low and left, as the reference does.
 * The photograph is darkened toward the bottom left when it is processed, so white
 * text there stays above 6:1 without any overlay in CSS.
 */
export function Hero() {
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
        <p className="eyebrow text-porcelain/75">Settlement credit on Arc mainnet</p>
        <h1 className="mt-5 text-[44px] leading-[1.05] tracking-[-0.02em] text-porcelain sm:text-[56px] md:text-display">
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
            href="/proof"
            className="rounded-input text-body font-medium text-porcelain underline decoration-porcelain/40 underline-offset-[6px] hover:decoration-porcelain"
          >
            See the mainnet run
          </Link>
        </div>
      </div>
    </section>
  );
}
