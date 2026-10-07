import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeskView } from "@/components/DeskView";
import { AppBar } from "@/components/AppBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";
import { DEMO_DESK_ADDRESS } from "@/lib/chain";
import { getDesk } from "@/lib/desk";
import { parseDeskAddress } from "@/lib/deskAddress";
import { shortHash } from "@/lib/format";

// Read from Arc on request and kept for a minute. No footer on this page.
export const revalidate = 60;

export function generateStaticParams() {
  return [{ address: DEMO_DESK_ADDRESS }];
}

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const address = parseDeskAddress((await params).address);
  return { title: address ? `Desk ${shortHash(address)}` : "Not a valid address" };
}

export default async function ViewPage({ params }: Props) {
  const address = parseDeskAddress((await params).address);
  // A malformed address has nothing to read. The route's not-found page explains why.
  if (!address) notFound();

  return (
    <>
      <SkipLink />
      <AppBar>
        <span className="eyebrow hidden sm:inline">Read-only</span>
        <PillLink href="/desk" size="sm">
          Open your desk
        </PillLink>
      </AppBar>
      <main id="main" className="flex-1">
        <DeskView desk={await getDesk(address)} />
      </main>
    </>
  );
}
