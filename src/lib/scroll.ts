/**
 * In-page navigation that never writes a hash into the address bar.
 * Browser only: call from event handlers and effects.
 */

/** Set by the nav on other pages so the home page scrolls to a section after it loads. */
export const SCROLL_KEY = "tidrel-scroll";

export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  // Move focus too, so keyboard and screen reader users land where the page scrolled.
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}

export function rememberSection(id: string) {
  try {
    sessionStorage.setItem(SCROLL_KEY, id);
  } catch {
    // Private mode can block storage. The home page then just opens at the top.
  }
}

export function takeRememberedSection(): string | null {
  try {
    const id = sessionStorage.getItem(SCROLL_KEY);
    if (id) sessionStorage.removeItem(SCROLL_KEY);
    return id;
  } catch {
    return null;
  }
}
