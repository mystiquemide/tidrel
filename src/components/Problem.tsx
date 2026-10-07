import { PillLink } from "./PillLink";

const OPTIONS = [
  {
    title: "Prefund the USDC",
    body: "Hold idle USDC at every venue, ready for a trade that may not come. The capital sits still.",
  },
  {
    title: "Sell the bitcoin",
    body: "Raise the USDC by selling what you meant to keep, and give up the position to pay for a few minutes of settlement.",
  },
  {
    title: "Ask a broker for credit",
    body: "Open a credit line with relationship terms and a credit process, for a need that lasts seconds.",
  },
];

export function Problem() {
  return (
    <section className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="eyebrow">The problem</p>
          <h2 className="mt-4 text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-h2">
            The USDC leg of a trade ties up capital for longer than the trade needs it.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="card divide-y divide-line overflow-hidden">
            {OPTIONS.map((o) => (
              <li key={o.title} className="p-6 md:p-8">
                <h3 className="text-sub font-medium text-text">{o.title}</h3>
                <p className="mt-2 text-small text-ebb">{o.body}</p>
              </li>
            ))}
          </ul>

          <div className="card flex flex-col border-tide/50 p-6 md:p-8">
            <p className="eyebrow text-tide">With Tidrel</p>
            <h3 className="mt-4 text-[22px] leading-[1.2] font-medium tracking-[-0.02em] md:text-[26px]">
              Borrow the exact USDC for exactly as long as the trade takes to settle.
            </h3>
            <p className="mt-4 text-small text-ebb">
              Your bitcoin stays posted as collateral. Tidrel draws only the shortfall, pays every
              counterparty in one transaction, and the loan closes the moment USDC comes back.
            </p>
            <div className="mt-auto pt-8">
              <PillLink href="/desk" variant="primary">
                Open the desk
              </PillLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
