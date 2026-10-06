import { BuiltOn } from "@/components/BuiltOn";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { NavBar } from "@/components/NavBar";
import { ProofCards } from "@/components/ProofCards";
import { ScrollOnLoad } from "@/components/ScrollOnLoad";
import { SkipLink } from "@/components/SkipLink";

// The step links and proof cards read Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <ScrollOnLoad />
      <main id="main" className="flex-1">
        <Hero />
        <HowItWorks />
        <ProofCards />
        <BuiltOn />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
