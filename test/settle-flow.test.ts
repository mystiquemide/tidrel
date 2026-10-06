import { describe, expect, it, vi } from 'vitest'
import { SettleRefusal, type SettlementPlan } from '../src/lib/settle'
import { describeError, runSettlement } from '../src/lib/settleFlow'

const plan = (drawUsdc: string) => ({ drawUsdc }) as SettlementPlan
const base = () => ({
  checkReference: vi.fn(async () => {}),
  draw: vi.fn(async () => ({ txHash: '0xdraw' })),
  payout: vi.fn(async () => '0xpay'),
  onStep: vi.fn(),
})

describe('runSettlement', () => {
  it('checks, draws, then pays when the wallet is short', async () => {
    const d = base()
    const out = await runSettlement({ plan: plan('1.2'), ...d })
    expect(out).toEqual({ kind: 'settled', drawTx: '0xdraw', payoutTx: '0xpay' })
    expect(d.onStep.mock.calls.map((c) => c[0])).toEqual(['checking', 'drawing', 'paying'])
  })
  it('skips the draw when the wallet covers the payout', async () => {
    const d = base()
    const out = await runSettlement({ plan: plan('0'), ...d })
    expect(out).toEqual({ kind: 'settled', drawTx: null, payoutTx: '0xpay' })
    expect(d.draw).not.toHaveBeenCalled()
  })
  it('sends nothing when the reference is already used', async () => {
    const d = base()
    d.checkReference.mockRejectedValue(new SettleRefusal('DUPLICATE_REF', 'Reference already used.'))
    const out = await runSettlement({ plan: plan('1.2'), ...d })
    expect(out).toEqual({ kind: 'failed', error: 'Reference already used.' })
    expect(d.draw).not.toHaveBeenCalled()
    expect(d.payout).not.toHaveBeenCalled()
  })
  it('does not pay when the draw is cancelled', async () => {
    const d = base()
    d.draw.mockRejectedValue(Object.assign(new Error('x'), { code: 4001 }))
    const out = await runSettlement({ plan: plan('1.2'), ...d })
    expect(out).toEqual({ kind: 'failed', error: 'You cancelled in your wallet.' })
    expect(d.payout).not.toHaveBeenCalled()
  })
  it('reports drawn, not settled when the payout fails after a draw', async () => {
    const d = base()
    d.payout.mockRejectedValue(new Error('reverted'))
    const out = await runSettlement({ plan: plan('1.2'), ...d })
    expect(out).toEqual({ kind: 'drawn-not-settled', drawTx: '0xdraw', error: 'reverted' })
  })
  it('retries only the payout and never draws twice', async () => {
    const d = base()
    const out = await runSettlement({ plan: plan('1.2'), skipDraw: { drawTx: '0xdraw' }, ...d })
    expect(out).toEqual({ kind: 'settled', drawTx: '0xdraw', payoutTx: '0xpay' })
    expect(d.draw).not.toHaveBeenCalled()
    expect(d.checkReference).not.toHaveBeenCalled()
  })
  it('says a payout failure with no draw is plainly failed', async () => {
    const d = base()
    d.payout.mockRejectedValue(new Error('nope'))
    expect(await runSettlement({ plan: plan('0'), ...d })).toEqual({ kind: 'failed', error: 'nope' })
  })
})

describe('describeError', () => {
  it('recognises a wallet rejection by code or text', () => {
    expect(describeError({ code: 4001 })).toBe('You cancelled in your wallet.')
    expect(describeError(new Error('User rejected the request.'))).toBe('You cancelled in your wallet.')
  })
  it('keeps one short line of anything else', () => {
    expect(describeError(new Error('boom\nstack'))).toBe('boom')
    expect(describeError(undefined)).toBe('Something went wrong.')
  })
})
