import { describe, expect, it, vi } from 'vitest'
import { executeCollateral, planCollateral, type CollateralDeps } from '../src/lib/collateral'

const position = {
  loanId: 'loan-1',
  collateralCirBtc: '0.00002',
  walletCirBtc: '0.00001',
  walletUsdc: '3',
  debtUsdc: '1',
}

const deps = (q: Partial<Awaited<ReturnType<CollateralDeps['quote']>>> = {}): CollateralDeps => ({
  quote: vi.fn(async () => ({
    resultingHealthFactor: 2.4,
    liquidationPriceUsd: '40000',
    bundledRepaymentUsdc: '0',
    ...q,
  })),
  newKey: () => 'k1',
})

describe('planCollateral', () => {
  it('goes straight to Morpho when no loan is open and nothing is owed', async () => {
    const d = deps()
    const p = await planCollateral({ ...position, loanId: null, debtUsdc: '0' }, { mode: 'add', amount: '0.000005' }, d)
    expect(p.refusal).toBeNull()
    expect(p.route).toBe('direct')
    expect(p.resultingHealth).toBeNull()
    expect(d.quote).not.toHaveBeenCalled()
  })

  it('uses the Borrow service when a loan is open', async () => {
    const p = await planCollateral(position, { mode: 'add', amount: '0.000005' }, deps())
    expect(p.route).toBe('kit')
  })

  it('refuses when debt shows but the service has no loan yet', async () => {
    const p = await planCollateral({ ...position, loanId: null }, { mode: 'add', amount: '0.000005' }, deps())
    expect(p.refusal).toBe('NO_LOAN')
  })

  it('still checks balances on the direct route', async () => {
    const none = { ...position, loanId: null, debtUsdc: '0' }
    expect((await planCollateral(none, { mode: 'add', amount: '0.5' }, deps())).refusal).toBe('NO_CIRBTC')
    expect((await planCollateral(none, { mode: 'withdraw', amount: '0.5' }, deps())).refusal).toBe('EXCEEDS_POSTED')
    expect((await planCollateral(none, { mode: 'withdraw', amount: '0.00001' }, deps())).refusal).toBeNull()
  })

  it('refuses amounts that are not numbers, are zero, or carry too many decimals', async () => {
    for (const amount of ['', 'abc', '0', '-1', '0.123456789']) {
      const p = await planCollateral(position, { mode: 'add', amount }, deps())
      expect(p.refusal).toBe('INVALID')
    }
  })

  it('refuses adding more cirBTC than the wallet holds', async () => {
    const p = await planCollateral(position, { mode: 'add', amount: '0.00002' }, deps())
    expect(p.refusal).toBe('NO_CIRBTC')
  })

  it('plans an add and carries the quote', async () => {
    const p = await planCollateral(position, { mode: 'add', amount: '0.000005' }, deps())
    expect(p.refusal).toBeNull()
    expect(p.amountCirBtc).toBe('0.000005')
    expect(p.resultingHealth).toBe(2.4)
    expect(p.liquidationPriceUsd).toBe('40000')
  })

  it('refuses withdrawing more than is posted', async () => {
    const p = await planCollateral(position, { mode: 'withdraw', amount: '0.00003' }, deps())
    expect(p.refusal).toBe('EXCEEDS_POSTED')
  })

  it('refuses a withdrawal that takes health under the floor', async () => {
    const p = await planCollateral(position, { mode: 'withdraw', amount: '0.00001' }, deps({ resultingHealthFactor: 1.05 }))
    expect(p.refusal).toBe('HEALTH')
  })

  it('refuses a withdrawal that may need more USDC than the wallet holds', async () => {
    const p = await planCollateral(position, { mode: 'withdraw', amount: '0.00001' }, deps({ bundledRepaymentUsdc: '9' }))
    expect(p.refusal).toBe('NO_USDC')
  })

  it('allows a withdrawal with no debt', async () => {
    const p = await planCollateral(position, { mode: 'withdraw', amount: '0.00001' }, deps({ resultingHealthFactor: null }))
    expect(p.refusal).toBeNull()
  })
})

describe('executeCollateral', () => {
  it('throws for a refused plan', () => {
    expect(() =>
      executeCollateral(
        {
          mode: 'add',
          route: 'kit',
          loanId: 'x',
          amountCirBtc: '0',
          resultingHealth: null,
          liquidationPriceUsd: null,
          bundledRepaymentUsdc: '0',
          refusal: 'INVALID',
          detail: 'bad',
          idempotencyKey: 'a',
        },
        { run: vi.fn() },
      ),
    ).toThrow('bad')
  })

  it('joins a repeated call for the same plan', async () => {
    const run = vi.fn(async () => ({ txHash: '0xabc' }))
    const plan = await planCollateral(position, { mode: 'add', amount: '0.000005' }, deps())
    const a = executeCollateral(plan, { run })
    const b = executeCollateral(plan, { run })
    expect(await a).toEqual({ txHash: '0xabc' })
    expect(await b).toEqual({ txHash: '0xabc' })
    expect(run).toHaveBeenCalledTimes(1)
  })
})
