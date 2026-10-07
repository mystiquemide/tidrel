const WAVE_UPPER = "M2.5 9.5C5.5 5.5 8.5 5.5 12 9.5S18.5 13.5 21.5 9.5";
const WAVE_LOWER = "M2.5 17C5.5 13 8.5 13 12 17S18.5 21 21.5 17";

/**
 * The Tidrel mark: two tide lines, one wave over another, drawn as round-capped
 * strokes on a 24 unit grid. It takes its color from the parent (currentColor).
 * Pass a heavier strokeWidth at 16px or below so the waves stay open.
 */
export function TidrelMark({
  size = 24,
  strokeWidth = 2.6,
  className,
  title,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={WAVE_UPPER} />
      <path d={WAVE_LOWER} />
    </svg>
  );
}

/** Lowercase "tidrel" in Geist 600. Sized in em, so set the font size on the parent. */
export function TidrelWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block font-semibold leading-none tracking-[-0.025em] ${className ?? ""}`}
    >
      tidrel
    </span>
  );
}

export function TidrelLockup({
  tone = "dark",
  size = 24,
  className,
}: {
  /** "dark" is for photographs and dark bands (all white), "light" for white surfaces. */
  tone?: "dark" | "light";
  size?: number;
  className?: string;
}) {
  const light = tone === "light";
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${light ? "text-ink" : "text-porcelain"} ${className ?? ""}`}
      style={{ fontSize: size * 0.95 }}
    >
      <TidrelMark
        size={size}
        strokeWidth={size <= 18 ? 3 : 2.6}
        className={light ? "text-violet" : "text-porcelain"}
      />
      <TidrelWordmark />
    </span>
  );
}
