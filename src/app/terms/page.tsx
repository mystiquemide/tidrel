import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";
import { TERMS } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using Tidrel on Arc mainnet: risks, your responsibilities and the limits of what Tidrel promises.",
};

export default function TermsPage() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <LegalPage doc={TERMS} other={{ href: "/privacy", label: "privacy policy" }} />
      </main>
    </>
  );
}
