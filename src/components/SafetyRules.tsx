import { explorerTx } from "@/lib/chain";
import { getDemoCycles, headlineCycle } from "@/lib/landing";
import { MIN_HEALTH } from "@/lib/settle";
import { PillLink } from "./PillLink";
import { AllOrNothingIcon, FloorIcon, LiquidityIcon, OnceIcon, SignIcon, WalletIcon } from "./SafetyIcons";

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
        ? { href: explorerTx(head.txHash), label: "See a payout" }
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

  const icons = [<FloorIcon key="f" />, <LiquidityIcon key="l" />, <AllOrNothingIcon key="a" />, <OnceIcon key="o" />, <WalletIcon key="w" />, <SignIcon key="s" />];

  return (
    <section className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-36">
        <p className="eyebrow">Safety rules</p>
        <h1 className="mt-5 max-w-[20ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
          What the code enforces before anything is signed.
        </h1>
        <p className="mt-6 max-w-2xl text-lead text-slate">
          Six rules Tidrel checks on every draw and payout, and the limits of what it can do.
        </p>

        <ul className="mt-14 grid gap-px overflow-hidden border border-mist bg-mist md:grid-cols-2 lg:grid-cols-3">
          {rules.map((r, i) => (
            <li
              key={r.title}
              className="flex flex-col bg-porcelain p-8 md:p-10"
            >
              {icons[i]}
              <h2 className="mt-10 text-h4 font-medium">{r.title}</h2>
              <p className="mt-3 text-body text-slate">{r.body}</p>
              {r.link && (
                <div className="mt-auto pt-6">
                  <PillLink href={r.link.href} variant="secondary" size="sm">
                    {r.link.label}
                  </PillLink>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-16 rounded-card bg-cloud px-6 py-10 md:px-12 md:py-14">
          <p className="eyebrow">Limits to know</p>
          <ol className="mt-6">
            {LIMITS.map((l, i) => (
              <li key={l} className="flex gap-5 border-b border-mist py-5 last:border-b-0">
                <span className="num w-6 shrink-0 text-violet">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-body text-graphite">{l}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <PillLink href="/proof">See the mainnet proof</PillLink>
          <PillLink href="/contracts" variant="secondary">
            See the contracts
          </PillLink>
        </div>
      </div>
    </section>
  );
}
