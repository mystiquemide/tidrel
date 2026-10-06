import type { EIP1193Provider } from 'viem'

/** A wallet that announced itself through EIP-6963. */
export type WalletOption = {
  uuid: string
  name: string
  icon: string
  rdns: string
  provider: EIP1193Provider
}

type Announcement = {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: EIP1193Provider
}

export const INSTALL_LINKS = [
  { name: 'MetaMask', href: 'https://metamask.io/download' },
  { name: 'Rabby', href: 'https://rabby.io' },
] as const

const LAST_WALLET_KEY = 'tidrel-wallet'

/** One entry per wallet, newest announcement winning, in a stable order. */
export function addWallet(list: WalletOption[], a: Announcement): WalletOption[] {
  const next: WalletOption = { ...a.info, provider: a.provider }
  const rest = list.filter((w) => w.rdns !== next.rdns)
  return [...rest, next].sort((x, y) => x.name.localeCompare(y.name))
}

/** Starts listening for wallets and asks them to announce. Returns a stop function. */
export function discoverWallets(onFound: (a: Announcement) => void) {
  const handler = (e: Event) => onFound((e as CustomEvent<Announcement>).detail)
  window.addEventListener('eip6963:announceProvider', handler)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  return () => window.removeEventListener('eip6963:announceProvider', handler)
}

export const rememberWallet = (rdns: string | null) => {
  try {
    if (rdns) localStorage.setItem(LAST_WALLET_KEY, rdns)
    else localStorage.removeItem(LAST_WALLET_KEY)
  } catch {
    // Storage can be blocked. The desk works without it.
  }
}

export const lastWallet = (): string | null => {
  try {
    return localStorage.getItem(LAST_WALLET_KEY)
  } catch {
    return null
  }
}
