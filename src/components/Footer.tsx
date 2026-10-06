import Link from "next/link";
import { ADDRESSES, EXPLORER_URL, explorerAddress } from "@/lib/chain";
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
      { label: "Arc explorer", href: EXPLORER_URL },
    ],
  },
  {
    title: "Source",
    links: [{ label: "GitHub", href: "https://github.com/mystiquemide/tidrel" }],
  },
] as const;

const linkClass =
  "inline-block rounded-badge py-1 text-small text-ebb underline-offset-4 hover:text-text hover:underline";

/** Home page only. The proof, safety and contracts pages carry no footer. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" aria-label="Tidrel home" className="inline-block rounded-badge">
              <TidrelLockup tone="dark" size={28} />
            </Link>
            <p className="mt-4 max-w-xs text-small text-muted">
              Settlement credit on Arc mainnet. Your wallet signs every step.
            </p>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <h2 className="text-small font-medium text-text">{g.title}</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {g.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-14 border-t border-line pt-6 text-small text-muted">
          Tidrel moves real USDC on Arc mainnet. Read the{" "}
          <Link href="/safety" className="rounded-badge text-ebb underline underline-offset-4">
            safety rules
          </Link>{" "}
          before you use it.
        </p>
      </div>
    </footer>
  );
}
