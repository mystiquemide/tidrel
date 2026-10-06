"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PillLink } from "./PillLink";
import { TidrelLockup } from "./TidrelMark";

/**
 * Landing nav. It sits flat on the hero tint, then turns solid with a hairline
 * once the page scrolls so content never runs under bare text.
 */
export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`on-light sticky top-0 z-50 border-b transition-colors duration-150 ${
        scrolled ? "border-ink/10 bg-paper" : "border-transparent bg-tide-wash"
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6"
      >
        <Link href="/" aria-label="Tidrel home" className="rounded-badge">
          <TidrelLockup tone="light" size={28} />
        </Link>
        <PillLink href="/desk" variant="ink" size="sm">
          Open the desk
        </PillLink>
      </nav>
    </header>
  );
}
