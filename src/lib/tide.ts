import { formatUnits, parseUnits } from 'viem'
import { USDC_DECIMALS } from './chain'
import type { Settlement } from './history'

export type TidePoint = {
  /** Unix seconds of the block that changed the debt. */
  t: number
  /** Principal outstanding after this event, in USDC. */
  debtUsdc: string
  kind: 'draw' | 'repay'
  txHash: string
}

/**
 * Step data for the tide line: principal outstanding over time. Debt rises at each
 * draw and falls at the repay that closed it. Self-funded rows never drew, so they
 * add nothing. Interest is excluded so a closed cycle returns exactly to zero.
 */
export function tidePoints(settlements: Settlement[]): TidePoint[] {
  const steps: { t: number; delta: bigint; kind: 'draw' | 'repay'; txHash: string }[] = []
  for (const s of settlements) {
    if (!s.drawTxHash || s.drawAt === null) continue
    const drawn = parseUnits(s.drawnUsdc, USDC_DECIMALS)
    steps.push({ t: s.drawAt, delta: drawn, kind: 'draw', txHash: s.drawTxHash })
    if (s.repaidAt !== null && s.repayTxHash) {
      steps.push({ t: s.repaidAt, delta: -drawn, kind: 'repay', txHash: s.repayTxHash })
    }
  }
  steps.sort((a, b) => a.t - b.t || (a.kind === 'draw' ? -1 : 1))

  let debt = 0n
  return steps.map((st) => {
    debt += st.delta
    return { t: st.t, debtUsdc: formatUnits(debt, USDC_DECIMALS), kind: st.kind, txHash: st.txHash }
  })
}
