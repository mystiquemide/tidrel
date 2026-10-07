import { NavBar } from "@/components/NavBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <NavBar tone="light" />
      <main id="main" className="on-light flex flex-1 bg-paper text-ink">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-center px-6 py-24">
          <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[44px]">
            This page is not here.
          </h1>
          <p className="mt-4 max-w-xl text-lead text-body">
            The link may be old or mistyped. The pages that exist are one tap away.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PillLink href="/" variant="ink">
              Go to the home page
            </PillLink>
            <PillLink href="/proof" variant="soft">
              See the mainnet proof
            </PillLink>
          </div>
        </div>
      </main>
    </>
  );
}
