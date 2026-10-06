import Link from "next/link";
import { explorerAddress, RUN_BUDGET_USDC } from "@/lib/chain";
import type { Desk } from "@/lib/desk";
import { isDemoDesk } from "@/lib/deskAddress";
import type { Notice } from "@/lib/notices";
import { formatFixed, formatUsdc, shortHash } from "@/lib/format";
import type { Band } from "@/lib/position";
import { PillLink } from "./PillLink";
import { SettlementsTable } from "./SettlementsTable";
import { TideLine } from "./TideLine";

const BAND_TONE: Record<Band, string> = {
  SAFE: "bg-tide/15 text-tide",
  WARN: "bg-warn/15 text-warn",
  URGENT: "bg-urgent/15 text-urgent",
  IMMINENT: "bg-urgent/15 text-urgent",
  LIQUIDATABLE: "bg-urgent/15 text-urgent",
};

function Cell({ label, value, unit, note }: { label: string; value: string; unit: string; note?: string }) {
  return (
    <div className="rounded-card bg-panel p-6">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-3">
        <span className="num text-[28px] leading-none font-medium tracking-[-0.02em] text-text">{value}</span>{" "}
        <span className="text-small text-muted">{unit}</span>
        {note && <span className="mt-2 block text-caption text-muted">{note}</span>}
      </dd>
    </div>
  );
}

/** The console layout. Read-only: it holds no write action, so a viewer needs no wallet. */
export function DeskView({
  desk,
  mode = "view",
  notices = [],
}: {
  desk: Desk;
  /** "view" is the read-only page for any address. "desk" is a connected wallet's own. */
  mode?: "view" | "desk";
  notices?: Notice[];
}) {
  const demo = mode === "view" && isDemoDesk(desk.address);

  if (!desk.ok) {
    return (
      <section className="bg-ink text-text">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-24">
          <h1 className="text-[40px] leading-[1.05] font-[550] tracking-[-0.03em]">
            Chain data is unavailable right now.
          </h1>
          <p className="mt-4 max-w-xl text-lead text-ebb">
            Every figure on this page is read from Arc, so nothing is shown until the read
            works. Try again in a moment.
          </p>
          <div className="mt-8">
            <PillLink href={`/view/${desk.address}`} variant="light">
              Try again
            </PillLink>
          </div>
        </div>
      </section>
    );
  }

  const p = desk.position;
  const rows = [...desk.settlements].reverse();
  const open = p && p.debtUsdc !== "0";

  return (
    <section className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-12 pb-24 md:pt-16 md:pb-32">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-small text-muted">{mode === "desk" ? "Your desk" : demo ? "Demo desk" : "Desk"}</p>
            <h1 className="num mt-1 text-[32px] leading-[1.1] font-[550] tracking-[-0.02em] md:text-[40px]">
              <a
                href={explorerAddress(desk.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-badge underline decoration-muted/50 underline-offset-8 hover:decoration-text"
              >
                {shortHash(desk.address)}
              </a>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          {p?.band && p.healthFactor !== null ? (
            <span className={`inline-flex w-fit items-center gap-2 rounded-badge px-3 py-2 text-[14px] font-medium ${BAND_TONE[p.band]}`}>
              Health <span className="num">{p.healthFactor.toFixed(2)}</span>
            </span>
          ) : (
            <span className="inline-flex w-fit rounded-badge bg-panel px-3 py-2 text-[14px] font-medium text-ebb">
              {p ? "No open loan" : "Loan data unavailable"}
            </span>
          )}
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-small text-muted">
          {mode === "desk" ? "Everything here is read from Arc. Your wallet signs every step" : "Read-only view. Everything here is read from Arc"}
          {demo ? `, from the wallet that ran the mainnet proof. Its counterparties are builder-controlled and the run was sized to a ${RUN_BUDGET_USDC} USDC budget` : ""}.
        </p>

        {notices.map((n) => (
          <p
            key={n.text}
            className={`mt-4 rounded-badge bg-panel px-4 py-3 text-small ${
              n.tone === "urgent" ? "text-urgent" : n.tone === "warn" ? "text-warn" : "text-ebb"
            }`}
          >
            {n.text}
            {n.link && (
              <>
                {" "}
                <a
                  href={n.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-badge underline underline-offset-4"
                >
                  {n.link.label}
                </a>
              </>
            )}
          </p>
        ))}

        {!p && (
          <p className="mt-6 rounded-badge bg-panel px-4 py-3 text-small text-warn">
            Borrow service unreachable. Showing chain data only.
          </p>
        )}

        <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cell label="Collateral posted" value={formatFixed(desk.collateralCirBtc, 8)} unit="cirBTC" />
          <Cell
            label="Available to draw"
            value={p ? formatUsdc(p.lineUsdc, 2) : "Unavailable"}
            unit={p ? "USDC" : ""}
          />
          <Cell
            label="Borrowed now"
            value={p ? formatUsdc(p.debtUsdc, 2) : "Unavailable"}
            unit={p ? "USDC" : ""}
          />
          <Cell
            label="Cost so far"
            value={p ? formatUsdc(p.accruedInterestUsdc, 6) : "Unavailable"}
            unit={p ? "USDC" : ""}
            note={open ? "Interest on the open loan" : undefined}
          />
        </dl>
        {p && (
          <p className="mt-4 text-small text-muted">
            Market liquidity <span className="num text-ebb">{formatUsdc(p.marketLiquidityUsdc, 2)} USDC</span>.
            Borrow rate <span className="num text-ebb">{(p.borrowApy * 100).toFixed(2)}%</span> a year.
          </p>
        )}

        <h2 className="mt-16 text-h3 font-medium tracking-[-0.02em]">Tide line</h2>
        <div className="mt-4">
          <TideLine settlements={desk.settlements} />
        </div>

        <h2 className="mt-16 text-h3 font-medium tracking-[-0.02em]">Settlements</h2>
        {rows.length > 0 ? (
          <div className="mt-4">
            <SettlementsTable rows={rows} />
          </div>
        ) : (
          <p className="mt-4 rounded-card bg-panel px-6 py-10 text-center text-small text-muted">
            No settlements found for this address.
          </p>
        )}
        {desk.truncated && (
          <p className="mt-4 text-small text-muted">
            Older settlements are not loaded. This view reads the most recent stretch of Arc.
          </p>
        )}

        <p className="mt-10 text-small text-muted">
          Read from Arc at block <span className="num">{desk.blockNumber.toString()}</span>.{" "}
          <Link href="/proof" className="rounded-badge text-ebb underline underline-offset-4">
            See the mainnet proof
          </Link>
        </p>
      </div>
    </section>
  );
}
