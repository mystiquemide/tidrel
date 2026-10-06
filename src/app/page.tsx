import { Hero } from "@/components/Hero";
import { NavBar } from "@/components/NavBar";

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
      </main>
    </>
  );
}
