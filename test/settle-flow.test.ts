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
    expect(out).toEqual({ kind: 'failed', error: expect.stringContaining('You cancelled in your wallet. Nothing was sent.') })
    expect(d.payout).not.toHaveBeenCalled()
  })
  it('reports drawn, not settled when the payout fails after a draw', async () => {
    const d = base()
    d.payout.mockRejectedValue(new Error('reverted'))
    const out = await runSettlement({ plan: plan('1.2'), ...d })
    expect(out).toEqual({ kind: 'drawn-not-settled', drawTx: '0xdraw', error: 'The transaction did not go through. Check your wallet, then try again. Reason: reverted' })
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
    expect(await runSettlement({ plan: plan('0'), ...d })).toEqual({ kind: 'failed', error: 'The transaction did not go through. Check your wallet, then try again. Reason: nope' })
  })
})

describe('describeError', () => {
  it('recognises a wallet rejection by code or text', () => {
    expect(describeError({ code: 4001 })).toContain('You cancelled in your wallet. Nothing was sent.')
    expect(describeError(new Error('User rejected the request.'))).toContain('You cancelled in your wallet. Nothing was sent.')
  })
  it('explains Circle holding an earlier attempt to open the loan, with the time it clears', () => {
    const e = new Error(
      'BORROW_LOAN_ALREADY_EXISTS: An earlier signed request to open this loan is still live and has not expired. Wait for it to land or expire and retry after 2026-10-08T12:00:28Z; supplying loanId does not bypass it.',
    )
    const text = describeError(e)
    expect(text).toContain('still holding your earlier attempt')
    expect(text).toContain('Nothing was sent.')
    expect(text).toMatch(/Try again after \d/)
    expect(text).not.toContain('BORROW_LOAN_ALREADY_EXISTS')
    expect(describeError(new Error('BORROW_LOAN_ALREADY_EXISTS: wait'))).toContain('Try again in a few minutes.')
  })
  it('shows Tidrel messages as written and keeps an unknown error to one short reason line', () => {
    expect(describeError(new Error('Your wallet disconnected. Reconnect it and try again.'))).toBe(
      'Your wallet disconnected. Reconnect it and try again.',
    )
    expect(describeError(new Error('insufficient funds for gas'))).toContain('does not have enough')
    // Only the first line of an unknown error is shown, never a stack, and it is capped in length.
    expect(describeError(new Error('boom\nstack'))).toBe('The transaction did not go through. Check your wallet, then try again. Reason: boom')
    expect(describeError(new Error('x'.repeat(500)))).toHaveLength('The transaction did not go through. Check your wallet, then try again. Reason: '.length + 140)
    expect(describeError(Object.assign(new Error('Internal JSON-RPC error.'), { code: -32603 }))).toContain('Reason: Internal JSON-RPC error. [-32603]')
    expect(describeError(undefined)).toBe('The transaction did not go through. Check your wallet, then try again.')
  })
})
