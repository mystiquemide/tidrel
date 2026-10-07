import Image from "next/image";
import type { CSSProperties } from "react";
import { Words } from "./Motion";
import { Reveal } from "./Reveal";
import { PillLink } from "./PillLink";

/** The closing band: the tide photograph in violet, one white button. */
export function FinalCta() {
  return (
    <section className="on-image relative isolate overflow-hidden bg-ink text-porcelain">
      <Image src="/images/tide.webp" alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <Reveal className="mx-auto flex w-full max-w-[1224px] flex-col items-center px-6 py-28 text-center md:px-8 md:py-40">
        <h2 className="max-w-[18ch] text-[36px] leading-[1.08] tracking-[-0.02em] text-porcelain md:text-h1">
          <Words text="Pay the trade now. Keep your bitcoin." />
        </h2>
        <p className="rv mt-6 max-w-xl text-lead text-porcelain/85" style={{ "--i": 7 } as CSSProperties}>
          Connect a wallet, post cirBTC once, and settle in USDC the moment a trade needs it.
        </p>
        <div className="rv mt-10" style={{ "--i": 8 } as CSSProperties}>
          <PillLink href="/desk" variant="inverse">
            Open the desk
          </PillLink>
        </div>
      </Reveal>
    </section>
  );
}
