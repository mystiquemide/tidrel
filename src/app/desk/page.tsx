import type { Metadata } from "next";
import { DeskApp } from "@/components/DeskApp";
import { SkipLink } from "@/components/SkipLink";

// The desk read runs as a server action. Give it room for a wallet with a long history.
export const maxDuration = 60;

export const metadata: Metadata = { title: "Your desk" };

// The wallet is read in the browser, so this page is static. It has no footer and no marketing nav.
export default function DeskPage() {
  return (
    <>
      <SkipLink />
      <DeskApp />
    </>
  );
}
