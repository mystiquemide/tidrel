import type { Settlement } from "@/lib/history";
import { tidePoints } from "@/lib/tide";
import { formatDurationWords } from "@/lib/format";

const W = 1000;
const H = 120;
const PAD = 8;

/**
 * Principal outstanding over time, from real draws and repays. It needs two points
 * before it shows a line, because one point is not a line.
 */
export function TideLine({ settlements }: { settlements: Settlement[] }) {
  const pts = tidePoints(settlements);
  if (pts.length < 2) {
    return (
      <p className="rounded-card bg-panel px-6 py-10 text-center text-small text-muted">
        Your first draw and repay will appear here.
      </p>
    );
  }

  const span = pts[pts.length - 1].t - pts[0].t;
  const max = Math.max(...pts.map((p) => Number(p.debtUsdc)), 1e-9);
  // One step per event, evenly spaced. Cycles are minutes apart and the gaps between
  // them are hours, so a time axis would squash every loan into a hairline.
  const x = (i: number) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  // Debt holds its level until the next event, so the line steps rather than slopes.
  let d = `M ${x(0)} ${y(0)}`;
  let prev = 0;
  pts.forEach((p, i) => {
    d += ` L ${x(i)} ${y(prev)} L ${x(i)} ${y(Number(p.debtUsdc))}`;
    prev = Number(p.debtUsdc);
  });

  return (
    <figure className="rounded-card bg-panel px-6 py-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[120px] w-full text-tide"
        role="img"
        aria-label={`Principal outstanding across ${pts.length} draws and repays across ${formatDurationWords(span)}`}
      >
        <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-3 text-caption text-muted">
        Principal outstanding, one step per draw or repay.
      </figcaption>
    </figure>
  );
}
