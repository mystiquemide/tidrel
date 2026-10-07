import {
  ADDRESSES,
  ARC_CHAIN_ID,
  CIRBTC_USDC_MARKET_ID,
  DEMO_DESK_ADDRESS,
  explorerAddress,
} from "@/lib/chain";
import { CopyAddress } from "./CopyAddress";
import { ExternalGlyph, PillLink } from "./PillLink";

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
    <section className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24 md:pb-36">
        <p className="eyebrow">Contracts and addresses</p>
        <h1 className="mt-5 max-w-[20ch] text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
          Everything Tidrel touches on Arc mainnet.
        </h1>
        <p className="mt-6 max-w-2xl text-lead text-slate">
          Each address opens on the Arc mainnet explorer. Tidrel adds one contract of its own.
        </p>

        <ul className="mt-14 border-t border-mist">
          {ROWS.map((r) => (
            <li
              key={r.name}
              className="grid gap-4 border-b border-mist py-8 md:grid-cols-[minmax(0,3fr)_minmax(0,5fr)_minmax(0,5fr)] md:gap-10"
            >
              <h2 className="flex items-center gap-3 text-h4 font-medium">
                {r.name === "TidrelSettler" && <span className="h-2.5 w-2.5 bg-violet" aria-hidden="true" />}
                {r.name}
              </h2>
              <p className="text-body text-slate">{r.role}</p>
              <div className="flex flex-col items-start gap-3">
                <a
                  href={explorerAddress(r.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 rounded-input font-mono text-[13px] break-all text-violet underline decoration-violet/30 underline-offset-4 hover:decoration-violet sm:text-small"
                >
                  {r.address}
                  <ExternalGlyph className="mt-1" />
                </a>
                <div className="flex flex-wrap gap-2">
                  <CopyAddress value={r.address} />
                  {"source" in r && (
                    <PillLink href={r.source} variant="secondary" size="sm" className="!h-9">
                      Verified source on Sourcify
                    </PillLink>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-16 rounded-card bg-cloud p-6 md:p-12">
          <p className="eyebrow">The lending market</p>
          <h2 className="mt-4 text-[28px] leading-[1.15] tracking-[-0.015em] md:text-h3">
            Loans use the cirBTC and USDC market on Morpho Blue.
          </h2>
          <p className="mt-4 text-body text-slate">Its market identifier:</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="num rounded-cell border border-mist bg-porcelain px-4 py-3 text-small break-all text-ink">
              {CIRBTC_USDC_MARKET_ID}
            </p>
            <CopyAddress value={CIRBTC_USDC_MARKET_ID} what="market identifier" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <PillLink href="/safety">Read the safety rules</PillLink>
          <PillLink href="/proof" variant="secondary">
            See the mainnet proof
          </PillLink>
        </div>
      </div>
    </section>
  );
}
