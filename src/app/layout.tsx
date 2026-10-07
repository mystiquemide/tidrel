import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Scroll reveals only hide content once script is running, so the page reads without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
