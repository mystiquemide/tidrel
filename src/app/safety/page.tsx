import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { SafetyRules } from "@/components/SafetyRules";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "Safety rules",
  description:
    "What Tidrel enforces before anything is signed, what it cannot do, and where the mainnet run is limited.",
};

// A payout link is read from Arc mainnet, so the page refreshes every five minutes. This page has no footer.
export const revalidate = 300;

export default function SafetyPage() {
  return (
    <>
      <SkipLink />
      <NavBar tone="dark" />
      <main id="main" className="flex-1">
        <SafetyRules />
      </main>
    </>
  );
}
