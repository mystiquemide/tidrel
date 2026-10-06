import type { Metadata } from "next";
import { HowItWorks } from "@/components/HowItWorks";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "How it works | Tidrel",
  description:
    "Draw the exact USDC a trade needs, pay every counterparty in one transaction, and repay on arrival. Each step is a transaction on Arc.",
};

// The step cards link to real transactions read from Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function HowItWorksPage() {
  return (
    <>
      <SkipLink />
      <NavBar tone="dark" />
      <main id="main" className="flex-1">
        <HowItWorks />
      </main>
    </>
  );
}
