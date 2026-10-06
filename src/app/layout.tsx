import type { Metadata, Viewport } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Draw USDC against your cirBTC the moment a trade settles, and repay it the second USDC comes back. On Arc mainnet.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tidrel.vercel.app"),
  title: { default: "Tidrel: settle in USDC, keep your bitcoin", template: "%s | Tidrel" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Tidrel",
    title: "Tidrel: settle in USDC, keep your bitcoin",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Tidrel: settle in USDC, keep your bitcoin",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e11",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetBrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
