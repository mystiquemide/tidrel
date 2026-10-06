"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PillLink } from "./PillLink";
import { TidrelLockup } from "./TidrelMark";

const LINKS = [{ href: "/proof", label: "Proof" }] as const;

/**
 * Site nav. It sits flat on the page surface, then gains a hairline once the page
 * scrolls. "light" is for the landing hero, "dark" for pages on the ink surface.
 */
export function NavBar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const dark = tone === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const surface = dark
    ? scrolled
      ? "border-line bg-ink"
      : "border-transparent bg-ink"
    : scrolled
      ? "on-light border-ink/10 bg-paper"
      : "on-light border-transparent bg-tide-wash";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-150 ${surface}`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6"
      >
        <Link href="/" aria-label="Tidrel home" className="rounded-badge">
          <TidrelLockup tone={dark ? "dark" : "light"} size={28} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {LINKS.map((l) => {
            const current = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`rounded-badge px-2 py-1 text-[14px] font-medium underline-offset-[6px] ${
                  dark ? "text-text hover:text-tide" : "text-ink hover:text-tide-deep"
                } ${current ? "underline decoration-2" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
          <PillLink href="/desk" variant={dark ? "light" : "ink"} size="sm">
            Open the desk
          </PillLink>
        </div>
      </nav>
    </header>
  );
}
