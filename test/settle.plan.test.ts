import { describe, expect, it, vi } from 'vitest'
import {
  planSettlement,
  type PlanDeps,
  type SettlePosition,
} from '../src/lib/settle'

const WALLET = '0x2222222222222222222222222222222222222222' as const
const A = '0x1111111111111111111111111111111111111111'
const B = '0x3333333333333333333333333333333333333333'

const position = (over: Partial<SettlePosition> = {}): SettlePosition => ({
  wallet: WALLET,
  loanId: 'loan-1',
  hasCollateral: true,
  walletUsdc: '0.4', walletCirBtc: '0.001',
  marketLiquidityUsdc: '100',
  ...over,
})

const deps = (over: Partial<PlanDeps> = {}): PlanDeps => ({
  quoteDraw: vi.fn(async () => ({ resultingHealthFactor: 1.31 })),
  findReference: vi.fn(async () => null),
  newKey: () => 'key-1',
  ...over,
})

const legs = [
  { to: A, amountUsdc: '4' },
  { to: B, amountUsdc: '2' },
]

describe('planSettlement', () => {
  it('draws the shortfall plus a small gas reserve that stays in the wallet', async () => {
    const d = deps()
    const plan = await planSettlement({ reference: 'BLK-1', legs }, position(), d)
    expect(plan.refusal).toBeNull()
    expect(plan.totalUsdc).toBe('6')
    // The wallet holds 0.4, the payout is 6, so the shortfall is 5.6 and the reserve adds 0.05.
    expect(plan.drawUsdc).toBe('5.65')
    expect(plan.resultingHealth).toBe(1.31)
    expect(plan.idempotencyKey).toBe('key-1')
    expect(d.quoteDraw).toHaveBeenCalledWith({
      wallet: WALLET,
      loanId: 'loan-1',
      drawUsdc: '5.65',
    })
  })

  it('leaves the gas reserve in the wallet after paying everyone', async () => {
    const plan = await planSettlement({ reference: 'BLK-1', legs }, position(), deps())
    const wallet = 0.4
    expect(wallet + Number(plan.drawUsdc) - Number(plan.totalUsdc)).toBeCloseTo(0.05, 6)
  })

  it('draws nothing when the wallet already covers the payout', async () => {
    const d = deps()
    const plan = await planSettlement({ reference: 'BLK-1', legs }, position({ walletUsdc: '10' }), d)
    expect(plan.drawUsdc).toBe('0')
    expect(d.quoteDraw).not.toHaveBeenCalled()
  })

  it('self-funds with no draw or quote when the wallet covers the total', async () => {
    const d = deps()
    const plan = await planSettlement({ reference: 'BLK-1', legs }, position({ walletUsdc: '6' }), d)
    expect(plan.refusal).toBeNull()
    expect(plan.drawUsdc).toBe('0')
    expect(d.quoteDraw).not.toHaveBeenCalled()
  })

  it('refuses a reused reference with the earlier tx', async () => {
    const tx = `0x${'ab'.repeat(32)}` as const
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position(),
      deps({ findReference: async () => tx }),
    )
    expect(plan.refusal).toBe('DUPLICATE_REF')
    expect(plan.duplicateTx).toBe(tx)
  })

  it('refuses when resulting health is 1.19', async () => {
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position(),
      deps({ quoteDraw: async () => ({ resultingHealthFactor: 1.19 }) }),
    )
    expect(plan.refusal).toBe('HEALTH')
    expect(plan.resultingHealth).toBe(1.19)
  })

  it('allows resulting health of exactly 1.20', async () => {
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position(),
      deps({ quoteDraw: async () => ({ resultingHealthFactor: 1.2 }) }),
    )
    expect(plan.refusal).toBeNull()
  })

  it('refuses a draw above market liquidity before quoting', async () => {
    const d = deps()
    const plan = await planSettlement({ reference: 'BLK-1', legs }, position({ marketLiquidityUsdc: '5' }), d)
    expect(plan.refusal).toBe('LIQUIDITY')
    expect(d.quoteDraw).not.toHaveBeenCalled()
  })

  it('reports the cirBTC the draw will post, from the quote', async () => {
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position(),
      deps({ quoteDraw: async () => ({ resultingHealthFactor: 1.31, collateralCirBtc: '0.00000049' }) }),
    )
    expect(plan.refusal).toBeNull()
    expect(plan.collateralToPostCirBtc).toBe('0.00000049')
  })

  it('refuses when the wallet cannot cover the collateral the draw needs', async () => {
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position({ walletCirBtc: '0.00000010' }),
      deps({ quoteDraw: async () => ({ resultingHealthFactor: 1.31, collateralCirBtc: '0.00000049' }) }),
    )
    expect(plan.refusal).toBe('NO_COLLATERAL')
    expect(plan.collateralToPostCirBtc).toBe('0.00000049')
  })

  it('refuses a draw with no collateral', async () => {
    const plan = await planSettlement(
      { reference: 'BLK-1', legs },
      position({ hasCollateral: false, loanId: null }),
      deps(),
    )
    expect(plan.refusal).toBe('NO_COLLATERAL')
  })

  it.each([
    ['bad address', [{ to: '0x123', amountUsdc: '1' }], 'BLK-1'],
    ['zero amount', [{ to: A, amountUsdc: '0' }], 'BLK-1'],
    ['non numeric amount', [{ to: A, amountUsdc: 'abc' }], 'BLK-1'],
    ['no recipients', [], 'BLK-1'],
    ['empty reference', [{ to: A, amountUsdc: '1' }], '  '],
  ])('flags INVALID for %s', async (_n, l, reference) => {
    const plan = await planSettlement({ reference, legs: l }, position(), deps())
    expect(plan.refusal).toBe('INVALID')
  })

  it('merges duplicate recipients and checksums addresses', async () => {
    const plan = await planSettlement(
      {
        reference: 'BLK-1',
        legs: [
          { to: A, amountUsdc: '1' },
          { to: A.toUpperCase().replace('0X', '0x'), amountUsdc: '2.5' },
        ],
      },
      position({ walletUsdc: '10' }),
      deps(),
    )
    expect(plan.legs).toHaveLength(1)
    expect(plan.legs[0].amountUsdc).toBe('3.5')
    expect(plan.mergedDuplicates).toBe(true)
  })
})
