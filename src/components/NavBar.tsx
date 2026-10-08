"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { rememberSection, scrollToSection } from "@/lib/scroll";
import { PillLink } from "./PillLink";
import { TidrelLockup } from "./TidrelMark";

type NavLink =
  | { label: string; href: string }
  // A section of the home page. It scrolls there and never adds a hash to the address.
  | { label: string; section: string };

const LINKS: NavLink[] = [
  { label: "How it works", section: "how-it-works" },
  { label: "Proof", href: "/proof" },
  { label: "Safety", href: "/safety" },
  { label: "Contracts", href: "/contracts" },
  { label: "Docs", href: "/docs" },
];

/**
 * Site nav. "overlay" floats over the home hero photograph with white text and turns
 * into a white floating bar once the page scrolls. "solid" is that white bar from the
 * start. Under the md breakpoint the links move into a menu so nothing is hidden.
 */
export function NavBar({ tone = "solid" }: { tone?: "overlay" | "solid" }) {
  const [scrolled, setScrolled] = useState(false);
  // The menu is remembered per page, so moving to another page closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const open = openFor === pathname;
  const onImage = tone === "overlay" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

  const goToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpenFor(null);
    if (pathname === "/") {
      scrollToSection(id);
    } else {
      rememberSection(id);
      router.push("/");
    }
  };

  const linkTone = onImage ? "text-porcelain hover:text-porcelain/80" : "text-ink hover:text-violet";

  return (
    <header
      className={`${tone === "overlay" ? "fixed" : "sticky"} inset-x-0 top-0 z-50 px-2 pt-2 md:px-4 ${onImage ? "on-image" : ""}`}
    >
      <nav
        aria-label="Main"
        className={`mx-auto flex h-16 w-full max-w-[1224px] items-center justify-between rounded-cell border px-4 transition-[background-color,border-color,box-shadow] duration-200 md:px-6 ${
          onImage ? "border-transparent bg-transparent" : "border-mist bg-porcelain shadow-float"
        }`}
      >
        <Link href="/" aria-label="Tidrel home" className="rounded-input">
          <TidrelLockup tone={onImage ? "dark" : "light"} size={28} />
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          {LINKS.map((l) => {
            const section = "section" in l;
            const current = !section && pathname === l.href;
            return (
              <Link
                key={l.label}
                href={section ? "/" : l.href}
                onClick={section ? goToSection(l.section) : undefined}
                aria-current={current ? "page" : undefined}
                className={`hidden rounded-input px-3 py-2 text-[15px] font-medium decoration-2 underline-offset-[10px] md:inline-flex ${linkTone} ${
                  current ? "underline decoration-violet" : ""
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <PillLink
            href="/desk"
            variant={onImage ? "inverse" : "primary"}
            size="sm"
            className="ml-2 hidden sm:inline-flex"
          >
            Open the desk
          </PillLink>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpenFor(open ? null : pathname)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-pill md:hidden ${
              onImage ? "text-porcelain" : "bg-cloud text-ink"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 7h14M3 13h14" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="mx-auto mt-2 w-full max-w-[1224px] rounded-cell border border-mist bg-porcelain p-4 shadow-float md:hidden"
        >
          <ul>
            {LINKS.map((l) => {
              const section = "section" in l;
              const current = !section && pathname === l.href;
              return (
                <li key={l.label} className="border-b border-mist last:border-b-0">
                  <Link
                    href={section ? "/" : l.href}
                    aria-current={current ? "page" : undefined}
                    onClick={section ? goToSection(l.section) : () => setOpenFor(null)}
                    className="flex items-center justify-between rounded-input py-4 text-[20px] text-ink"
                  >
                    {l.label}
                    {current && <span className="eyebrow">You are here</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <PillLink href="/desk" className="mt-4 w-full">
            Open the desk
          </PillLink>
        </div>
      )}
    </header>
  );
}
