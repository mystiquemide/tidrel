import Link from "next/link";
import { ADDRESSES, EXPLORER_URL, explorerAddress } from "@/lib/chain";
import { TidrelLockup, TidrelMark } from "./TidrelMark";

const GROUPS = [
  {
    title: "Tidrel",
    links: [
      { label: "Open the desk", href: "/desk" },
      { label: "Mainnet proof", href: "/proof" },
      { label: "Safety rules", href: "/safety" },
      { label: "Contracts", href: "/contracts" },
      { label: "Documentation", href: "/docs" },
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
] as const;

const linkClass =
  "inline-flex items-center gap-1.5 rounded-input py-1 text-body text-graphite underline-offset-4 hover:text-ink hover:underline";

/** A white panel set into a black band, on every marketing page. */
export function Footer() {
  return (
    <footer className="bg-obsidian px-2 pt-2 pb-2 md:px-4 md:pb-4">
      <div className="mx-auto w-full max-w-[1224px] rounded-card bg-porcelain px-6 py-12 md:px-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
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
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-6 border-t border-mist pt-6 text-small text-slate">
          <p>
            Tidrel moves real USDC on Arc mainnet. Read the{" "}
            <Link href="/safety" className="rounded-input text-ink underline underline-offset-4">
              safety rules
            </Link>{" "}
            before you use it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2">
              <TidrelMark size={16} strokeWidth={3} className="text-violet" />
              <span>
                <span aria-hidden="true">&copy;</span>
                <span className="sr-only">Copyright</span> {new Date().getFullYear()} Tidrel. All rights reserved.
              </span>
            </p>
            <nav aria-label="Legal" className="flex gap-5">
              <Link href="/terms" className="rounded-input underline-offset-4 hover:text-ink hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="rounded-input underline-offset-4 hover:text-ink hover:underline">
                Privacy
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
