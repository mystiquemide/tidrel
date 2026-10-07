import {
  ADDRESSES,
  ARC_CHAIN_ID,
  CIRBTC_USDC_MARKET_ID,
  DEMO_DESK_ADDRESS,
  explorerAddress,
} from "@/lib/chain";
import { PillLink } from "./PillLink";

const ROWS = [
  {
    name: "TidrelSettler",
    role: "Tidrel's own contract. Pays every counterparty in one transaction and accepts each trade reference once per wallet. It holds no funds, has no owner and takes no fee.",
    address: ADDRESSES.settler,
    source: `https://repo.sourcify.dev/${ARC_CHAIN_ID}/${ADDRESSES.settler}`,
  },
  {
    name: "USDC",
    role: "The dollar token Tidrel draws and pays out.",
    address: ADDRESSES.usdc,
  },
  {
    name: "cirBTC",
    role: "The bitcoin token you post as collateral.",
    address: ADDRESSES.cirBtc,
  },
  {
    name: "Morpho Blue",
    role: "The lending market that holds the loan. Tidrel opens and repays loans here through Circle's Borrow service.",
    address: ADDRESSES.morpho,
  },
  {
    name: "Multicall3From",
    role: "Batches the approval and the settlement into one transaction from your wallet.",
    address: ADDRESSES.multicall3From,
  },
  {
    name: "Memo",
    role: "Wrote the trade reference next to each payment in the first mainnet run, before TidrelSettler.",
    address: ADDRESSES.memo,
  },
  {
    name: "Demo desk",
    role: "The wallet that ran the mainnet proof. The builder controls it, and so does every counterparty it paid.",
    address: DEMO_DESK_ADDRESS,
  },
] as const;

export function Contracts() {
  return (
    <section className="on-light bg-paper text-ink">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[44px]">
          Contracts and addresses
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-body">
          Everything Tidrel touches on Arc mainnet.
        </p>

        <ul className="mt-14 divide-y divide-ink/10 border-y border-ink/10">
          {ROWS.map((r) => (
            <li
              key={r.name}
              className="grid gap-3 py-7 md:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_minmax(0,5fr)] md:gap-10 md:py-8"
            >
              <h2 className="text-h3 font-medium tracking-[-0.02em] text-ink">{r.name}</h2>
              <p className="text-body text-body">{r.role}</p>
              <div className="flex flex-col items-start gap-3">
                <a
                  href={explorerAddress(r.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-badge font-mono text-[13px] break-all text-tide-deep sm:text-small underline decoration-tide-deep/40 underline-offset-4 hover:decoration-tide-deep"
                >
                  {r.address}
                </a>
                {"source" in r && (
                  <a
                    href={r.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-badge text-small font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                  >
                    Verified source on Sourcify
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-20 rounded-[24px] bg-tide-wash p-6 md:p-10">
          <h2 className="text-h2 font-medium tracking-[-0.024em]">The lending market</h2>
          <p className="mt-4 max-w-2xl text-body text-body">
            Loans use the cirBTC and USDC market on Morpho Blue. Its identifier is:
          </p>
          <p className="mt-4 rounded-badge border border-ink/10 bg-paper px-4 py-3 font-mono text-small break-all text-ink">
            {CIRBTC_USDC_MARKET_ID}
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <PillLink href="/safety" variant="ink">
            Read the safety rules
          </PillLink>
          <PillLink href="/proof" variant="soft">
            See the mainnet proof
          </PillLink>
        </div>
      </div>
    </section>
  );
}
