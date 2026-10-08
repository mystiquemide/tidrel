import { describe, expect, it, vi } from 'vitest'
import {
  executeDraw,
  executePayouts,
  planSettlement,
  SettleRefusal,
  type DrawDeps,
  type SettlementPlan,
} from '../src/lib/settle'

const WALLET = '0x2222222222222222222222222222222222222222' as const
const A = '0x1111111111111111111111111111111111111111'

let n = 0
async function plan(): Promise<SettlementPlan> {
  return planSettlement(
    { reference: 'BLK-1', legs: [{ to: A, amountUsdc: '6' }] },
    { wallet: WALLET, loanId: 'loan-1', hasCollateral: true, walletUsdc: '0.4', walletCirBtc: '0.001', marketLiquidityUsdc: '100' },
    {
      quoteDraw: async () => ({ resultingHealthFactor: 1.5 }),
      findReference: async () => null,
      newKey: () => `key-${++n}`,
    },
  )
}

const drawDeps = (over: Partial<DrawDeps> = {}): DrawDeps => ({
  quoteDraw: async () => ({ resultingHealthFactor: 1.5 }),
  getLiquidityUsdc: async () => '100',
  borrow: vi.fn(async () => ({ txHash: '0xdraw', loanId: 'loan-1' })),
  ...over,
})

const pos = { wallet: WALLET, loanId: 'loan-1' }

describe('executeDraw', () => {
  it('sends one borrow when called twice for the same plan', async () => {
    const p = await plan()
    const d = drawDeps()
    const [a, b] = await Promise.all([executeDraw(p, pos, d), executeDraw(p, pos, d)])
    expect(d.borrow).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
    expect(d.borrow).toHaveBeenCalledWith({
      loanId: 'loan-1',
      drawUsdc: '5.65',
      idempotencyKey: p.idempotencyKey,
    })
  })

  it('refuses at sign time when health moved below 1.20', async () => {
    const p = await plan()
    const d = drawDeps({ quoteDraw: async () => ({ resultingHealthFactor: 1.19 }) })
    await expect(executeDraw(p, pos, d)).rejects.toMatchObject({ refusal: 'HEALTH' })
    expect(d.borrow).not.toHaveBeenCalled()
  })

  it('refuses at sign time when liquidity dropped', async () => {
    const p = await plan()
    const d = drawDeps({ getLiquidityUsdc: async () => '1' })
    await expect(executeDraw(p, pos, d)).rejects.toMatchObject({ refusal: 'LIQUIDITY' })
    expect(d.borrow).not.toHaveBeenCalled()
  })

  it('never executes a refused plan', async () => {
    const p = { ...(await plan()), refusal: 'HEALTH' as const, detail: 'no' }
    const d = drawDeps()
    expect(() => executeDraw(p, pos, d)).toThrow(SettleRefusal)
    expect(d.borrow).not.toHaveBeenCalled()
  })

  it('allows a retry after a failed borrow', async () => {
    const p = await plan()
    const borrow = vi
      .fn()
      .mockRejectedValueOnce(new Error('rejected'))
      .mockResolvedValueOnce({ txHash: '0xdraw', loanId: 'loan-1' })
    const d = drawDeps({ borrow })
    await expect(executeDraw(p, pos, d)).rejects.toThrow('rejected')
    await expect(executeDraw(p, pos, d)).resolves.toMatchObject({ txHash: '0xdraw' })
    expect(borrow).toHaveBeenCalledTimes(2)
  })
})

describe('executePayouts', () => {
  const account = { address: WALLET } as never
  const clients = (status: 'success' | 'reverted') => {
    const publicClient = {
      simulateContract: vi.fn(async () => ({ request: { r: 1 } })),
      waitForTransactionReceipt: vi.fn(async () => ({ status })),
    }
    const walletClient = { account, writeContract: vi.fn(async () => '0xpay') }
    return { publicClient, walletClient }
  }

  it('simulates, sends and confirms one batch', async () => {
    const { publicClient, walletClient } = clients('success')
    const hash = await executePayouts({
      plan: await plan(),
      walletClient: walletClient as never,
      publicClient: publicClient as never,
    })
    expect(hash).toBe('0xpay')
    expect(publicClient.simulateContract).toHaveBeenCalledTimes(1)
    expect(walletClient.writeContract).toHaveBeenCalledTimes(1)
  })

  it('throws when the receipt reverted', async () => {
    const { publicClient, walletClient } = clients('reverted')
    await expect(
      executePayouts({
        plan: await plan(),
        walletClient: walletClient as never,
        publicClient: publicClient as never,
      }),
    ).rejects.toThrow('reverted')
  })

  it('does not touch the wallet for a refused plan', async () => {
    const { publicClient, walletClient } = clients('success')
    const p = { ...(await plan()), refusal: 'DUPLICATE_REF' as const, detail: 'dup' }
    await expect(
      executePayouts({ plan: p, walletClient: walletClient as never, publicClient: publicClient as never }),
    ).rejects.toBeInstanceOf(SettleRefusal)
    expect(walletClient.writeContract).not.toHaveBeenCalled()
  })
})
