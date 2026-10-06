import Image from "next/image";

// Official logo files from each company's own brand kit, shown unaltered.
const PARTNERS = [
  { name: "Arc", href: "https://www.arc.io", src: "/logos/arc.svg", w: 500, h: 171, height: 44 },
  { name: "Circle", href: "https://www.circle.com", src: "/logos/circle.svg", w: 467, h: 120, height: 30 },
  { name: "cirBTC", href: "https://www.circle.com/cirbtc", src: "/logos/cirbtc.svg", w: 1202, h: 325, height: 34 },
  { name: "USDC", href: "https://www.circle.com/usdc", src: "/logos/usdc.svg", w: 1068, h: 309, height: 34 },
  { name: "Morpho", href: "https://morpho.org", src: "/logos/morpho.svg", w: 352, h: 71, height: 32 },
] as const;

export function BuiltOn() {
  return (
    <section className="on-light bg-paper text-ink">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-20 text-center md:py-24">
        <h2 className="text-h2 font-[550] tracking-[-0.024em]">Built on</h2>
        <p className="mx-auto mt-3 max-w-xl text-body text-body">
          Tidrel uses these as they are. It deploys no contracts of its own.
        </p>
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-14 gap-y-10">
          {PARTNERS.map((p) => (
            <li key={p.name}>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={p.name}
                className="block rounded-badge opacity-90 transition-opacity hover:opacity-100"
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
        </ul>
      </div>
    </section>
  );
}
