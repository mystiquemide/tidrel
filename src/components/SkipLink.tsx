/** First focusable element on a page: lets keyboard users jump past the nav. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="on-light sr-only rounded-pill bg-paper px-4 py-2 text-small text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
    >
      Skip to content
    </a>
  );
}
