import { describe, expect, it } from 'vitest'
import type { Settlement } from '../src/lib/history'
import { tidePoints } from '../src/lib/tide'

const row = (over: Partial<Settlement>): Settlement => ({
  reference: 'BLK-1',
  txHash: '0xpay',
  payoutAt: 1001,
  legs: 3,
  totalUsdc: '1.2',
  drawTxHash: '0xdraw',
  drawAt: 1000,
  drawnUsdc: '1.2',
  repayTxHash: null,
  repaidAt: null,
  openSeconds: null,
  interestUsdc: null,
  sharedCycle: false,
  state: 'open',
  ...over,
})

describe('tidePoints', () => {
  it('rises at the draw and returns to zero at the repay', () => {
    const pts = tidePoints([
      row({ state: 'repaid', repayTxHash: '0xrepay', repaidAt: 1199, openSeconds: 199, interestUsdc: '0.000001' }),
    ])
    expect(pts).toEqual([
      { t: 1000, debtUsdc: '1.2', kind: 'draw', txHash: '0xdraw' },
      { t: 1199, debtUsdc: '0', kind: 'repay', txHash: '0xrepay' },
    ])
  })

  it('stays up while a settlement is open', () => {
    expect(tidePoints([row({})]).map((p) => p.debtUsdc)).toEqual(['1.2'])
  })

  it('stacks overlapping draws and clears them on one repay', () => {
    const pts = tidePoints([
      row({ drawTxHash: '0xa', drawAt: 1000, drawnUsdc: '1', state: 'repaid', repayTxHash: '0xr', repaidAt: 1100, sharedCycle: true }),
      row({ drawTxHash: '0xb', drawAt: 1010, drawnUsdc: '3', state: 'repaid', repayTxHash: '0xr', repaidAt: 1100, sharedCycle: true }),
    ])
    expect(pts.map((p) => p.debtUsdc)).toEqual(['1', '4', '3', '0'])
  })

  it('ignores self-funded rows and returns nothing for an empty history', () => {
    expect(tidePoints([row({ drawTxHash: null, drawAt: null, drawnUsdc: '0', state: 'self-funded' })])).toEqual([])
    expect(tidePoints([])).toEqual([])
  })

  it('counts a drawn-not-settled draw', () => {
    const pts = tidePoints([row({ reference: null, txHash: null, state: 'drawn-not-settled' })])
    expect(pts).toHaveLength(1)
  })
})
