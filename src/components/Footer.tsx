import Link from "next/link";
import { ADDRESSES, EXPLORER_URL, explorerAddress } from "@/lib/chain";
import { ExternalGlyph } from "./PillLink";
import { TidrelLockup } from "./TidrelMark";

const GROUPS = [
  {
    title: "Tidrel",
    links: [
      { label: "Open the desk", href: "/desk" },
      { label: "Mainnet proof", href: "/proof" },
      { label: "Safety rules", href: "/safety" },
      { label: "Contracts", href: "/contracts" },
    ],
  },
  {
    title: "On Arc mainnet",
    links: [
      { label: "TidrelSettler", href: explorerAddress(ADDRESSES.settler) },
      { label: "Morpho Blue", href: explorerAddress(ADDRESSES.morpho) },
      { label: "cirBTC", href: explorerAddress(ADDRESSES.cirBtc) },
      { label: "Arc mainnet explorer", href: EXPLORER_URL },
    ],
  },
  {
    title: "Source",
    links: [{ label: "GitHub", href: "https://github.com/mystiquemide/tidrel" }],
  },
] as const;

// Every photograph on the site, with a link to its page on Unsplash.
const PHOTOS = [
  { by: "Alex Gruber", href: "https://unsplash.com/photos/purple-curtain-in-close-up-photography-kDXMFY6phik" },
  { by: "Alexander X.", href: "https://unsplash.com/photos/purple-fabric-drapes-in-a-soft-abstract-pattern-OoR2CLJnSws" },
  { by: "Traxer", href: "https://unsplash.com/photos/a-bitcoin-sitting-on-top-of-a-black-surface-Y2P9q_IQlSU" },
  { by: "Timelab", href: "https://unsplash.com/photos/shipping-port-with-containers-and-cranes-sWOvgOOFk1g" },
  { by: "Alexey Marchenko", href: "https://unsplash.com/photos/an-aerial-view-of-the-ocean-with-waves-1l3bVHDWkpU" },
  { by: "Enes Gundogdu", href: "https://unsplash.com/photos/modern-glass-skyscrapers-with-reflective-surfaces-z0jI8BA1Vmc" },
] as const;

const linkClass =
  "inline-flex items-center gap-1.5 rounded-input py-1 text-body text-graphite underline-offset-4 hover:text-ink hover:underline";

/** A white panel set into a black band, on every marketing page. */
export function Footer() {
  return (
    <footer className="bg-obsidian px-2 pt-2 pb-2 md:px-4 md:pb-4">
      <div className="mx-auto w-full max-w-[1224px] rounded-card bg-porcelain px-6 py-12 md:px-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" aria-label="Tidrel home" className="inline-block rounded-input">
              <TidrelLockup tone="light" size={28} />
            </Link>
            <p className="mt-4 max-w-xs text-body text-slate">
              Settlement credit on Arc mainnet. Your wallet signs every step.
            </p>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="eyebrow">{g.title}</h2>
              <ul className="mt-4 flex flex-col gap-1">
                {g.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {l.label}
                        <ExternalGlyph className="text-smoke" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-mist pt-6 text-small text-slate">
          <p>
            Tidrel moves real USDC on Arc mainnet. Read the{" "}
            <Link href="/safety" className="rounded-input text-ink underline underline-offset-4">
              safety rules
            </Link>{" "}
            before you use it.
          </p>
          <p>
            Photographs on Unsplash by{" "}
            {PHOTOS.map((p, i) => (
              <span key={p.by}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-input underline decoration-ash underline-offset-4 hover:text-ink"
                >
                  {p.by}
                </a>
                {i < PHOTOS.length - 2 ? ", " : i === PHOTOS.length - 2 ? " and " : "."}
              </span>
            ))}
          </p>
        </div>
      </div>
    </footer>
  );
}
