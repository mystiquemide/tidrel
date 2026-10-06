"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PillLink } from "./PillLink";
import { TidrelLockup } from "./TidrelMark";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/proof", label: "Proof" },
] as const;

/**
 * Site nav. It sits flat on the page surface, then gains a hairline once the page
 * scrolls. "light" is for the landing hero, "dark" for pages on the ink surface.
 * Under the sm breakpoint the links move into a menu so nothing is hidden.
 */
export function NavBar({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [scrolled, setScrolled] = useState(false);
  // The menu is remembered per page, so moving to another page closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const pathname = usePathname();
  const dark = tone === "dark";
  const open = openFor === pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const surface = dark
    ? scrolled || open
      ? "border-line bg-ink"
      : "border-transparent bg-ink"
    : scrolled || open
      ? "on-light border-ink/10 bg-paper"
      : "on-light border-transparent bg-tide-wash";

  const linkTone = dark
    ? "text-text hover:text-tide"
    : "text-ink hover:text-tide-deep";

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
                className={`hidden rounded-badge px-2 py-1 text-[14px] font-medium underline-offset-[6px] sm:inline-flex ${linkTone} ${
                  current ? "underline decoration-2" : ""
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <PillLink href="/desk" variant={dark ? "light" : "ink"} size="sm">
            Open the desk
          </PillLink>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpenFor(open ? null : pathname)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-pill sm:hidden ${linkTone}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className={`border-t sm:hidden ${dark ? "border-line" : "border-ink/10"}`}
        >
          <ul className="mx-auto w-full max-w-[1200px] px-6 py-2">
            {LINKS.map((l) => {
              const current = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpenFor(null)}
                    className={`flex items-center justify-between rounded-badge py-3 text-[17px] font-medium ${linkTone}`}
                  >
                    {l.label}
                    {current && (
                      <span className="text-small font-normal opacity-70">
                        You are here
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
