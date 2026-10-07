import { BuiltOn } from "@/components/BuiltOn";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { NavBar } from "@/components/NavBar";
import { Problem } from "@/components/Problem";
import { ProofCards } from "@/components/ProofCards";
import { SafetyGrid } from "@/components/SafetyGrid";
import { ScrollOnLoad } from "@/components/ScrollOnLoad";
import { SkipLink } from "@/components/SkipLink";
import { WhyNow } from "@/components/WhyNow";

// The step chips and proof grid read Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <SkipLink />
      <NavBar tone="overlay" />
      <ScrollOnLoad />
      <main id="main" className="flex-1">
        <Hero />
        <BuiltOn />
        <Problem />
        <HowItWorks />
        <ProofCards />
        <WhyNow />
        <SafetyGrid />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
