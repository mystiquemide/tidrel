import type { CSSProperties } from "react";
import Image from "next/image";
import { Reveal } from "./Reveal";

// Official logo files from each company's own brand kit, shown unaltered.
const PARTNERS = [
  { name: "Arc", href: "https://www.arc.io", src: "/logos/arc.svg", w: 500, h: 171, height: 36 },
  { name: "Circle", href: "https://www.circle.com", src: "/logos/circle.svg", w: 467, h: 120, height: 24 },
  { name: "cirBTC", href: "https://www.circle.com/cirbtc", src: "/logos/cirbtc.svg", w: 1202, h: 325, height: 28 },
  { name: "USDC", href: "https://www.circle.com/usdc", src: "/logos/usdc.svg", w: 1068, h: 309, height: 28 },
  { name: "Morpho", href: "https://morpho.org", src: "/logos/morpho.svg", w: 352, h: 71, height: 26 },
] as const;

/** The partner strip directly under the hero, logos split by hairlines. */
export function BuiltOn() {
  return (
    <section aria-labelledby="built-on" className="border-b border-mist bg-porcelain">
      <div className="mx-auto flex w-full max-w-[1224px] flex-col gap-6 px-6 py-8 md:px-8 lg:flex-row lg:items-center lg:gap-10">
        <h2 id="built-on" className="eyebrow shrink-0">
          Built on
        </h2>
        <Reveal as="ul" className="grid flex-1 grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {PARTNERS.map((p, i) => (
            <li key={p.name} style={{ "--i": i } as CSSProperties} className="rv flex justify-center border-mist last:col-span-2 sm:border-l sm:first:border-l-0 sm:last:col-span-1 lg:first:border-l">
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={p.name}
                className="flex h-12 items-center rounded-input px-4 opacity-90 transition-opacity hover:opacity-100"
              >
                <Image
                  src={p.src}
                  alt={p.name}
                  width={p.w}
                  height={p.h}
                  unoptimized
                  style={{ height: p.height, width: "auto" }}
                />
              </a>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
