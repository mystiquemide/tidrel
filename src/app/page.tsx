import { Hero } from "@/components/Hero";
import { NavBar } from "@/components/NavBar";
import { ProofBand } from "@/components/ProofBand";

// The proof band reads Arc, so the page refreshes every five minutes.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="on-light sr-only rounded-pill bg-paper px-4 py-2 text-small text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Skip to content
      </a>
      <NavBar />
      <main id="main" className="flex-1">
        <Hero />
        <ProofBand />
      </main>
    </>
  );
}
