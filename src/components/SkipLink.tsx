"use client";

/**
 * First focusable element on a page: lets keyboard users jump past the nav.
 * It moves focus to <main> directly, so the address bar never gains a hash.
 * Without JavaScript it still works as a plain in-page link.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        const main = document.getElementById("main");
        if (!main) return;
        e.preventDefault();
        main.setAttribute("tabindex", "-1");
        main.focus();
        main.scrollIntoView();
      }}
      className="sr-only rounded-pill bg-violet px-4 py-2 text-small text-porcelain focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
    >
      Skip to content
    </a>
  );
}
