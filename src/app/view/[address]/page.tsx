import type { Metadata } from "next";
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
  return { title: address ? `Desk ${shortHash(address)}` : "Desk" };
}

export default async function ViewPage({ params }: Props) {
  const address = parseDeskAddress((await params).address);

  return (
    <>
      <SkipLink />
      <AppBar>
        <span className="hidden text-small text-muted sm:inline">Read-only</span>
        <PillLink href="/desk" variant="light" size="sm">
          Open your desk
        </PillLink>
      </AppBar>
      <main id="main" className="flex-1">
        {address ? (
          <DeskView desk={await getDesk(address)} />
        ) : (
          <section className="bg-ink text-text">
            <div className="mx-auto w-full max-w-[1200px] px-6 py-24">
              <h1 className="text-[40px] leading-[1.05] font-[550] tracking-[-0.03em]">
                That is not a valid address.
              </h1>
              <p className="mt-4 max-w-xl text-lead text-ebb">
                An Arc address starts with 0x and has 40 more characters.
              </p>
              <div className="mt-8">
                <PillLink href="/" variant="light">
                  Go to the home page
                </PillLink>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
