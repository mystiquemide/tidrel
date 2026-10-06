import { describe, expect, it, vi } from 'vitest'
import {
  executeRepay,
  planRepay,
  RepayRefusalError,
  type ExecuteRepayDeps,
  type RepayDeps,
  type RepayPlan,
} from '../src/lib/repay'

let n = 0
const deps = (over: Partial<RepayDeps> = {}): RepayDeps => ({
  quoteRepay: vi.fn(async ({ repayUsdc }) => ({ repayUsdc, resultingHealthFactor: 2.5 })),
  newKey: () => `key-${++n}`,
  ...over,
})

const pos = (over = {}) => ({
  loanId: 'loan-1' as string | null,
  debtUsdc: '1.2',
  walletUsdc: '6',
  ...over,
})

describe('planRepay', () => {
  it('repays min(wallet, debt) and marks a full repay when the wallet covers the debt', async () => {
    const plan = await planRepay(pos(), {}, deps())
    expect(plan.refusal).toBeNull()
    expect(plan.repayUsdc).toBe('1.2')
    expect(plan.fullRepay).toBe(true)
    expect(plan.resultingHealth).toBe(2.5)
  })

  it('repays only what the wallet holds when USDC is short of the debt', async () => {
    const plan = await planRepay(pos({ walletUsdc: '0.5' }), {}, deps())
    expect(plan.repayUsdc).toBe('0.5')
    expect(plan.fullRepay).toBe(false)
  })

  it('caps a typed amount above the debt at the debt', async () => {
    const d = deps()
    const plan = await planRepay(pos(), { amountUsdc: '50' }, d)
    expect(plan.repayUsdc).toBe('1.2')
    expect(plan.fullRepay).toBe(true)
    expect(d.quoteRepay).toHaveBeenCalledWith({ loanId: 'loan-1', repayUsdc: '1.2' })
  })

  it('honors a smaller typed amount as a partial repay', async () => {
    const plan = await planRepay(pos(), { amountUsdc: '0.4' }, deps())
    expect(plan.repayUsdc).toBe('0.4')
    expect(plan.fullRepay).toBe(false)
  })

  it('never exceeds the debt even if the service quotes a higher amount', async () => {
    const plan = await planRepay(
      pos(),
      {},
      deps({ quoteRepay: async () => ({ repayUsdc: '1.200001', resultingHealthFactor: null }) }),
    )
    expect(plan.repayUsdc).toBe('1.2')
    expect(plan.fullRepay).toBe(true)
  })

  it.each([
    ['no loan', pos({ loanId: null }), {}, 'NO_LOAN'],
    ['no debt', pos({ debtUsdc: '0' }), {}, 'NOTHING_TO_REPAY'],
    ['no usdc', pos({ walletUsdc: '0' }), {}, 'NO_USDC'],
    ['bad amount', pos(), { amountUsdc: 'abc' }, 'INVALID'],
    ['zero amount', pos(), { amountUsdc: '0' }, 'INVALID'],
  ])('refuses with %s and never quotes', async (_n, p, input, refusal) => {
    const d = deps()
    const plan = await planRepay(p, input, d)
    expect(plan.refusal).toBe(refusal)
    expect(d.quoteRepay).not.toHaveBeenCalled()
  })
})

describe('executeRepay', () => {
  const plan = async (): Promise<RepayPlan> => planRepay(pos(), {}, deps())
  const run = (over: Partial<ExecuteRepayDeps> = {}): ExecuteRepayDeps => ({
    repay: vi.fn(async () => ({ txHash: '0xrepay', amountRepaidUsdc: '1.2' })),
    readDebtUsdc: async () => '0',
    ...over,
  })

  it('repays once for repeated calls and reports a cleared debt', async () => {
    const p = await plan()
    const d = run()
    const [a, b] = await Promise.all([executeRepay(p, d), executeRepay(p, d)])
    expect(d.repay).toHaveBeenCalledTimes(1)
    expect(d.repay).toHaveBeenCalledWith({
      loanId: 'loan-1',
      repayUsdc: '1.2',
      idempotencyKey: p.idempotencyKey,
    })
    expect(a).toEqual(b)
    expect(a).toMatchObject({ remainingDebtUsdc: '0', dust: false })
  })

  it('flags leftover dust debt after a repay', async () => {
    const out = await executeRepay(await plan(), run({ readDebtUsdc: async () => '0.000002' }))
    expect(out).toMatchObject({ remainingDebtUsdc: '0.000002', dust: true })
  })

  it('does not call a real remaining balance dust', async () => {
    const out = await executeRepay(await plan(), run({ readDebtUsdc: async () => '0.5' }))
    expect(out.dust).toBe(false)
  })

  it('never executes a refused plan', async () => {
    const refused = await planRepay(pos({ loanId: null }), {}, deps())
    const d = run()
    expect(() => executeRepay(refused, d)).toThrow(RepayRefusalError)
    expect(d.repay).not.toHaveBeenCalled()
  })

  it('allows a retry after a failed repay', async () => {
    const p = await plan()
    const repay = vi
      .fn()
      .mockRejectedValueOnce(new Error('rejected'))
      .mockResolvedValueOnce({ txHash: '0xrepay', amountRepaidUsdc: '1.2' })
    const d = run({ repay })
    await expect(executeRepay(p, d)).rejects.toThrow('rejected')
    await expect(executeRepay(p, d)).resolves.toMatchObject({ txHash: '0xrepay' })
    expect(repay).toHaveBeenCalledTimes(2)
  })
})
