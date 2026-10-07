import type { CSSProperties } from "react";

/**
 * A heading's text split into words that arrive one at a time. "scroll" words wait
 * for the nearest Reveal, "load" words play as the page opens. Screen readers get
 * the sentence once, from the hidden copy.
 */
export function Words({
  text,
  mode = "scroll",
  start = 0,
}: {
  text: string;
  mode?: "scroll" | "load";
  start?: number;
}) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className={mode === "load" ? "load-word" : "word"}
            style={{ "--i": start + i } as CSSProperties}
          >
            {i < words.length - 1 ? `${w} ` : w}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * A figure whose digits roll into place like an odometer when its Reveal comes into
 * view. Anything that is not a digit (a point, a comma, a space) stays still. The
 * real value is read once by screen readers.
 */
export function Roll({ value, className }: { value: string; className?: string }) {
  let col = 0;
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="roll">
        {[...value].map((ch, i) => {
          if (!/[0-9]/.test(ch)) {
            return (
              <span key={i} className="whitespace-pre">
                {ch}
              </span>
            );
          }
          const style = { "--d": Number(ch), "--i": col++ } as CSSProperties;
          return (
            <span key={i} className="roll-col" style={style}>
              {"0123456789".split("").map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          );
        })}
      </span>
    </span>
  );
}
