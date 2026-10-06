import { Hero } from "@/components/Hero";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

export default function Home() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1">
        <Hero />
      </main>
    </>
  );
}
