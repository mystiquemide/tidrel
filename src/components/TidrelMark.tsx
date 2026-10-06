/**
 * The Tidrel mark: two horizontal bars on a 24 unit grid. The upper bar is 20
 * wide, the lower is 13 wide and sits flush right, so the pair reads as a tide
 * line falling away. Bars are 4 tall with 3 between them.
 */
export function TidrelMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="2" y="6.5" width="20" height="4" rx="2" fill="currentColor" />
      <rect x="9" y="13.5" width="13" height="4" rx="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Lowercase "tidrel" in Inter Tight 600 with the dot of the i replaced by a
 * short bar, the same shape as the bars in the mark. Sized in em, so set the
 * font size on the parent.
 */
export function TidrelWordmark({
  className,
  barClassName = "bg-tide",
}: {
  className?: string;
  barClassName?: string;
}) {
  return (
    <span
      className={`inline-block font-semibold leading-none tracking-[-0.02em] ${className ?? ""}`}
    >
      <span className="sr-only">tidrel</span>
      <span aria-hidden="true">
        t
        <span className="relative inline-block">
          {"\u0131"}
          <span
            className={`absolute left-1/2 top-[0.015em] h-[0.12em] w-[0.35em] -translate-x-1/2 rounded-full ${barClassName}`}
          />
        </span>
        drel
      </span>
    </span>
  );
}

export function TidrelLockup({
  tone = "dark",
  size = 24,
  className,
}: {
  /** "dark" is for dark surfaces (light text, light teal), "light" for light surfaces. */
  tone?: "dark" | "light";
  size?: number;
  className?: string;
}) {
  const light = tone === "light";
  return (
    <span
      className={`inline-flex items-center gap-2 ${light ? "text-ink" : "text-text"} ${className ?? ""}`}
      style={{ fontSize: size * 0.95 }}
    >
      <TidrelMark size={size} className={light ? "text-tide-deep" : "text-tide"} />
      <TidrelWordmark barClassName={light ? "bg-tide-deep" : "bg-tide"} />
    </span>
  );
}
