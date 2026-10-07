import Link from "next/link";
import type { ReactNode } from "react";

export type PillVariant = "primary" | "secondary" | "inverse";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-40";

const VARIANTS: Record<PillVariant, string> = {
  // White on violet is 4.9:1. Violet marks the one action that matters on a screen.
  primary: "bg-violet text-porcelain hover:bg-violet-deep focus-visible:outline-violet",
  // Every second action: a filled cloud pill, never an outline.
  secondary: "bg-cloud text-ink hover:bg-mist focus-visible:outline-violet",
  // On photographs and violet bands only.
  inverse: "bg-porcelain text-ink hover:bg-cloud focus-visible:outline-porcelain",
};

const SIZES = {
  md: "h-12 px-6 text-[16px]",
  sm: "h-10 px-5 text-[14px]",
} as const;

export type PillSize = keyof typeof SIZES;

/** The class list for a pill, so a <button> and a link look exactly alike. */
export function pillClass(variant: PillVariant = "primary", size: PillSize = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

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
  variant?: PillVariant;
  size?: PillSize;
  className?: string;
  children: ReactNode;
}) {
  const classes = pillClass(variant, size, className);
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <ExternalGlyph />
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** The small arrow that marks a link leaving Tidrel. */
export function ExternalGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d="M4 2h6v6M10 2L3 9" />
    </svg>
  );
}
