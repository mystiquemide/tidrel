import type { Metadata } from "next";
import { DocsView } from "@/components/DocsView";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "How Tidrel works: connecting a wallet, settling a trade, repaying, collateral, the TidrelSettler contract, on-chain verification and troubleshooting.",
};

export default function DocsPage() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <DocsView />
      </main>
    </>
  );
}
