"use client";

import { useEffect } from "react";
import { scrollToSection, takeRememberedSection } from "@/lib/scroll";

/** On the home page: if the nav sent us here for a section, scroll to it once. */
export function ScrollOnLoad() {
  useEffect(() => {
    const id = takeRememberedSection();
    if (!id) return;
    const frame = requestAnimationFrame(() => scrollToSection(id));
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}
