import type { CSSProperties } from "react";
import { Words } from "./Motion";
import { Reveal } from "./Reveal";

const OPTIONS = [
  {
    label: "Prefund the USDC",
    body: "Hold idle USDC at every venue, ready for a trade that may not come.",
  },
  {
    label: "Sell the bitcoin",
    body: "Give up the position you meant to keep, to pay for a few minutes of settlement.",
  },
  {
    label: "Ask a broker for credit",
    body: "Relationship terms and a credit process, for a need that lasts seconds.",
  },
];

/** A faint isometric stack behind the statement, drawn in the hairline grey. */
function Lattice() {
  const hex = (cx: number, cy: number, r: number) => {
    const pts = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    });
    return pts.join(" ");
  };
  const cells = [
    [300, 120], [222, 165], [378, 165], [300, 210], [222, 255], [378, 255], [300, 300],
  ];
  return (
    <svg
      viewBox="0 0 600 420"
      className="pointer-events-none absolute inset-0 m-auto h-full w-full max-w-[640px]"
      fill="none"
      stroke="var(--color-mist)"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      {cells.map(([x, y]) => (
        <polygon key={`${x}-${y}`} points={hex(x, y, 90)} />
      ))}
    </svg>
  );
}

/** A label on a leader line that ends in a violet square, as on the reference. */
function Callout({
  label,
  body,
  side,
  i,
}: {
  label: string;
  body: string;
  side: "left" | "right" | "bottom";
  i: number;
}) {
  const stagger = { "--i": i } as CSSProperties;
  const square = <span className="rv h-2.5 w-2.5 shrink-0 bg-violet" style={stagger} aria-hidden="true" />;
  // The line draws out from its square toward the label.
  const rule = (
    <span
      className={
        side === "bottom"
          ? "rv-line-y h-10 w-px bg-ash"
          : `rv-line h-px w-16 bg-ash xl:w-28 ${side === "left" ? "origin-right" : "origin-left"}`
      }
      style={stagger}
      aria-hidden="true"
    />
  );
  const text = (
    <div
      className={`rv ${side === "left" ? "text-right" : side === "bottom" ? "text-center" : "text-left"}`}
      style={{ "--i": i + 3 } as CSSProperties}
    >
      <p className="eyebrow text-ink">{label}</p>
      <p className="mt-2 max-w-[17rem] text-small text-slate">{body}</p>
    </div>
  );
  if (side === "bottom") {
    return (
      <div className="flex flex-col items-center">
        {square}
        {rule}
        <div className="mt-3">{text}</div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-4 ${side === "left" ? "justify-end" : "justify-start"}`}>
      {side === "left" ? (
        <>
          {text}
          {rule}
          {square}
        </>
      ) : (
        <>
          {square}
          {rule}
          {text}
        </>
      )}
    </div>
  );
}

export function Problem() {
  return (
    <section aria-labelledby="problem" className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 py-24 md:px-8 md:py-36">
        <p className="eyebrow text-center">The problem</p>

        {/* One statement. Wide screens set it inside the lattice with three callouts around it,
            narrow screens follow it with the options as a list. */}
        <Reveal className="relative mt-8 lg:mt-10">
          <div className="rv hidden lg:block" style={{ "--i": 0 } as CSSProperties}>
            <Lattice />
          </div>
          <div className="relative lg:grid lg:grid-cols-[1fr_minmax(0,560px)_1fr] lg:items-center lg:gap-y-14">
            <div className="hidden lg:block">
              <Callout side="left" i={6} {...OPTIONS[0]} />
            </div>
            <div className="hidden lg:block" />
            <div className="hidden lg:block">
              <Callout side="right" i={7} {...OPTIONS[1]} />
            </div>
            <h2
              id="problem"
              className="mx-auto max-w-[17ch] text-center text-[34px] leading-[1.1] tracking-[-0.015em] sm:text-h2 lg:col-span-3 lg:text-h1"
            >
              <Words text="The USDC leg of a trade ties up capital for longer than the trade needs it." />
            </h2>
            <div className="hidden lg:block" />
            <div className="hidden lg:block">
              <Callout side="bottom" i={8} {...OPTIONS[2]} />
            </div>
          </div>

          <ul className="mt-12 border-t border-mist lg:hidden">
            {OPTIONS.map((o, i) => (
              <li key={o.label} className="rv flex gap-4 border-b border-mist py-6" style={{ "--i": i + 4 } as CSSProperties}>
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 bg-violet" aria-hidden="true" />
                <div>
                  <p className="eyebrow text-ink">{o.label}</p>
                  <p className="mt-2 text-body text-slate">{o.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="p" className="mx-auto mt-20 max-w-[30ch] border-t border-mist pt-14 text-center text-[28px] leading-[1.2] tracking-[-0.015em] text-violet md:mt-28 md:text-h2">
          <Words text="Tidrel lends the exact USDC for exactly as long as the trade takes to settle." />
        </Reveal>
      </div>
    </section>
  );
}
