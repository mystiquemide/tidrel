import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

// The step cards link to real transactions read from Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <Hero />
        <HowItWorks />
      </main>
    </>
  );
}
