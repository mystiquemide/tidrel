import { PillLink } from "./PillLink";

export function FinalCta() {
  return (
    <section className="border-t border-line bg-ink text-text">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 py-24 text-center md:py-32">
        <h2 className="max-w-3xl text-balance text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          Pay the trade now. Keep your bitcoin.
        </h2>
        <p className="mt-5 max-w-xl text-lead text-ebb">
          Connect a wallet, post cirBTC once, and settle in USDC the moment a trade needs it.
        </p>
        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          <PillLink href="/desk" variant="primary">
            Open the desk
          </PillLink>
          <PillLink href="/proof" variant="dark">
            See the mainnet run
          </PillLink>
        </div>
      </div>
    </section>
  );
}
