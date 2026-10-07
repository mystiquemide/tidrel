import Image from "next/image";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { PillLink } from "@/components/PillLink";
import { SkipLink } from "@/components/SkipLink";

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <NavBar />
      <main id="main" className="flex-1 bg-porcelain">
        <div className="mx-auto w-full max-w-[1224px] px-6 pt-10 pb-24 md:px-8 md:pb-36">
          <div className="relative h-[200px] overflow-hidden rounded-card md:h-[260px]">
            <Image src="/images/gate.webp" alt="" fill priority sizes="(min-width: 1224px) 1160px, 100vw" className="object-cover" />
          </div>
          <p className="eyebrow mt-14">Page not found</p>
          <h1 className="mt-5 text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">This page is not here.</h1>
          <p className="mt-6 max-w-xl text-lead text-slate">
            The link may be old or mistyped. The pages that exist are one tap away.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PillLink href="/">Go to the home page</PillLink>
            <PillLink href="/proof" variant="secondary">
              See the mainnet proof
            </PillLink>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
