import { AppBar } from "@/components/AppBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";
import { DEMO_DESK_ADDRESS } from "@/lib/chain";

/** A read-only desk link with a malformed address. Served with a 404 status. */
export default function InvalidDesk() {
  return (
    <>
      <SkipLink />
      <AppBar>
        <PillLink href="/desk" size="sm">
          Open your desk
        </PillLink>
      </AppBar>
      <main id="main" className="flex-1 bg-porcelain">
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
      </main>
    </>
  );
}
