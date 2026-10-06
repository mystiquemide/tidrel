import { ImageResponse } from "next/og";

export const alt = "Tidrel: settle in USDC, keep your bitcoin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0e11",
          color: "#e6e9ed",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#3fb8af" strokeWidth="2.6" strokeLinecap="round">
            <path d="M2.5 9.5C5.5 5.5 8.5 5.5 12 9.5S18.5 13.5 21.5 9.5" />
            <path d="M2.5 17C5.5 13 8.5 13 12 17S18.5 21 21.5 17" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 600 }}>tidrel</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 600, lineHeight: 1.02, letterSpacing: "-0.03em" }}>
          <div>Settle in USDC.</div>
          <div>Keep your bitcoin.</div>
        </div>
        <div style={{ fontSize: 30, color: "#8a94a1" }}>Settlement credit on Arc mainnet</div>
      </div>
    ),
    size,
  );
}
