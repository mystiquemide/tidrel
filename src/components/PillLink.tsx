import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "soft" | "ink";

const BASE =
  "inline-flex items-center justify-center rounded-pill font-medium whitespace-nowrap transition-colors duration-150";

const VARIANTS: Record<Variant, string> = {
  // Ink text on teal is 8.0:1. White text on teal fails AA, so it is never used.
  primary: "bg-tide text-ink hover:brightness-95",
  // Ink text on the soft pill is 15.4:1. Teal text on it only reaches 4.1:1.
  soft: "bg-tide-deep/10 text-ink hover:bg-tide-deep/15",
  ink: "bg-ink text-paper hover:bg-ink/85",
};

const SIZES = {
  md: "px-6 py-3.5 text-[15px]",
  sm: "px-5 py-2.5 text-[14px]",
} as const;

/**
 * A pill button that is always a real link. Internal paths use next/link,
 * absolute URLs open in a new tab with rel noopener.
 */
export function PillLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ""}`;
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
