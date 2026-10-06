import type { Metadata } from "next";
import { Contracts } from "@/components/Contracts";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "Contracts and addresses",
  description:
    "Every token, contract and wallet Tidrel uses on Arc mainnet, each linked to the explorer.",
};

// This page has no footer.
export default function ContractsPage() {
  return (
    <>
      <SkipLink />
      <NavBar tone="dark" />
      <main id="main" className="flex-1">
        <Contracts />
      </main>
    </>
  );
}
