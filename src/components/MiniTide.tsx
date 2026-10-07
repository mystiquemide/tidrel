import type { Settlement } from "@/lib/history";
import { tidePoints } from "@/lib/tide";

const W = 300;
const H = 72;

/** A small, label-free tide of real draws and repays, for use over a photograph. */
export function MiniTide({ settlements }: { settlements: Settlement[] }) {
  const pts = tidePoints(settlements);
  if (pts.length < 2) return null;
  const levels = [0, ...pts.map((p) => Number(p.debtUsdc))];
  const max = Math.max(...levels, 1e-9);
  const x = (i: number) => 4 + (i / (levels.length - 1)) * (W - 8);
  const y = (v: number) => H - 4 - (v / max) * (H - 12);
  let d = `M ${x(0)} ${y(levels[0])}`;
  for (let i = 1; i < levels.length; i++) {
    const mid = (x(i) - x(i - 1)) / 2;
    d += ` C ${x(i - 1) + mid} ${y(levels[i - 1])} ${x(i) - mid} ${y(levels[i])} ${x(i)} ${y(levels[i])}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[56px] w-full text-violet" aria-hidden="true">
      <path d={`${d} L ${x(levels.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`} fill="currentColor" fillOpacity="0.14" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
