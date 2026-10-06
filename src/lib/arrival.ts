import { formatUnits, parseUnits } from 'viem'
import { USDC_DECIMALS } from './chain'

/** A change smaller than this is gas or rounding, not USDC arriving (0.001 USDC). */
const MIN_ARRIVAL = 1_000n

/**
 * Did USDC land in the wallet while a loan is open? Returns the amount that arrived and
 * what a repay should be (the smaller of that and the debt), or null.
 */
export function usdcArrival(args: {
  previousUsdc: string
  currentUsdc: string
  debtUsdc: string
}): { arrivedUsdc: string; repayUsdc: string } | null {
  const prev = parseUnits(args.previousUsdc, USDC_DECIMALS)
  const cur = parseUnits(args.currentUsdc, USDC_DECIMALS)
  const debt = parseUnits(args.debtUsdc, USDC_DECIMALS)
  if (debt === 0n || cur - prev < MIN_ARRIVAL) return null
  const arrived = cur - prev
  return {
    arrivedUsdc: formatUnits(arrived, USDC_DECIMALS),
    repayUsdc: formatUnits(arrived < debt ? arrived : debt, USDC_DECIMALS),
  }
}
