import { formatUnits } from 'viem'
import { USDC_DECIMALS } from './chain'
import type { Position } from './position'

const VIRTUAL_SHARES = 1_000_000n
const VIRTUAL_ASSETS = 1n

/** Morpho's own rounding: what a number of borrow shares owes, rounded up. */
export function borrowSharesToAssets(shares: bigint, totalBorrowAssets: bigint, totalBorrowShares: bigint): bigint {
  const num = shares * (totalBorrowAssets + VIRTUAL_ASSETS)
  const den = totalBorrowShares + VIRTUAL_SHARES
  return (num + den - 1n) / den
}

/**
 * Circle's Borrow service can lag the chain by tens of seconds after a draw or a repay.
 * Morpho is the ledger, so when the two disagree about whether any debt exists, the
 * chain wins. When both agree there is debt, the service's richer figures are kept.
 */
export function reconcileDebt(position: Position, morphoDebt: bigint): Position {
  const serviceHasDebt = Number(position.debtUsdc) > 0
  if (morphoDebt === 0n && serviceHasDebt) {
    return {
      ...position,
      loanId: position.loanId,
      debtUsdc: '0',
      accruedInterestUsdc: '0',
      healthFactor: null,
      band: null,
      liquidationPriceUsd: null,
    }
  }
  if (morphoDebt > 0n && !serviceHasDebt) {
    return { ...position, debtUsdc: formatUnits(morphoDebt, USDC_DECIMALS) }
  }
  return position
}
