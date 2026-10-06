import { describe, expect, it } from 'vitest'
import type { Settlement } from '../src/lib/history'
import { headlineCycle, proofFigures } from '../src/lib/landing'

const cycle = (over: Partial<Settlement> = {}): Settlement => ({
  reference: 'BLK-0413',
  txHash: '0xpay',
  payoutAt: 1001,
  legs: 3,
  totalUsdc: '1.2',
  drawTxHash: '0xdraw',
  drawAt: 1000,
  drawnUsdc: '1.2',
  repayTxHash: '0xrepay',
  repaidAt: 1199,
  openSeconds: 199,
  interestUsdc: '0.000001',
  sharedCycle: false,
  state: 'repaid',
  ...over,
})

describe('proofFigures', () => {
  it('formats the four figures exactly', () => {
    expect(proofFigures(cycle())).toEqual({
      drawn: '1.20',
      seconds: '199',
      interest: '0.000001',
      legs: '3',
    })
  })

  it('keeps six places on a tiny interest and rounds the draw to two', () => {
    expect(proofFigures(cycle({ drawnUsdc: '1.204999', interestUsdc: '0.000012' }))).toMatchObject({
      drawn: '1.20',
      interest: '0.000012',
    })
  })

  it('returns nothing until the cycle is measured', () => {
    expect(proofFigures(null)).toBeNull()
    expect(proofFigures(cycle({ openSeconds: null }))).toBeNull()
    expect(proofFigures(cycle({ interestUsdc: null }))).toBeNull()
    expect(proofFigures(cycle({ drawTxHash: null }))).toBeNull()
  })
})

describe('headlineCycle', () => {
  it('prefers the newest clean repaid cycle', () => {
    const older = cycle({ reference: 'A', txHash: '0xa' })
    const newer = cycle({ reference: 'B', txHash: '0xb' })
    expect(headlineCycle([older, newer])?.reference).toBe('B')
  })

  it('skips shared cycles when a clean one exists', () => {
    const clean = cycle({ reference: 'CLEAN' })
    const shared = cycle({ reference: 'SHARED', sharedCycle: true })
    expect(headlineCycle([clean, shared])?.reference).toBe('CLEAN')
  })

  it('falls back to a shared cycle, and to nothing when none repaid', () => {
    expect(headlineCycle([cycle({ sharedCycle: true })])).not.toBeNull()
    expect(headlineCycle([cycle({ state: 'open', repayTxHash: null })])).toBeNull()
    expect(headlineCycle([])).toBeNull()
  })
})
