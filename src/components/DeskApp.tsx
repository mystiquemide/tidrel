"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EIP1193Provider } from "viem";
import { formatUnits, getAddress, type Address } from "viem";
import { loadDeskHeader, loadDeskHistory } from "@/app/desk/actions";
import { erc20Abi } from "@/lib/abis";
import { usdcArrival } from "@/lib/arrival";
import { ADDRESSES, ARC_CHAIN_ID, DEMO_DESK_ADDRESS, USDC_DECIMALS } from "@/lib/chain";
import { publicClient } from "@/lib/client";
import { switchToArc } from "@/lib/connect";
import type { Desk } from "@/lib/desk";
import { deskNotices } from "@/lib/notices";
import { checkWallet, type WalletCheck } from "@/lib/wallet";
import {
  addWallet,
  discoverWallets,
  lastWallet,
  rememberWallet,
  type WalletOption,
} from "@/lib/wallets";
import { shortHash } from "@/lib/format";
import { AppBar } from "./AppBar";
import { DeskView } from "./DeskView";
import Image from "next/image";
import { PillLink, pillClass } from "./PillLink";
import { ArrivalToast } from "./ArrivalToast";
import { CollateralSheet } from "./CollateralSheet";
import { RepaySheet } from "./RepaySheet";
import { SettleSheet } from "./SettleSheet";
import { WalletPicker } from "./WalletPicker";

type Session = { wallet: WalletOption; address: Address; chainId: number };
type Result =
  | { kind: "blocked"; check: Extract<WalletCheck, { ok: false }> }
  | { kind: "desk"; desk: Desk | null; history: "loading" | "ready" | "failed" };

const READ_TIMEOUT_MS = 45_000;

function Gate({
  title,
  body,
  note,
  children,
}: {
  title: string;
  body: string;
  note?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="bg-porcelain">
      <div className="mx-auto grid w-full max-w-[1224px] gap-10 px-6 py-10 md:px-8 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="relative h-[200px] overflow-hidden rounded-card sm:h-[280px] lg:h-full lg:min-h-[560px]">
          <Image src="/images/gate.webp" alt="" fill priority sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
        </div>
        <div className="max-w-xl pb-10 lg:pb-0">
          <p className="eyebrow">Arc mainnet</p>
          <h1 className="mt-5 text-[36px] leading-[1.08] tracking-[-0.02em] md:text-[48px]">{title}</h1>
          <p className="mt-6 text-lead text-slate">{body}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">{children}</div>
          {note}
        </div>
      </div>
    </section>
  );
}

/** The connect flow and the connected desk. Reads need no wallet, so the demo desk is always one link away. */
export function DeskApp() {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // What was read for one wallet and network. A different key means a read is still due.
  const [result, setResult] = useState<{ key: string; value: Result } | null>(null);
  const [waited, setWaited] = useState(false);
  // False while rendering on the server and during hydration, so both agree.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const restored = useRef(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState(false);
  const [collateralOpen, setCollateralOpen] = useState(false);
  const [repayRun, setRepayRun] = useState(0);
  const [repaySuggested, setRepaySuggested] = useState<string | undefined>(undefined);
  const [arrival, setArrival] = useState<{ arrivedUsdc: string; repayUsdc: string } | null>(null);
  // Bumped to read the desk again without changing wallet or network.
  const [refreshTick, setRefreshTick] = useState(0);

  // Wallets announce themselves. Collect them as they arrive.
  useEffect(
    () => discoverWallets((a) => setWallets((list) => addWallet(list, a))),
    [],
  );

  const connect = useCallback(async (wallet: WalletOption, silent = false) => {
    setBusy(true);
    setError(null);
    try {
      const accounts = (await wallet.provider.request({
        method: silent ? "eth_accounts" : "eth_requestAccounts",
      })) as string[];
      if (!accounts[0]) return;
      const chainHex = (await wallet.provider.request({ method: "eth_chainId" })) as string;
      setSession({ wallet, address: getAddress(accounts[0]), chainId: Number(chainHex) });
      rememberWallet(wallet.rdns);
      setPickerOpen(false);
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError(
        code === 4001
          ? "The connection was cancelled. Pick a wallet to try again."
          : "The wallet did not connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  // Reconnect quietly to the wallet used last time, without opening a prompt.
  useEffect(() => {
    if (restored.current || session) return;
    const last = lastWallet();
    const hit = last ? wallets.find((w) => w.rdns === last) : undefined;
    if (hit) {
      restored.current = true;
      void Promise.resolve().then(() => connect(hit, true));
    }
  }, [wallets, session, connect]);

  // Nothing remembered and nothing announced yet: show the gate rather than a spinner.
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Follow the wallet when the user changes account or network.
  const activeProvider = session?.wallet.provider ?? null;
  useEffect(() => {
    if (!activeProvider) return;
    const p: EIP1193Provider = activeProvider;
    const onAccounts = (accs: unknown) => {
      const next = (accs as string[])[0];
      if (!next) disconnect();
      else setSession((s) => (!s || s.address === getAddress(next) ? s : { ...s, address: getAddress(next) }));
    };
    const onChain = (id: unknown) => setSession((s) => (!s || s.chainId === Number(id) ? s : { ...s, chainId: Number(id) }));
    p.on("accountsChanged", onAccounts);
    p.on("chainChanged", onChain);
    return () => {
      p.removeListener("accountsChanged", onAccounts);
      p.removeListener("chainChanged", onChain);
    };
  }, [activeProvider]);

  // Check the wallet, then read its desk.
  const address = session?.address;
  const chainId = session?.chainId;
  useEffect(() => {
    if (!address || chainId === undefined) return;
    let live = true;
    const key = `${address}:${chainId}`;
    // Start both reads at once. The loan shows as soon as it lands and the slower
    // history fills in after, so the page is useful in a second or two.
    const guard = <T,>(p: Promise<T | null>) =>
      Promise.race([
        p.catch((e) => {
          console.error("Tidrel: reading the desk failed", e);
          return null;
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
      ]);
    const header = guard(loadDeskHeader(address));
    const history = guard(loadDeskHistory(address));
    (async () => {
      const check = await checkWallet({ address, chainId, publicClient }).catch(
        () => ({ ok: true }) as WalletCheck,
      );
      if (!live) return;
      if (!check.ok) return setResult({ key, value: { kind: "blocked", check } });

      const h = await header;
      if (!live) return;
      if (!h) return setResult({ key, value: { kind: "desk", desk: null, history: "ready" } });
      const base = {
        ok: true as const,
        address,
        position: h.position,
        collateralCirBtc: h.collateralCirBtc,
        truncated: false,
        blockNumber: h.blockNumber,
      };
      setResult({ key, value: { kind: "desk", desk: { ...base, settlements: [] }, history: "loading" } });

      const hist = await history;
      if (!live) return;
      setResult({
        key,
        value: {
          kind: "desk",
          desk: hist
            ? { ...base, settlements: hist.settlements, truncated: hist.truncated, blockNumber: hist.blockNumber }
            : { ...base, settlements: [] },
          history: hist ? "ready" : "failed",
        },
      });
    })();
    return () => {
      live = false;
    };
  }, [address, chainId, refreshTick]);

  // While a loan is open, watch the wallet for USDC arriving so the repay is one tap away.
  const liveDesk = session && result && result.key === `${session.address}:${session.chainId}` && result.value.kind === "desk" && result.value.desk?.ok ? result.value.desk : null;
  const livePosition = liveDesk?.position ?? null;
  const positionRef = useRef(livePosition);
  positionRef.current = livePosition;
  const debtOpen = Number(livePosition?.debtUsdc ?? 0) > 0;
  useEffect(() => {
    if (!address || !debtOpen) return;
    let live = true;
    let baseline: string | undefined = positionRef.current?.walletUsdc;
    const id = setInterval(async () => {
      const raw = await publicClient
        .readContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: "balanceOf", args: [address] })
        .catch(() => null);
      const pos = positionRef.current;
      if (!live || raw === null || !pos) return;
      const current = formatUnits(raw, USDC_DECIMALS);
      if (baseline === undefined) {
        baseline = current;
        return;
      }
      const hit = usdcArrival({ previousUsdc: baseline, currentUsdc: current, debtUsdc: pos.debtUsdc });
      baseline = current;
      if (hit) setArrival(hit);
    }, 15_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [address, debtOpen]);

  function openRepay(suggested?: string) {
    setRepaySuggested(suggested);
    setRepayRun((n) => n + 1);
    setSettleOpen(false);
    setArrival(null);
    setRepayOpen(true);
  }

  function disconnect() {
    rememberWallet(null);
    setSession(null);
    setResult(null);
    setArrival(null);
  }

  async function onSwitch() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await switchToArc(session.wallet.provider);
    } catch {
      setError("The wallet did not switch to Arc mainnet. Switch networks in the wallet and try again.");
    } finally {
      setBusy(false);
    }
  }

  const picker = (
    <WalletPicker
      open={pickerOpen}
      wallets={wallets}
      busy={busy}
      onPick={(w) => void connect(w)}
      onClose={() => setPickerOpen(false)}
    />
  );
  const errorLine = error && (
    <p role="alert" className="mt-6 text-small text-warn">
      {error}
    </p>
  );

  const view =
    session && result && result.key === `${session.address}:${session.chainId}` ? result.value : null;

  let content: React.ReactNode;
  if (!session) {
    // Give a remembered wallet a moment to announce itself before showing the gate.
    content =
      !mounted || (!waited && lastWallet()) ? (
        <Gate
          title="Reconnecting to your wallet."
          body="Tidrel is checking the wallet you used last time. Nothing is signed and nothing moves."
        >
          <p role="status" className="text-small text-slate">Waiting for the wallet to answer.</p>
        </Gate>
      ) : (
        <Gate
          title="Connect a wallet to open your desk."
          body="Tidrel runs on Arc mainnet. Your wallet signs every step, and Tidrel never holds your funds or your keys."
          note={errorLine}
        >
          <button type="button" onClick={() => setPickerOpen(true)} className={pillClass("primary")}>
            Connect wallet
          </button>
          <PillLink href={`/view/${DEMO_DESK_ADDRESS}`} variant="secondary">
            View the demo desk
          </PillLink>
        </Gate>
      );
  } else if (!view) {
    content = (
      <section className="bg-porcelain" aria-busy="true">
        <div className="mx-auto w-full max-w-[1224px] px-6 pt-14 md:px-8">
          <p role="status" className="text-small text-slate">Reading your desk from Arc mainnet.</p>
          <div className="skeleton mt-5 h-10 w-64" />
          <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="skeleton h-72" />
            <div className="skeleton h-72" />
          </div>
          <div className="skeleton mt-4 h-52" />
        </div>
      </section>
    );
  } else if (view.kind === "blocked") {
    const wrongChain = view.check.reason === "WRONG_CHAIN";
    content = (
      <Gate
        title={wrongChain ? "Switch to Arc mainnet to continue." : "Tidrel needs a regular wallet."}
        body={
          wrongChain
            ? `Your wallet is on chain ${view.check.reason === "WRONG_CHAIN" ? view.check.chainId : ""}. Tidrel runs on Arc mainnet, chain ${ARC_CHAIN_ID}.`
            : "The payout contracts reject smart-contract accounts, so this wallet cannot settle trades. Connect a regular wallet instead."
        }
        note={errorLine}
      >
        {wrongChain && (
          <button type="button" disabled={busy} onClick={onSwitch} className={pillClass("primary")}>
            Switch to Arc mainnet
          </button>
        )}
        <button type="button" onClick={disconnect} className={pillClass("secondary")}>
          Use another wallet
        </button>
      </Gate>
    );
  } else if (!view.desk) {
    content = (
      <Gate title="Chain data is unavailable right now." body="Every figure on this page is read from Arc mainnet, so nothing is shown until the read works. Try again in a moment.">
        <button type="button" onClick={() => { setResult(null); setRefreshTick((n) => n + 1); }} className={pillClass("primary")}>
          Try again
        </button>
        <button type="button" onClick={disconnect} className={pillClass("secondary")}>
          Disconnect
        </button>
      </Gate>
    );
  } else {
    const okDesk = view.desk.ok ? view.desk : null;
    const drawsDown = !okDesk?.position;
    content = (
      <>
        <DeskView
          desk={view.desk}
          mode="desk"
          history={view.history}
          notices={deskNotices(view.desk, view.history === "ready")}
          primary={
            okDesk && (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-porcelain px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0">
              <div className="flex gap-3">
                {okDesk?.position && (
                  <button
                    type="button"
                    onClick={() => setCollateralOpen(true)}
                    className={pillClass("secondary")}
                  >
                    Collateral
                  </button>
                )}
                {debtOpen && (
                  <button
                    type="button"
                    onClick={() => openRepay()}
                    className={pillClass("secondary")}
                  >
                    Repay
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSettleOpen(true)}
                  disabled={drawsDown}
                  className={pillClass("primary", "md", "flex-1 sm:flex-none")}
                >
                  Settle a trade
                </button>
              </div>
              {drawsDown && (
                <p className="mt-2 text-caption text-slate sm:mt-3 sm:max-w-xs sm:text-small md:text-right">
                  Settling needs the Borrow service, which is unreachable. Chain data is still shown.
                </p>
              )}
            </div>
            )
          }
        />
        {session && okDesk && (
          <SettleSheet
            open={settleOpen}
            address={session.address}
            provider={session.wallet.provider}
            settlements={okDesk.settlements}
            onClose={() => setSettleOpen(false)}
            onRepay={() => openRepay()}
            onChanged={() => setRefreshTick((n) => n + 1)}
          />
        )}
        {session && okDesk && (
          <RepaySheet
            key={repayRun}
            open={repayOpen}
            address={session.address}
            provider={session.wallet.provider}
            settlements={okDesk.settlements}
            suggestedUsdc={repaySuggested}
            onClose={() => setRepayOpen(false)}
            onChanged={() => setRefreshTick((n) => n + 1)}
          />
        )}
        {session && okDesk && (
          <CollateralSheet
            open={collateralOpen}
            address={session.address}
            provider={session.wallet.provider}
            onClose={() => setCollateralOpen(false)}
            onChanged={() => setRefreshTick((n) => n + 1)}
          />
        )}
        {arrival && !settleOpen && !repayOpen && !collateralOpen && (
          <ArrivalToast
            arrivedUsdc={arrival.arrivedUsdc}
            repayUsdc={arrival.repayUsdc}
            onRepay={() => openRepay(arrival.repayUsdc)}
            onDismiss={() => setArrival(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <AppBar>
        {session && (
          <>
            <span className="hidden h-10 items-center gap-2 rounded-pill border border-mist px-4 text-small whitespace-nowrap text-ink sm:inline-flex">
              <span className="h-2 w-2 rounded-pill bg-violet" aria-hidden="true" />
              <span className="num">{shortHash(session.address)}</span>
            </span>
            <button
              type="button"
              onClick={disconnect}
              className={pillClass("secondary", "sm")}
            >
              Disconnect
            </button>
          </>
        )}
      </AppBar>
      <main id="main" className="flex-1">
        {content}
      </main>
      {picker}
    </>
  );
}
