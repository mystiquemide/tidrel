import { describe, expect, it } from 'vitest'
import { usdcArrival } from '../src/lib/arrival'
import { borrowSharesToAssets, reconcileDebt } from '../src/lib/debt'
import type { Position } from '../src/lib/position'

const pos = (over: Partial<Position> = {}): Position => ({
  wallet: '0x1111111111111111111111111111111111111111', loanId: 'l', dataStatus: 'READY',
  collateralCirBtc: '0.00001', debtUsdc: '0', accruedInterestUsdc: '0', healthFactor: null, band: null,
  liquidationPriceUsd: null, borrowApy: 0.01, lineUsdc: '1', walletUsdc: '5', walletCirBtc: '0',
  marketLiquidityUsdc: '100', blockNumber: 1n, refreshedAt: 0, ...over,
})

describe('borrowSharesToAssets', () => {
  it('is zero for zero shares', () => expect(borrowSharesToAssets(0n, 5_000_000n, 5_000_000_000_000n)).toBe(0n))
  it('rounds up like Morpho', () => {
    // A share worth 1.000001 units rounds up to 2, and a sliver of a unit rounds up to 1.
    expect(borrowSharesToAssets(1n, 1_000_000n, 0n)).toBe(2n)
    expect(borrowSharesToAssets(1n, 0n, 0n)).toBe(1n)
  })
  it('matches the shares-to-assets ratio of a populated market', () => {
    // 1.2 USDC of debt: shares carry 6 extra decimals of virtual shares.
    expect(borrowSharesToAssets(1_200_000_000_000n, 10_000_000n, 10_000_000_000_000n)).toBeGreaterThanOrEqual(1_199_999n)
  })
})

describe('reconcileDebt', () => {
  it('clears stale debt when Morpho says it is repaid', () => {
    const r = reconcileDebt(pos({ debtUsdc: '1.200001', accruedInterestUsdc: '0.000001', healthFactor: 1.3, band: 'SAFE' }), 0n)
    expect(r).toMatchObject({ debtUsdc: '0', accruedInterestUsdc: '0', healthFactor: null, band: null })
  })
  it('shows the on-chain debt when the service has not seen the draw yet', () => {
    expect(reconcileDebt(pos({ debtUsdc: '0' }), 1_200_001n).debtUsdc).toBe('1.200001')
  })
  it('keeps the service figures when both agree there is debt', () => {
    const p = pos({ debtUsdc: '1.2', healthFactor: 1.3, band: 'SAFE' })
    expect(reconcileDebt(p, 1_200_000n)).toBe(p)
  })
  it('leaves a clean wallet alone', () => {
    const p = pos()
    expect(reconcileDebt(p, 0n)).toBe(p)
  })
})

describe('usdcArrival', () => {
  it('reports USDC that lands while a loan is open', () => {
    expect(usdcArrival({ previousUsdc: '1', currentUsdc: '2.5', debtUsdc: '1.2' })).toEqual({ arrivedUsdc: '1.5', repayUsdc: '1.2' })
    expect(usdcArrival({ previousUsdc: '1', currentUsdc: '1.5', debtUsdc: '1.2' })).toEqual({ arrivedUsdc: '0.5', repayUsdc: '0.5' })
  })
  it('stays quiet with no debt, no change, a drop, or dust', () => {
    expect(usdcArrival({ previousUsdc: '1', currentUsdc: '2', debtUsdc: '0' })).toBeNull()
    expect(usdcArrival({ previousUsdc: '2', currentUsdc: '2', debtUsdc: '1' })).toBeNull()
    expect(usdcArrival({ previousUsdc: '2', currentUsdc: '1', debtUsdc: '1' })).toBeNull()
    expect(usdcArrival({ previousUsdc: '2', currentUsdc: '2.0005', debtUsdc: '1' })).toBeNull()
  })
})
