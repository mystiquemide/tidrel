import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { ProofBand } from "@/components/ProofBand";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "Mainnet proof | Tidrel",
  description:
    "A full draw, settle and repay cycle on Arc mainnet, read from chain with a link to every transaction.",
};

// Reads Arc, so the page refreshes every five minutes. This page has no footer.
export const revalidate = 300;

export default function ProofPage() {
  return (
    <>
      <SkipLink />
      <NavBar tone="dark" />
      <main id="main" className="flex-1">
        <ProofBand />
      </main>
    </>
  );
}
