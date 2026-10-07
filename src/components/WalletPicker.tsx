"use client";

import { useEffect, useRef } from "react";
import { INSTALL_LINKS, type WalletOption } from "@/lib/wallets";

/** A modal list of the wallets the browser announced. It never guesses at wallets that are not there. */
export function WalletPicker({
  open,
  wallets,
  busy,
  onPick,
  onClose,
}: {
  open: boolean;
  wallets: WalletOption[];
  busy: boolean;
  onPick: (w: WalletOption) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="wallet-picker-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="card m-auto w-[min(92vw,420px)] p-0 text-ink"
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id="wallet-picker-title" className="text-h3 font-medium tracking-[-0.02em]">
            Connect a wallet
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-graphite hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {wallets.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-2">
            {wallets.map((w) => (
              <li key={w.rdns}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(w)}
                  className="flex w-full items-center gap-3 rounded-cell border border-mist bg-porcelain px-4 py-3.5 text-left text-[16px] font-medium text-ink transition-colors hover:border-violet/60 hover:bg-mist disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.icon} alt="" width={28} height={28} className="rounded-input" />
                  {w.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <p className="text-[16px] text-graphite">
              No wallet found in this browser. Install one, then reload this page.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {INSTALL_LINKS.map((l) => (
                <li key={l.name}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between rounded-cell border border-mist bg-porcelain px-4 py-3.5 text-[16px] font-medium text-ink transition-colors hover:border-violet/60 hover:bg-mist"
                  >
                    Install {l.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </dialog>
  );
}
