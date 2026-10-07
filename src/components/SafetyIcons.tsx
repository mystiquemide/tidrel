/**
 * Line icons in the reference's style: thin ink strokes on an isometric grid with one
 * violet square marking the part that matters. Decorative, so hidden from assistive tech.
 */
const common = {
  width: 96,
  height: 96,
  viewBox: "0 0 96 96",
  fill: "none",
  stroke: "var(--color-ink)",
  strokeWidth: 1.25,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Marker({ x, y }: { x: number; y: number }) {
  return <rect x={x - 3} y={y - 3} width="6" height="6" fill="var(--color-violet)" stroke="none" />;
}

/** A gauge with a floor tick: the health floor. */
export function FloorIcon() {
  return (
    <svg {...common}>
      <path d="M16 64a32 32 0 0 1 64 0" />
      <path d="M22 64a26 26 0 0 1 52 0" stroke="var(--color-ash)" strokeDasharray="2 3" />
      <path d="M48 64L66 44" />
      <path d="M30 50l-5-4" />
      <path d="M12 72h72" stroke="var(--color-ash)" />
      <Marker x={30} y={50} />
    </svg>
  );
}

/** Stacked isometric layers with a level line: the market's liquidity. */
export function LiquidityIcon() {
  const layer = (y: number) => `M48 ${y}l26 13-26 13-26-13z`;
  return (
    <svg {...common}>
      <path d={layer(18)} />
      <path d={layer(34)} />
      <path d={layer(50)} />
      <path d="M22 31v32M74 31v32" stroke="var(--color-ash)" strokeDasharray="2 3" />
      <Marker x={74} y={47} />
    </svg>
  );
}

/** Three nodes tied to one source: every payment lands together or none do. */
export function AllOrNothingIcon() {
  return (
    <svg {...common}>
      <path d="M48 16l12 7v14l-12 7-12-7V23z" />
      <path d="M48 44v10M48 54L24 70M48 54l24 16M48 54v16" />
      <circle cx="24" cy="74" r="5" />
      <circle cx="48" cy="74" r="5" />
      <circle cx="72" cy="74" r="5" />
      <Marker x={48} y={54} />
    </svg>
  );
}

/** A reference tag used once. */
export function OnceIcon() {
  return (
    <svg {...common}>
      <path d="M22 30h40l14 18-14 18H22z" />
      <circle cx="62" cy="48" r="4" />
      <path d="M32 42h18M32 54h12" stroke="var(--color-ash)" />
      <Marker x={22} y={30} />
    </svg>
  );
}

/** A plain key and lock: regular wallets only. */
export function WalletIcon() {
  return (
    <svg {...common}>
      <rect x="18" y="30" width="60" height="40" rx="6" />
      <path d="M18 42h60" stroke="var(--color-ash)" />
      <rect x="56" y="50" width="22" height="12" rx="3" />
      <Marker x={67} y={56} />
    </svg>
  );
}

/** A pen on a line: your wallet signs every step. */
export function SignIcon() {
  return (
    <svg {...common}>
      <path d="M58 18l14 14-34 34H24V52z" />
      <path d="M52 24l14 14" stroke="var(--color-ash)" />
      <path d="M16 78c10-6 18 4 28-2s16 2 24-2" />
      <Marker x={24} y={66} />
    </svg>
  );
}
