"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EIP1193Provider } from "viem";
import { getAddress, type Address } from "viem";
import { loadDesk } from "@/app/desk/actions";
import { ARC_CHAIN_ID, DEMO_DESK_ADDRESS } from "@/lib/chain";
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
import { PillLink } from "./PillLink";
import { WalletPicker } from "./WalletPicker";

type Session = { wallet: WalletOption; address: Address; chainId: number };
type Result =
  | { kind: "blocked"; check: Extract<WalletCheck, { ok: false }> }
  | { kind: "desk"; desk: Desk | null };

const btn =
  "inline-flex items-center justify-center rounded-pill px-6 py-3.5 text-[15px] font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-60";

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
    <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-ink text-text">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 py-16 text-center">
        <h1 className="max-w-[18ch] text-[40px] leading-[1.05] font-[550] tracking-[-0.03em] md:text-display">
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-lead text-ebb">{body}</p>
        <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          {children}
        </div>
        {note}
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
  useEffect(() => {
    if (!session) return;
    const p: EIP1193Provider = session.wallet.provider;
    const onAccounts = (accs: unknown) => {
      const next = (accs as string[])[0];
      if (!next) disconnect();
      else setSession((s) => (s ? { ...s, address: getAddress(next) } : s));
    };
    const onChain = (id: unknown) => setSession((s) => (s ? { ...s, chainId: Number(id) } : s));
    p.on("accountsChanged", onAccounts);
    p.on("chainChanged", onChain);
    return () => {
      p.removeListener("accountsChanged", onAccounts);
      p.removeListener("chainChanged", onChain);
    };
  }, [session]);

  // Check the wallet, then read its desk.
  useEffect(() => {
    if (!session) return;
    let live = true;
    const key = `${session.address}:${session.chainId}`;
    (async () => {
      const check = await checkWallet({
        address: session.address,
        chainId: session.chainId,
        publicClient,
      }).catch(() => ({ ok: true }) as WalletCheck);
      if (!live) return;
      if (!check.ok) return setResult({ key, value: { kind: "blocked", check } });
      const desk = await loadDesk(session.address).catch(() => null);
      if (live) setResult({ key, value: { kind: "desk", desk } });
    })();
    return () => {
      live = false;
    };
  }, [session]);

  function disconnect() {
    rememberWallet(null);
    setSession(null);
    setResult(null);
  }

  async function onSwitch() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await switchToArc(session.wallet.provider);
    } catch {
      setError("The wallet did not switch to Arc. Switch networks in the wallet and try again.");
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
        <div className="min-h-[60vh]" aria-busy="true" />
      ) : (
        <Gate
          title="Connect a wallet to open your desk."
          body="Tidrel runs on Arc. Your wallet signs every step, and Tidrel never holds your funds or your keys."
          note={errorLine}
        >
          <button type="button" onClick={() => setPickerOpen(true)} className={`${btn} bg-tide text-ink hover:brightness-95`}>
            Connect wallet
          </button>
          <PillLink href={`/view/${DEMO_DESK_ADDRESS}`} variant="dark">
            View the demo desk
          </PillLink>
        </Gate>
      );
  } else if (!view) {
    content = (
      <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center" aria-busy="true">
        <p className="text-lead text-ebb">Reading your desk from Arc.</p>
      </section>
    );
  } else if (view.kind === "blocked") {
    const wrongChain = view.check.reason === "WRONG_CHAIN";
    content = (
      <Gate
        title={wrongChain ? "Switch to Arc to continue." : "Tidrel needs a regular wallet."}
        body={
          wrongChain
            ? `Your wallet is on chain ${view.check.reason === "WRONG_CHAIN" ? view.check.chainId : ""}. Tidrel runs on Arc, chain ${ARC_CHAIN_ID}.`
            : "The payout contracts reject smart-contract accounts, so this wallet cannot settle trades. Connect a regular wallet instead."
        }
        note={errorLine}
      >
        {wrongChain && (
          <button type="button" disabled={busy} onClick={onSwitch} className={`${btn} bg-tide text-ink hover:brightness-95`}>
            Switch to Arc
          </button>
        )}
        <button type="button" onClick={disconnect} className={`${btn} bg-panel text-text hover:bg-line`}>
          Use another wallet
        </button>
      </Gate>
    );
  } else if (!view.desk) {
    content = (
      <Gate title="Chain data is unavailable right now." body="Every figure on this page is read from Arc, so nothing is shown until the read works. Try again in a moment.">
        <button type="button" onClick={() => setSession({ ...session })} className={`${btn} bg-paper text-ink hover:bg-paper/90`}>
          Try again
        </button>
        <button type="button" onClick={disconnect} className={`${btn} bg-panel text-text hover:bg-line`}>
          Disconnect
        </button>
      </Gate>
    );
  } else {
    content = <DeskView desk={view.desk} mode="desk" notices={deskNotices(view.desk)} />;
  }

  return (
    <>
      <AppBar>
        {session && (
          <>
            <span className="hidden items-center gap-2 rounded-badge bg-panel px-3 py-2 text-small whitespace-nowrap text-ebb sm:inline-flex">
              <span className="h-2 w-2 rounded-pill bg-tide" aria-hidden="true" />
              <span className="num">{shortHash(session.address)}</span>
            </span>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-pill bg-panel px-4 py-2 text-small font-medium text-ebb hover:bg-line hover:text-text"
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
