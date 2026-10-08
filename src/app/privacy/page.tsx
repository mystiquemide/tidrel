import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";
import { PRIVACY } from "@/lib/legalContent";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Tidrel collects, what is public on-chain by design, and what stays on your device.",
};

export default function PrivacyPage() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <LegalPage doc={PRIVACY} other={{ href: "/terms", label: "terms of use" }} />
      </main>
    </>
  );
}
