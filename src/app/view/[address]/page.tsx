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
        <span className="eyebrow hidden sm:inline">Read-only</span>
        <PillLink href="/desk" size="sm">
          Open your desk
        </PillLink>
      </AppBar>
      <main id="main" className="flex-1">
        {address ? (
          <DeskView desk={await getDesk(address)} />
        ) : (
          <section className="bg-porcelain">
            <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24">
              <p className="eyebrow">Read-only desk</p>
              <h1 className="mt-5 text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
                That is not a valid address.
              </h1>
              <p className="mt-6 max-w-xl text-lead text-slate">
                An Arc mainnet address starts with 0x and has 40 more characters.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <PillLink href="/">Go to the home page</PillLink>
                <PillLink href={`/view/${DEMO_DESK_ADDRESS}`} variant="secondary">
                  View the demo desk
                </PillLink>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
