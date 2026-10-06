import { Hero } from "@/components/Hero";
import { NavBar } from "@/components/NavBar";
import { ProofCards } from "@/components/ProofCards";
import { SkipLink } from "@/components/SkipLink";

// The proof cards read Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <Hero />
        <ProofCards />
      </main>
    </>
  );
}
