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
  SAFE: "bg-cloud text-ink",
  WARN: "bg-warn/10 text-warn",
  URGENT: "bg-urgent/10 text-urgent-ink",
  IMMINENT: "bg-urgent/10 text-urgent-ink",
  LIQUIDATABLE: "bg-urgent/10 text-urgent-ink",
};

const BAND_FILL: Record<Band, string> = {
  SAFE: "bg-violet",
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
    <div className="min-w-0 px-6 py-5 md:px-8">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-3">
        <span className="num text-[20px] leading-none text-ink">{value}</span>{" "}
        <span className="text-small text-slate">{unit}</span>
        {note && <span className="mt-1.5 block text-caption text-slate">{note}</span>}
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
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-mist px-6 py-3 md:px-8">
        <h2 className="text-h4 font-medium">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PanelNote({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-12 text-center text-small text-slate">{children}</p>;
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
    <section className="rounded-panel bg-violet-tint p-6 md:p-8" aria-labelledby="get-started">
      <h2 id="get-started" className="text-h4 font-medium">
        Start your first settlement
      </h2>
      <ol className="mt-5 grid gap-6 md:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-4">
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-violet text-caption text-porcelain">
              {i + 1}
            </span>
            <div>
              <p className="text-body font-medium text-ink">{st.title}</p>
              <p className="mt-1 text-small text-slate">{st.body}</p>
            </div>
          </li>
        ))}
      </ol>
      {!canSettle && <p className="mt-5 text-caption text-slate">Settling opens once the Borrow service is reachable.</p>}
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
    <section className="card flex flex-col p-6 md:p-8">
      <h2 className="eyebrow">Loan health</h2>
      {hf !== null && band ? (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="num text-[44px] leading-none text-ink">{hf.toFixed(2)}</span>
            <span className={`rounded-pill px-3 py-1 text-small font-medium ${BAND_TONE[band]}`}>
              {BAND_LABEL[band]}
            </span>
          </div>
          <div className="relative mt-6 h-2 rounded-pill bg-mist" role="img" aria-label={`Health ${hf.toFixed(2)}, settling pauses below ${MIN_HEALTH.toFixed(2)}`}>
            <div className={`h-full rounded-pill ${BAND_FILL[band]}`} style={{ width: `${gaugePct(hf)}%` }} />
            <span
              className="absolute -top-1 h-4 w-px bg-slate"
              style={{ left: `${floor}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 text-caption text-slate">
            Settling pauses below <span className="num text-graphite">{MIN_HEALTH.toFixed(2)}</span>. Liquidation starts at 1.00.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-small">
            {p.liquidationPriceUsd && (
              <div>
                <dt className="text-caption text-slate">Liquidation price</dt>
                <dd className="num mt-1 text-ink">{formatUsdc(p.liquidationPriceUsd, 2)} USD</dd>
              </div>
            )}
            {live && since !== null && (
              <div>
                <dt className="text-caption text-slate">Open for</dt>
                <dd className="mt-1 text-violet">
                  <OpenClock since={since} />
                </dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <>
          <p className="mt-4 text-h3 text-ink">No open loan</p>
          <div className="mt-6 h-2 rounded-pill bg-mist" aria-hidden="true" />
          <p className="mt-3 text-caption text-slate">
            Health appears once a draw is open. Settling pauses below{" "}
            <span className="num text-graphite">{MIN_HEALTH.toFixed(2)}</span>.
          </p>
          {last && (
            <div className="mt-6 rounded-cell border border-mist bg-cloud px-4 py-3">
              <p className="eyebrow">Last cycle</p>
              <p className="mt-2 flex items-baseline justify-between gap-3 text-small">
                <span className="num text-ink">{last.reference ?? "No payout"}</span>
                <a
                  href={explorerTx(last.repayTxHash ?? last.txHash ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="num rounded-input text-violet underline decoration-violet/40 underline-offset-4 hover:decoration-violet"
                >
                  {last.openSeconds !== null ? formatDuration(last.openSeconds) : "Open"}
                </a>
              </p>
              <p className="mt-1 text-caption text-slate">
                Drew <span className="num text-graphite">{formatUsdc(last.drawnUsdc, 2)}</span> USDC, repaid at a cost of{" "}
                <span className="num text-graphite">{formatUsdc(last.interestUsdc ?? "0", 6)}</span> USDC
              </p>
            </div>
          )}
        </>
      )}
      <div className="min-h-6 flex-1" aria-hidden="true" />
      <dl className="grid grid-cols-2 gap-4 border-t border-mist pt-5 text-small">
        <div>
          <dt className="text-caption text-slate">Market liquidity</dt>
          <dd className="num mt-1 text-ink">{formatUsdc(p.marketLiquidityUsdc, 2)} USDC</dd>
        </div>
        <div>
          <dt className="text-caption text-slate">Borrow rate</dt>
          <dd className="num mt-1 text-ink">{(p.borrowApy * 100).toFixed(2)}% a year</dd>
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
      <section className="bg-porcelain">
        <div className="mx-auto w-full max-w-[1224px] px-6 pt-16 pb-24 md:px-8 md:pt-24">
          <p className="eyebrow">Desk</p>
          <h1 className="mt-5 text-[36px] leading-[1.08] tracking-[-0.02em] md:text-h1">
            Arc mainnet is not responding right now.
          </h1>
          <p className="mt-6 max-w-xl text-lead text-slate">
            Every figure on this desk is read live from the chain, so nothing is shown until it
            answers. Funds are not affected. Try again in a moment.
          </p>
          <div className="mt-10">
            <PillLink href={`/view/${desk.address}`}>
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
    <section className="bg-porcelain">
      <div className="mx-auto w-full max-w-[1224px] px-6 pt-10 pb-36 sm:pb-24 md:px-8 md:pt-14 md:pb-32">
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{label}</span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-cloud px-3 py-1 text-caption text-ink">
                <span className="h-1.5 w-1.5 bg-violet" aria-hidden="true" />
                Arc mainnet
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <h1 className="num text-[28px] leading-[1.15] md:text-[40px]">
                <a
                  href={explorerAddress(desk.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Desk ${desk.address}, open on the Arc mainnet explorer`}
                  className="rounded-input hover:text-violet"
                >
                  {shortHash(desk.address)}
                </a>
              </h1>
              <CopyAddress value={desk.address} />
            </div>
          </div>
          {primary && <div className="shrink-0">{primary}</div>}
        </header>

        <p className="mt-5 max-w-2xl text-small text-slate">
          {mode === "desk"
            ? "Every figure is read from Arc mainnet. Your wallet signs every step"
            : "Read-only view. Every figure is read from Arc mainnet"}
          {demo ? `, from the wallet that ran the mainnet proof. Its counterparties are builder-controlled and the run was sized to a ${RUN_BUDGET_USDC} USDC budget` : ""}.
        </p>

        {notices.map((n) => (
          <p
            key={n.text}
            className={`mt-4 flex items-start gap-3 rounded-cell px-5 py-4 text-body ${
              n.tone === "urgent"
                ? "bg-urgent/10 text-urgent-ink"
                : n.tone === "warn"
                  ? "bg-warn/10 text-warn"
                  : "bg-cloud text-graphite"
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
                  className="rounded-input underline underline-offset-4"
                >
                  {n.link.label}
                </a>
              </>
            )}
          </p>
        ))}

        {!p && (
          <p className="mt-4 rounded-cell bg-warn/10 px-5 py-4 text-body text-warn">
            Circle&apos;s Borrow service is not responding, so draws are paused. Everything below is read straight from the chain.
          </p>
        )}

        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section className="card flex flex-col overflow-hidden">
            <div className="flex flex-1 flex-col justify-center p-6 md:p-10">
              <h2 className="eyebrow">Available to draw</h2>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
                <span className="num text-[44px] leading-none text-ink md:text-[56px]">
                  {p ? formatUsdc(p.lineUsdc, 2) : "Unavailable"}
                </span>
                {p && <span className="text-lead text-slate">USDC</span>}
              </p>
              {p && (
                <div className="mt-8">
                  <div
                    className="h-2 overflow-hidden rounded-pill bg-mist"
                    role="img"
                    aria-label={`${used.toFixed(0)} percent of the credit line is borrowed`}
                  >
                    <div className="h-full rounded-pill bg-violet" style={{ width: `${Math.max(used, used > 0 ? 2 : 0)}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between text-caption text-slate">
                    <span>
                      Borrowed <span className="num text-graphite">{formatUsdc(p.debtUsdc, 2)}</span>
                    </span>
                    <span>
                      Available <span className="num text-graphite">{formatUsdc(p.lineUsdc, 2)}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
            <dl className="mt-auto grid divide-y divide-mist border-t border-mist sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
              <p className="mt-4 text-small text-slate">Loan health appears once Circle&apos;s Borrow service responds.</p>
            </section>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {mode === "desk" && history === "ready" && rows.length === 0 && Number(desk.collateralCirBtc) === 0 && (
            <GetStarted walletCirBtc={p?.walletCirBtc ?? null} canSettle={!!p} />
          )}
          <Panel title="Tide line" aside={<span className="text-caption text-slate">USDC borrowed over time</span>}>
            {history === "ready" ? (
              <TideLine settlements={desk.settlements} />
            ) : history === "loading" ? (
              <HistorySkeleton />
            ) : (
              <PanelNote>Settlements did not load from Arc mainnet. Reload the page to try again.</PanelNote>
            )}
          </Panel>

          <Panel
            title="Settlements"
            aside={
              history === "ready" && rows.length > 0 ? (
                <span className="flex items-center gap-3">
                  <ExportCsv rows={rows} name={shortHash(desk.address).replace("…", "-")} />
                  <span className="num rounded-pill bg-cloud px-2.5 py-1 text-caption text-graphite">{rows.length}</span>
                </span>
              ) : undefined
            }
          >
            {history === "loading" ? (
              <HistorySkeleton />
            ) : history === "failed" ? (
              <PanelNote>Settlements did not load from Arc mainnet. Reload the page to try again.</PanelNote>
            ) : rows.length > 0 ? (
              <SettlementsTable rows={rows} />
            ) : (
              <PanelNote>No Tidrel settlements from this address yet. Settled trades appear here with a receipt for each.</PanelNote>
            )}
          </Panel>
        </div>

        {history === "ready" && desk.truncated && (
          <p className="mt-4 text-small text-slate">
            Older settlements are not loaded. This view reads the most recent stretch of Arc mainnet.
          </p>
        )}

        <p className="mt-10 text-small text-slate">
          Read from Arc mainnet at block <span className="num">{desk.blockNumber.toString()}</span>.{" "}
          <Link href="/proof" className="rounded-input text-graphite underline underline-offset-4">
            See the mainnet proof
          </Link>
        </p>
      </div>
    </section>
  );
}
