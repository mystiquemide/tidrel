import Link from "next/link";
import { explorerAddress, explorerTx, RUN_BUDGET_USDC } from "@/lib/chain";
import type { Desk } from "@/lib/desk";
import { isDemoDesk } from "@/lib/deskAddress";
import type { Notice } from "@/lib/notices";
import { formatDuration, formatFixed, formatUsdc, shortHash } from "@/lib/format";
import type { Settlement } from "@/lib/history";
import type { Band, Position } from "@/lib/position";
import { MIN_HEALTH } from "@/lib/settle";
import { CopyAddress } from "./CopyAddress";
import { ExportCsv } from "./ExportCsv";
import { OpenClock } from "./OpenClock";
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

const BAND_FILL: Record<Band, string> = {
  SAFE: "bg-tide",
  WARN: "bg-warn",
  URGENT: "bg-urgent",
  IMMINENT: "bg-urgent",
  LIQUIDATABLE: "bg-urgent",
};

const BAND_LABEL: Record<Band, string> = {
  SAFE: "Safe",
  WARN: "Watch",
  URGENT: "Urgent",
  IMMINENT: "Near liquidation",
  LIQUIDATABLE: "Liquidatable",
};

// The gauge shows health from 1 up to this value. Above it the bar is simply full.
const GAUGE_MIN = 1;
const GAUGE_MAX = 2;
const gaugePct = (hf: number) => Math.min(100, Math.max(0, ((hf - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100));

function Stat({ label, value, unit, note }: { label: string; value: string; unit: string; note?: string }) {
  return (
    <div className="min-w-0 px-6 py-5">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-2">
        <span className="num text-[20px] leading-none font-medium tracking-[-0.01em] text-text">{value}</span>{" "}
        <span className="text-small text-muted">{unit}</span>
        {note && <span className="mt-1.5 block text-caption text-muted">{note}</span>}
      </dd>
    </div>
  );
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <h2 className="text-[17px] font-medium tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PanelNote({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-12 text-center text-small text-muted">{children}</p>;
}

function GetStarted({ walletCirBtc, canSettle }: { walletCirBtc: string | null; canSettle: boolean }) {
  const steps = [
    {
      title: "Hold cirBTC",
      body:
        walletCirBtc !== null && Number(walletCirBtc) > 0
          ? `This wallet holds ${formatFixed(walletCirBtc, 8)} cirBTC. Tidrel posts what a draw needs.`
          : "cirBTC is the collateral. Tidrel posts only what each draw needs, from this wallet.",
    },
    { title: "Settle a trade", body: "Add a reference and who to pay. Tidrel draws only the USDC you are short, then pays everyone in one transaction." },
    { title: "Repay when USDC lands", body: "Repay in one tap. Your collateral stays posted for the next trade." },
  ];
  return (
    <section className="card p-6 md:p-8" aria-labelledby="get-started">
      <h2 id="get-started" className="text-[17px] font-medium tracking-[-0.01em]">
        Start your first settlement
      </h2>
      <ol className="mt-5 grid gap-6 md:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-4">
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-line text-caption text-ebb">
              {i + 1}
            </span>
            <div>
              <p className="text-small font-medium text-text">{st.title}</p>
              <p className="mt-1 text-small text-muted">{st.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {!canSettle && <p className="mt-5 text-caption text-muted">Settling opens once the Borrow service is reachable.</p>}
    </section>
  );
}

function HistorySkeleton() {
  return (
    <div role="status" aria-label="Reading settlements from Arc mainnet" className="px-6 py-6">
      <div className="skeleton h-24 w-full" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

function HealthPanel({ p, last, since, live }: { p: Position; last: Settlement | null; since: number | null; live: boolean }) {
  const hf = p.healthFactor;
  const band = p.band;
  const floor = gaugePct(MIN_HEALTH);
  return (
    <section className="card flex flex-col p-6">
      <h2 className="eyebrow">Loan health</h2>
      {hf !== null && band ? (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="num text-[36px] leading-none font-medium tracking-[-0.03em]">{hf.toFixed(2)}</span>
            <span className={`rounded-badge px-2.5 py-1 text-caption font-medium ${BAND_TONE[band]}`}>
              {BAND_LABEL[band]}
            </span>
          </div>
          <div className="relative mt-6 h-2 rounded-pill bg-raised" role="img" aria-label={`Health ${hf.toFixed(2)}, settling pauses below ${MIN_HEALTH.toFixed(2)}`}>
            <div className={`h-full rounded-pill ${BAND_FILL[band]}`} style={{ width: `${gaugePct(hf)}%` }} />
            <span
              className="absolute -top-1 h-4 w-px bg-ebb/70"
              style={{ left: `${floor}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 text-caption text-muted">
            Settling pauses below <span className="num text-ebb">{MIN_HEALTH.toFixed(2)}</span>. Liquidation starts at 1.00.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-small">
            {p.liquidationPriceUsd && (
              <div>
                <dt className="text-caption text-muted">Liquidation price</dt>
                <dd className="num mt-1 text-text">{formatUsdc(p.liquidationPriceUsd, 2)} USD</dd>
              </div>
            )}
            {live && since !== null && (
              <div>
                <dt className="text-caption text-muted">Open for</dt>
                <dd className="mt-1 text-tide">
                  <OpenClock since={since} />
                </dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <>
          <p className="mt-4 text-[22px] leading-tight font-medium tracking-[-0.01em] text-ebb">No open loan</p>
          <div className="mt-6 h-2 rounded-pill bg-raised" aria-hidden="true" />
          <p className="mt-3 text-caption text-muted">
            Health appears once a draw is open. Settling pauses below{" "}
            <span className="num text-ebb">{MIN_HEALTH.toFixed(2)}</span>.
          </p>
          {last && (
            <div className="mt-6 rounded-badge border border-line bg-ink/60 px-4 py-3">
              <p className="eyebrow">Last cycle</p>
              <p className="mt-2 flex items-baseline justify-between gap-3 text-small">
                <span className="num text-text">{last.reference ?? "No payout"}</span>
                <a
                  href={explorerTx(last.repayTxHash ?? last.txHash ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="num rounded-badge text-tide underline decoration-tide/40 underline-offset-4 hover:decoration-tide"
                >
                  {last.openSeconds !== null ? formatDuration(last.openSeconds) : "Open"}
                </a>
              </p>
              <p className="mt-1 text-caption text-muted">
                Drew <span className="num text-ebb">{formatUsdc(last.drawnUsdc, 2)}</span> USDC, repaid at a cost of{" "}
                <span className="num text-ebb">{formatUsdc(last.interestUsdc ?? "0", 6)}</span> USDC
              </p>
            </div>
          )}
        </>
      )}
      <div className="min-h-6 flex-1" aria-hidden="true" />
      <dl className="grid grid-cols-2 gap-4 border-t border-line pt-5 text-small">
        <div>
          <dt className="text-caption text-muted">Market liquidity</dt>
          <dd className="num mt-1 text-text">{formatUsdc(p.marketLiquidityUsdc, 2)} USDC</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">Borrow rate</dt>
          <dd className="num mt-1 text-text">{(p.borrowApy * 100).toFixed(2)}% a year</dd>
        </div>
      </dl>
    </section>
  );
}

/** The console layout. Read-only: it holds no write action, so a viewer needs no wallet. */
export function DeskView({
  desk,
  mode = "view",
  notices = [],
  primary,
  history = "ready",
}: {
  desk: Desk;
  /** "view" is the read-only page for any address. "desk" is a connected wallet's own. */
  mode?: "view" | "desk";
  notices?: Notice[];
  /** The main actions of the screen. Absent in the read-only view. */
  primary?: React.ReactNode;
  /** The settlement log reads slower than the loan. "loading" shows a placeholder, never an empty claim. */
  history?: "loading" | "ready" | "failed";
}) {
  const demo = mode === "view" && isDemoDesk(desk.address);

  if (!desk.ok) {
    return (
      <section className="bg-ink text-text">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-24">
          <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em]">
            Chain data is unavailable right now.
          </h1>
          <p className="mt-4 max-w-xl text-lead text-ebb">
            Every figure on this page is read from Arc mainnet, so nothing is shown until the read
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
  const debt = p ? Number(p.debtUsdc) : 0;
  const line = p ? Number(p.lineUsdc) : 0;
  const used = debt + line > 0 ? (debt / (debt + line)) * 100 : 0;
  const label = mode === "desk" ? "Your desk" : demo ? "Demo desk" : "Desk";
  const drawTimes = desk.settlements
    .filter((s) => (s.state === "open" || s.state === "drawn-not-settled") && s.drawAt !== null)
    .map((s) => s.drawAt as number);
  const openSince = drawTimes.length ? Math.min(...drawTimes) : null;

  return (
    <section className="bg-ink text-text">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-10 pb-36 sm:pb-24 md:pt-14 md:pb-32">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{label}</span>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-caption text-ebb">
                <span className="h-1.5 w-1.5 rounded-pill bg-tide" aria-hidden="true" />
                Arc mainnet
              </span>
            </div>
            <h1 className="num mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 text-[24px] leading-[1.15] font-medium tracking-[-0.02em] md:text-[30px]">
              <a
                href={explorerAddress(desk.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-badge hover:text-ebb"
              >
                {shortHash(desk.address)}
              </a>
              <span className="font-sans text-base font-normal tracking-normal">
                <CopyAddress value={desk.address} />
              </span>
            </h1>
          </div>
          {primary && <div className="shrink-0">{primary}</div>}
        </header>

        <p className="mt-5 max-w-2xl text-small text-muted">
          {mode === "desk"
            ? "Every figure is read from Arc mainnet. Your wallet signs every step"
            : "Read-only view. Every figure is read from Arc mainnet"}
          {demo ? `, from the wallet that ran the mainnet proof. Its counterparties are builder-controlled and the run was sized to a ${RUN_BUDGET_USDC} USDC budget` : ""}.
        </p>

        {notices.map((n) => (
          <p
            key={n.text}
            className={`card mt-4 px-4 py-3 text-small ${
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
          <p className="card mt-4 px-4 py-3 text-small text-warn">
            Borrow service unreachable. Showing chain data only.
          </p>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section className="card flex flex-col overflow-hidden">
            <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
              <h2 className="eyebrow">Available to draw</h2>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
                <span className="num text-[36px] leading-none font-medium tracking-[-0.03em] md:text-[44px]">
                  {p ? formatUsdc(p.lineUsdc, 2) : "Unavailable"}
                </span>
                {p && <span className="text-lead text-muted">USDC</span>}
              </p>
              {p && (
                <div className="mt-8">
                  <div
                    className="h-2 overflow-hidden rounded-pill bg-raised"
                    role="img"
                    aria-label={`${used.toFixed(0)} percent of the credit line is borrowed`}
                  >
                    <div className="h-full rounded-pill bg-tide" style={{ width: `${Math.max(used, used > 0 ? 2 : 0)}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between text-caption text-muted">
                    <span>
                      Borrowed <span className="num text-ebb">{formatUsdc(p.debtUsdc, 2)}</span>
                    </span>
                    <span>
                      Available <span className="num text-ebb">{formatUsdc(p.lineUsdc, 2)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
            <dl className="mt-auto grid divide-y divide-line border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Stat label="Collateral posted" value={formatFixed(desk.collateralCirBtc, 8)} unit="cirBTC" />
              <Stat
                label="Borrowed now"
                value={p ? formatUsdc(p.debtUsdc, 2) : "Unavailable"}
                unit={p ? "USDC" : ""}
              />
              <Stat
                label="Cost so far"
                value={p ? formatUsdc(p.accruedInterestUsdc, 6) : "Unavailable"}
                unit={p ? "USDC" : ""}
                note={open ? "Interest on the open loan" : undefined}
              />
            </dl>
          </section>

          {p ? (
            <HealthPanel
              p={p}
              last={history === "ready" ? (rows.find((r) => r.state === "repaid" && r.repayTxHash) ?? null) : null}
              since={openSince}
              live={mode === "desk" && !!open}
            />
          ) : (
            <section className="card p-6">
              <h2 className="eyebrow">Loan health</h2>
              <p className="mt-4 text-small text-muted">Loan data unavailable.</p>
            </section>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {mode === "desk" && history === "ready" && rows.length === 0 && Number(desk.collateralCirBtc) === 0 && (
            <GetStarted walletCirBtc={p?.walletCirBtc ?? null} canSettle={!!p} />
          )}
          <Panel title="Tide line" aside={<span className="text-caption text-muted">USDC borrowed over time</span>}>
            {history === "ready" ? (
              <TideLine settlements={desk.settlements} />
            ) : history === "loading" ? (
              <HistorySkeleton />
            ) : (
              <PanelNote>Settlements could not be read right now. Reload to try again.</PanelNote>
            )}
          </Panel>

          <Panel
            title="Settlements"
            aside={
              history === "ready" && rows.length > 0 ? (
                <span className="flex items-center gap-3">
                  <ExportCsv rows={rows} name={shortHash(desk.address).replace("…", "-")} />
                  <span className="num rounded-pill bg-raised px-2.5 py-1 text-caption text-ebb">{rows.length}</span>
                </span>
              ) : undefined
            }
          >
            {history === "loading" ? (
              <HistorySkeleton />
            ) : history === "failed" ? (
              <PanelNote>Settlements could not be read right now. Reload to try again.</PanelNote>
            ) : rows.length > 0 ? (
              <SettlementsTable rows={rows} />
            ) : (
              <PanelNote>No settlements found for this address.</PanelNote>
            )}
          </Panel>
        </div>

        {history === "ready" && desk.truncated && (
          <p className="mt-4 text-small text-muted">
            Older settlements are not loaded. This view reads the most recent stretch of Arc mainnet.
          </p>
        )}

        <p className="mt-10 text-small text-muted">
          Read from Arc mainnet at block <span className="num">{desk.blockNumber.toString()}</span>.{" "}
          <Link href="/proof" className="rounded-badge text-ebb underline underline-offset-4">
            See the mainnet proof
          </Link>
        </p>
      </div>
    </section>
  );
}
