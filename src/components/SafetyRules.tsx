import { explorerTx } from "@/lib/chain";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { MIN_HEALTH } from "@/lib/settle";
import { PillLink } from "./PillLink";

const LIMITS = [
  "The mainnet run is small and its counterparties are wallets controlled by the builder. The code path is the same at any size.",
  "Loan reads and draws go through Circle's Borrow service. If it is unreachable, Tidrel shows chain data only and disables draws.",
  "A settlement is two transactions: the draw, then one batch that pays every counterparty.",
  "Tidrel cannot make a market lend. When liquidity is thin, a draw is refused and nothing is sent.",
];

export async function SafetyRules() {
  const data = await getDemoCycles();
  const head = data.ok ? headlineCycle(data.settlements) : null;
  const health = MIN_HEALTH.toFixed(2);

  const rules: { title: string; body: string; link?: { href: string; label: string } }[] = [
    {
      title: "Draws stop before they get risky.",
      body: `Tidrel refuses any draw that would take your health below ${health}. It checks again right before you sign, in case the market moved.`,
    },
    {
      title: "A draw never exceeds what the market can lend.",
      body: "Tidrel reads the available liquidity first and refuses a draw above it, so a payout is never left waiting on money that is not there.",
    },
    {
      title: "Payouts land together or not at all.",
      body: "Every counterparty is paid by one contract call. If any single payment would fail, nothing is sent. If a draw lands but the payout does not, the history marks it as drawn, not settled, so nothing goes unaccounted.",
      link: head?.txHash
        ? { href: explorerTx(head.txHash), label: "See a payout on Arc mainnet" }
        : undefined,
    },
    {
      title: "A trade reference can be used once.",
      body: "Tidrel checks the chain before you sign, and the settlement contract rejects a repeat on its own, even from another browser or device. References are public on Arc mainnet, so do not put anything private in one, and keep them to 31 characters.",
    },
    {
      title: "Regular wallets only.",
      body: "The payout contracts reject smart-contract accounts, so Tidrel refuses them up front with an explanation instead of letting a transaction fail.",
    },
    {
      title: "Your wallet signs everything.",
      body: "Tidrel never holds your funds or your keys. There is no account, no database and no server that can move your money.",
    },
  ];

  return (
    <section className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <h1 className="text-[40px] leading-[1.05] font-[550] tracking-[-0.03em] md:text-display">
          Safety rules
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-ebb">
          What the code enforces before anything is signed, and what Tidrel cannot do.
        </p>

        <ul className="mt-14 divide-y divide-line border-y border-line">
          {rules.map((r) => (
            <li
              key={r.title}
              className="grid gap-4 py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12 md:py-10"
            >
              <h2 className="text-h3 font-medium tracking-[-0.02em] text-text">{r.title}</h2>
              <div>
                <p className="text-body text-ebb">{r.body}</p>
                {r.link && (
                  <a
                    href={r.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded-badge text-small font-medium text-tide underline decoration-tide/40 underline-offset-4 hover:decoration-tide"
                  >
                    {r.link.label}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-20 text-h2 font-[550] tracking-[-0.024em]">Limits to know</h2>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {LIMITS.map((l) => (
            <li key={l} className="py-5 text-body text-ebb">
              {l}
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <PillLink href="/proof" variant="light">
            See the mainnet proof
          </PillLink>
          <PillLink href="/contracts" variant="dark">
            See the contracts
          </PillLink>
        </div>
      </div>
    </section>
  );
}
