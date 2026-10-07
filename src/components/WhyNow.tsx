import Image from "next/image";
import type { CSSProperties } from "react";
import { Words } from "./Motion";
import { Reveal } from "./Reveal";
import { SOURCES, type Source } from "@/lib/sources";
import { ExternalGlyph } from "./PillLink";

function SourceLink({ s }: { s: Source }) {
  return (
    <a
      href={s.href}
      target="_blank"
      rel="noopener noreferrer"
      className="eyebrow inline-flex items-center gap-1.5 rounded-input text-ink hover:text-violet"
    >
      {s.publisher}
      <ExternalGlyph />
      <span className="sr-only">: {s.title}</span>
    </a>
  );
}

/** What published research says about settlement capital, laid out like a newsroom. */
export function WhyNow() {
  const [lead, ...rest] = SOURCES;
  return (
    <section aria-labelledby="why-now" className="bg-porcelain">
      <Reveal className="mx-auto w-full max-w-[1224px] px-6 pb-24 md:px-8 md:pb-36">
        <p className="eyebrow rv">Why now</p>
        <h2 id="why-now" className="mt-4 max-w-2xl text-[30px] leading-[1.1] tracking-[-0.015em] md:text-h2">
          <Words text="What the market says about the capital a settlement ties up." start={1} />
        </h2>

        <div className="mt-12 grid overflow-hidden rounded-card border border-mist lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <figure
            style={{ "--i": 3 } as CSSProperties}
            className="rv-scale flex flex-col justify-between gap-6 bg-violet-tint p-4 sm:p-6 md:p-8"
          >
            {/* A real capture of the mainnet proof page, made by scripts/capture.mts. */}
            <Image
              src="/screens/proof.png"
              alt="The Tidrel mainnet proof page: a loan against bitcoin that existed for seconds, with the USDC drawn, the interest paid and the counterparties paid in one transaction."
              width={1560}
              height={1126}
              sizes="(min-width: 1024px) 620px, 100vw"
              className="h-auto w-full"
            />
            <div className="rounded-panel bg-porcelain p-6 md:p-8">
              <blockquote className="text-h4 leading-[1.35] text-ink">&ldquo;{lead.quote}&rdquo;</blockquote>
              <figcaption className="mt-5">
                <SourceLink s={lead} />
              </figcaption>
            </div>
          </figure>
          <ul className="divide-y divide-mist border-t border-mist lg:border-t-0 lg:border-l">
            {rest.map((s, i) => (
              <li key={s.href} style={{ "--i": i + 5 } as CSSProperties} className="rv flex flex-col justify-between gap-6 p-6 md:p-8">
                <blockquote className="text-body leading-[1.5] text-graphite">&ldquo;{s.quote}&rdquo;</blockquote>
                <SourceLink s={s} />
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
