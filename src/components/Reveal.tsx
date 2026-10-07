"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Marks its element with data-in once it scrolls into view, which plays the .rv,
 * .rv-scale, .word, .rv-line and .roll-col transitions inside it. It fires once and
 * then stops watching. The content is server rendered and visible without JavaScript.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
  threshold = 0.2,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  threshold?: number;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref} data-reveal="" className={className} {...rest}>
      {children}
    </Tag>
  );
}
