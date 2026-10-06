import type { Metadata } from "next";
import { DeskApp } from "@/components/DeskApp";
import { NavBar } from "@/components/NavBar";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = { title: "Your desk" };

// The wallet is read in the browser, so this page is static. It has no footer.
export default function DeskPage() {
  return (
    <>
      <SkipLink />
      <NavBar tone="dark" />
      <main id="main" className="flex-1">
        <DeskApp />
      </main>
    </>
  );
}
