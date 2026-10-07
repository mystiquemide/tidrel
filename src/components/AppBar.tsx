import Link from "next/link";
import type { ReactNode } from "react";
import { TidrelLockup } from "./TidrelMark";

/**
 * The bar for the desk and its read-only view. It has no marketing links: the
 * visitor is already inside the product, so it holds only the logo and whatever
 * belongs to this screen.
 */
export function AppBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-mist bg-porcelain text-ink">
      <nav
        aria-label="Desk"
        className="mx-auto flex h-16 w-full max-w-[1224px] items-center justify-between gap-4 px-6 md:px-8"
      >
        <Link href="/" aria-label="Tidrel home" className="rounded-input">
          <TidrelLockup tone="light" size={28} />
        </Link>
        <div className="flex items-center gap-3">{children}</div>
      </nav>
    </header>
  );
}
