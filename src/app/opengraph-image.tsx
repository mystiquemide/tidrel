import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Tidrel: settle in USDC, keep your bitcoin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // The violet curtain from the home hero, cropped to the card size.
  const background = await readFile(join(process.cwd(), "src/app/og-background.jpg"));
  const src = `data:image/jpeg;base64,${background.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          position: "relative",
          color: "#ffffff",
        }}
      >
        <img src={src} alt="" width={size.width} height={size.height} style={{ position: "absolute", inset: 0 }} />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: size.width,
            padding: 72,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round">
              <path d="M2.5 9.5C5.5 5.5 8.5 5.5 12 9.5S18.5 13.5 21.5 9.5" />
              <path d="M2.5 17C5.5 13 8.5 13 12 17S18.5 21 21.5 17" />
            </svg>
            <div style={{ fontSize: 50, fontWeight: 600 }}>tidrel</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            <div>Settle in USDC.</div>
            <div>Keep your bitcoin.</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
