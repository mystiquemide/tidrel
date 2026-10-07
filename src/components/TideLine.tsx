import { explorerTx } from "@/lib/chain";
import type { Settlement } from "@/lib/history";
import { tidePoints } from "@/lib/tide";
import { formatDurationWords, formatUsdc } from "@/lib/format";

const W = 1000;
const H = 160;
const PAD_X = 12;
const PAD_TOP = 18;
const PAD_BOTTOM = 10;

/**
 * Principal outstanding over time, drawn as a tide: each draw is a swell that rises to
 * the amount borrowed, each repay ebbs back. The curve passes through every real value
 * and only eases between them. It needs two events before it shows, because one point
 * is not a tide.
 */
export function TideLine({ settlements }: { settlements: Settlement[] }) {
  const pts = tidePoints(settlements);
  if (pts.length < 2) {
    return (
      <p className="px-6 py-12 text-center text-small text-slate">
        Your first draw and repay will appear here.
      </p>
    );
  }

  const span = pts[pts.length - 1].t - pts[0].t;
  const max = Math.max(...pts.map((p) => Number(p.debtUsdc)), 1e-9);
  // The water starts at low tide, then one position per event, evenly spaced. Cycles
  // are minutes apart and the gaps between them are hours, so a time axis would squash
  // every loan into a sliver.
  const levels = [0, ...pts.map((p) => Number(p.debtUsdc))];
  const x = (i: number) => PAD_X + (i / (levels.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);
  const floor = y(0);

  // Each stretch between two events is an S-curve with flat ends, so the water swells
  // into a crest and settles at each level instead of jumping to it.
  let d = `M ${x(0)} ${y(levels[0])}`;
  for (let i = 1; i < levels.length; i++) {
    const x0 = x(i - 1);
    const x1 = x(i);
    const mid = (x1 - x0) / 2;
    d += ` C ${x0 + mid} ${y(levels[i - 1])} ${x1 - mid} ${y(levels[i])} ${x1} ${y(levels[i])}`;
  }

  return (
    <figure className="px-6 py-6 md:px-8">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[110px] w-full text-violet sm:h-[180px]"
          role="img"
          aria-label={`Principal outstanding across ${pts.length} draws and repays over ${formatDurationWords(span)}, peaking at ${formatUsdc(String(max), 2)} USDC`}
        >
          {[0.33, 0.66].map((f) => (
            <line
              key={f}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_TOP + (floor - PAD_TOP) * f}
              y2={PAD_TOP + (floor - PAD_TOP) * f}
              stroke="var(--color-mist)"
              strokeDasharray="2 6"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={`${d} L ${x(levels.length - 1)} ${floor} L ${x(0)} ${floor} Z`} fill="currentColor" fillOpacity="0.12" />
          <path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <line x1={PAD_X} x2={W - PAD_X} y1={floor} y2={floor} stroke="var(--color-ash)" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* One marker per event, placed in HTML so it stays square at any width. */}
        {pts.map((p, i) => (
          <a
            key={p.txHash + p.kind}
            href={explorerTx(p.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.kind === "draw" ? "Draw" : "Repay"} on Arc mainnet, ${formatUsdc(p.debtUsdc, 2)} USDC outstanding after it`}
            title={`${p.kind === "draw" ? "Draw" : "Repay"}, ${formatUsdc(p.debtUsdc, 2)} USDC outstanding`}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-150 ${
              p.kind === "draw" ? "bg-violet" : "border border-violet bg-porcelain"
            }`}
            style={{
              left: `${(x(i + 1) / W) * 100}%`,
              top: `${(y(levels[i + 1]) / H) * 100}%`,
            }}
          />
        ))}
      </div>
      <figcaption className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2 text-caption text-slate">
        <span className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 bg-violet" aria-hidden="true" />
            Draw
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 border border-violet bg-porcelain" aria-hidden="true" />
            Repay
          </span>
          <span>The tide rises at each draw and ebbs at each repay</span>
        </span>
        <span>
          High water <span className="num text-ink">{formatUsdc(String(max), 2)}</span> USDC
        </span>
      </figcaption>
    </figure>
  );
}
