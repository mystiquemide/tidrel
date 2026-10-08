import { describe, expect, it } from 'vitest'
import { buildPosition, hasCollateral, interestOf, lineAtGuard, type RawLoan } from '../src/lib/position'

const WALLET = '0x2222222222222222222222222222222222222222' as const

const loan: RawLoan = {
  loanId: 'loan-1',
  dataStatus: 'READY',
  collateral: { amount: '0.0000298' },
  borrowed: { amount: '1.2' },
  accruedInterest: { amount: '0.000001' },
  healthFactor: 1.54,
  healthFactorBand: 'SAFE',
  liquidationPrice: { amount: '48000.5' },
}

const base = {
  wallet: WALLET,
  borrowApy: 0.0139,
  walletUsdc: 400_000n,
  walletCirBtc: 2_980n,
  postedCirBtc: 2_980n,
  marketLiquidityUsdc: '40004.957473',
  blockNumber: 123n,
  now: 1,
}

describe('lineAtGuard', () => {
  it('scales the service max to the 1.20 guard', () => {
    // 1.792661 * 1.236088 / 1.2 = 1.846572
    expect(
      lineAtGuard({ maxBorrowUsdc: '1.792661', maxBorrowHealth: 1.236088, debtUsdc: '0' }),
    ).toBe('1.846572')
  })

  it('subtracts current debt', () => {
    expect(
      lineAtGuard({ maxBorrowUsdc: '1.792661', maxBorrowHealth: 1.236088, debtUsdc: '1.2' }),
    ).toBe('0.646572')
  })

  it('never goes negative', () => {
    expect(
      lineAtGuard({ maxBorrowUsdc: '1', maxBorrowHealth: 1.2, debtUsdc: '5' }),
    ).toBe('0')
  })

  it('returns zero when the service gives no health', () => {
    expect(lineAtGuard({ maxBorrowUsdc: '1', maxBorrowHealth: null, debtUsdc: '0' })).toBe('0')
  })
})

describe('buildPosition', () => {
  it('maps a live loan', () => {
    const p = buildPosition({
      ...base,
      loan,
      maxBorrow: { amount: '1.792661', health: 1.236088 },
    })
    expect(p).toMatchObject({
      loanId: 'loan-1',
      collateralCirBtc: '0.0000298',
      debtUsdc: '1.2',
      accruedInterestUsdc: '0.000001',
      healthFactor: 1.54,
      band: 'SAFE',
      liquidationPriceUsd: '48000.5',
      lineUsdc: '0.646572',
      walletUsdc: '0.4',
      walletCirBtc: '0.0000298',
    })
  })

  it('keeps posted collateral and a line after a repay closes the loan', () => {
    // Seen live: after a full repay the service closes the loan, Morpho keeps 1957 units posted.
    const p = buildPosition({
      ...base,
      loan: null,
      postedCirBtc: 1_957n,
      maxBorrow: { amount: '1.2', health: 1.2 },
    })
    expect(p).toMatchObject({
      loanId: null,
      collateralCirBtc: '0.00001957',
      debtUsdc: '0',
      lineUsdc: '1.2',
    })
    expect(hasCollateral(p)).toBe(true)
  })

  it('reports an honest empty position when there is no loan', () => {
    const p = buildPosition({ ...base, loan: null, postedCirBtc: 0n, walletCirBtc: 0n, maxBorrow: null })
    expect(hasCollateral(p)).toBe(false)
    expect(p).toMatchObject({
      loanId: null,
      dataStatus: null,
      collateralCirBtc: '0',
      debtUsdc: '0',
      healthFactor: null,
      band: null,
      lineUsdc: '0',
    })
  })

  it('shows a line for a wallet that holds cirBTC but has not posted any yet', () => {
    const p = buildPosition({
      ...base,
      loan: null,
      postedCirBtc: 0n,
      walletCirBtc: 3_900n,
      maxBorrow: { amount: '2.3', health: 1.236088 },
    })
    expect(p.collateralCirBtc).toBe('0')
    expect(hasCollateral(p)).toBe(true)
    expect(Number(p.lineUsdc)).toBeGreaterThan(2)
  })

  it('keeps the PENDING flag so the UI can say it is updating', () => {
    const p = buildPosition({
      ...base,
      loan: { ...loan, dataStatus: 'PENDING', healthFactor: null, healthFactorBand: null },
      maxBorrow: null,
    })
    expect(p.dataStatus).toBe('PENDING')
    expect(p.healthFactor).toBeNull()
  })
})

describe('interestOf', () => {
  it('uses borrowed minus principal, not the service interest field', () => {
    // Seen live right after a borrow: accruedInterest echoed the whole debt.
    expect(
      interestOf({
        ...loan,
        borrowed: { amount: '1.200001' },
        principalBorrowed: { amount: '1.2' },
        accruedInterest: { amount: '1.200001' },
      }),
    ).toBe('0.000001')
  })

  it('is zero when nothing has accrued', () => {
    expect(
      interestOf({ ...loan, borrowed: { amount: '1.2' }, principalBorrowed: { amount: '1.2' } }),
    ).toBe('0')
  })

  it('falls back to the service field when principal is missing', () => {
    expect(interestOf({ ...loan, principalBorrowed: null })).toBe('0.000001')
    expect(interestOf(null)).toBe('0')
  })
})
