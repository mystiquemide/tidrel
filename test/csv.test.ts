import { describe, expect, it } from 'vitest'
import { parseRecipients, settlementsToCsv } from '../src/lib/csv'
import type { Settlement } from '../src/lib/history'

const A = '0x1111111111111111111111111111111111111111'
const B = '0x2222222222222222222222222222222222222222'

const row = (over: Partial<Settlement>): Settlement => ({
  reference: 'BLK-1',
  txHash: '0xaa' as never,
  payoutAt: 1,
  legs: 3,
  totalUsdc: '1.2',
  drawTxHash: '0xbb' as never,
  drawAt: 0,
  drawnUsdc: '1.2',
  repayTxHash: '0xcc' as never,
  repaidAt: 45,
  openSeconds: 45,
  interestUsdc: '0.000001',
  sharedCycle: false,
  state: 'repaid',
  ...over,
})

describe('settlementsToCsv', () => {
  it('writes a header and one line per settlement', () => {
    const csv = settlementsToCsv([row({})])
    expect(csv.split('\n')[0]).toBe('reference,counterparties,drawn_usdc,open_seconds,interest_usdc,state,draw_tx,payout_tx,repay_tx')
    expect(csv.split('\n')[1]).toBe('BLK-1,3,1.2,45,0.000001,repaid,0xbb,0xaa,0xcc')
  })

  it('quotes commas and neutralises formulas', () => {
    const csv = settlementsToCsv([row({ reference: 'a,"b"' }), row({ reference: '=SUM(A1)' })])
    expect(csv).toContain('"a,""b"""')
    expect(csv).toContain("'=SUM(A1)")
  })

  it('leaves empty cells for a row with no draw', () => {
    const csv = settlementsToCsv([row({ drawTxHash: null, repayTxHash: null, openSeconds: null, interestUsdc: null, state: 'self-funded' })])
    expect(csv.split('\n')[1]).toBe('BLK-1,3,,,,self-funded,,0xaa,')
  })
})

describe('parseRecipients', () => {
  it('reads comma, tab and space separated lines and skips a header', () => {
    const out = parseRecipients(`address,amount\n${A},1.5\n${B}\t2\n${A} 0.25`)
    expect(out.errors).toEqual([])
    expect(out.rows).toEqual([
      { to: A, amount: '1.5' },
      { to: B, amount: '2' },
      { to: A, amount: '0.25' },
    ])
  })

  it('reports bad lines and keeps the good ones', () => {
    const out = parseRecipients(`${A},1\nnot-an-address,2\n${B},abc\n${B},1,2`)
    expect(out.rows).toHaveLength(1)
    expect(out.errors).toHaveLength(3)
  })

  it('ignores blank lines', () => {
    expect(parseRecipients(`\n\n${A},1\n\n`).rows).toHaveLength(1)
  })
})
