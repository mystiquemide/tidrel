import type { Desk } from './desk'
import { formatUsdc } from './format'

export type Notice = {
  tone: 'info' | 'warn' | 'urgent'
  text: string
  link?: { href: string; label: string }
}

/** What a connected wallet should be told about its own desk, in plain language. */
/** `historyReady` is false while the settlement log is still loading, so nothing is claimed from it yet. */
export function deskNotices(desk: Desk, historyReady = true): Notice[] {
  if (!desk.ok || !desk.position) return []
  const p = desk.position
  const out: Notice[] = []
  const posted = Number(desk.collateralCirBtc) > 0
  const holds = Number(p.walletCirBtc) > 0
  const open = Number(p.debtUsdc) > 0

  if (!posted && !holds && !open) {
    out.push({
      tone: 'info',
      text: 'This wallet holds no cirBTC yet. Tidrel lends USDC against cirBTC, so add some to start.',
      link: { href: 'https://www.circle.com/cirbtc', label: 'About cirBTC' },
    })
  } else if (historyReady && !open && desk.settlements.length === 0) {
    out.push({
      tone: 'info',
      text: 'No loan yet. Your first draw posts the cirBTC it needs automatically.',
    })
  }

  if (open && p.band && p.healthFactor !== null) {
    const hf = p.healthFactor.toFixed(2)
    const near = p.liquidationPriceUsd ? ` Liquidation starts near $${formatUsdc(p.liquidationPriceUsd, 0)}.` : ''
    if (p.band === 'WARN') {
      out.push({ tone: 'warn', text: `Loan health is ${hf}.${near} Repay or add collateral to stay clear of it.` })
    }
    if (p.band === 'URGENT' || p.band === 'IMMINENT' || p.band === 'LIQUIDATABLE') {
      out.push({ tone: 'urgent', text: `Loan health is ${hf}, close to liquidation.${near} Repay or add collateral now.` })
    }
  }

  const stranded = !historyReady ? undefined : desk.settlements.find((s) => s.state === 'drawn-not-settled')
  if (open && stranded) {
    out.push({
      tone: 'warn',
      text: `${formatUsdc(stranded.drawnUsdc, 2)} USDC was drawn but the payout was not sent. Settle the trade again to pay from the USDC now in your wallet, or repay the draw.`,
    })
  }
  return out
}
