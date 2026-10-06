import { formatUnits, parseUnits, type Address } from 'viem'
import { erc20Abi } from './abis'
import {
  ADDRESSES,
  CIRBTC_DECIMALS,
  CIRBTC_USDC_MARKET_ID,
  USDC_DECIMALS,
} from './chain'
import { BORROW_CHAIN, getKit, publicClient } from './kit'
import { MIN_HEALTH } from './settle'

export type Band = 'SAFE' | 'WARN' | 'URGENT' | 'IMMINENT' | 'LIQUIDATABLE'

export type Position = {
  wallet: Address
  loanId: string | null
  dataStatus: 'READY' | 'PENDING' | null
  collateralCirBtc: string
  debtUsdc: string
  accruedInterestUsdc: string
  healthFactor: number | null
  band: Band | null
  liquidationPriceUsd: string | null
  borrowApy: number
  lineUsdc: string
  walletUsdc: string
  walletCirBtc: string
  marketLiquidityUsdc: string
  blockNumber: bigint
  refreshedAt: number
}

export type RawLoan = {
  loanId: string
  dataStatus: 'READY' | 'PENDING'
  collateral: { amount: string } | null
  borrowed: { amount: string } | null
  principalBorrowed?: { amount: string } | null
  accruedInterest: { amount: string } | null
  healthFactor: number | null
  healthFactorBand: Band | null
  liquidationPrice: { amount: string } | null
}

const SCALE = 1_000_000n

/**
 * Right after a borrow the service can report accruedInterest equal to the whole
 * debt while dataStatus already says READY. Borrowed minus principal is exact
 * and does not depend on that field, so prefer it.
 */
export function interestOf(loan: RawLoan | null): string {
  if (!loan) return '0'
  if (loan.borrowed && loan.principalBorrowed) {
    const owed = parseUnits(loan.borrowed.amount, USDC_DECIMALS)
    const principal = parseUnits(loan.principalBorrowed.amount, USDC_DECIMALS)
    return formatUnits(owed > principal ? owed - principal : 0n, USDC_DECIMALS)
  }
  return loan.accruedInterest?.amount ?? '0'
}
const hfUnits = (hf: number) => BigInt(Math.round(hf * Number(SCALE)))

/**
 * Borrow Kit sizes getMaxBorrow at its own health factor (about 1.236).
 * Health is inversely proportional to debt, so debt at the guard is
 * max * h / MIN_HEALTH. The line is that minus current debt, never negative.
 */
export function lineAtGuard(args: {
  maxBorrowUsdc: string
  maxBorrowHealth: number | null
  debtUsdc: string
}): string {
  if (!args.maxBorrowHealth || args.maxBorrowHealth <= 0) return '0'
  const max = parseUnits(args.maxBorrowUsdc, USDC_DECIMALS)
  const debt = parseUnits(args.debtUsdc, USDC_DECIMALS)
  const atGuard = (max * hfUnits(args.maxBorrowHealth)) / hfUnits(MIN_HEALTH)
  return formatUnits(atGuard > debt ? atGuard - debt : 0n, USDC_DECIMALS)
}

export function buildPosition(args: {
  wallet: Address
  loan: RawLoan | null
  maxBorrow: { amount: string; health: number | null } | null
  borrowApy: number
  walletUsdc: bigint
  walletCirBtc: bigint
  marketLiquidityUsdc: string
  blockNumber: bigint
  now?: number
}): Position {
  const { loan } = args
  const debtUsdc = loan?.borrowed?.amount ?? '0'
  const line =
    loan?.collateral && args.maxBorrow
      ? lineAtGuard({
          maxBorrowUsdc: args.maxBorrow.amount,
          maxBorrowHealth: args.maxBorrow.health,
          debtUsdc,
        })
      : '0'
  return {
    wallet: args.wallet,
    loanId: loan?.loanId ?? null,
    dataStatus: loan?.dataStatus ?? null,
    collateralCirBtc: loan?.collateral?.amount ?? '0',
    debtUsdc,
    accruedInterestUsdc: interestOf(loan),
    healthFactor: loan?.healthFactor ?? null,
    band: loan?.healthFactorBand ?? null,
    liquidationPriceUsd: loan?.liquidationPrice?.amount ?? null,
    borrowApy: args.borrowApy,
    lineUsdc: line,
    walletUsdc: formatUnits(args.walletUsdc, USDC_DECIMALS),
    walletCirBtc: formatUnits(args.walletCirBtc, CIRBTC_DECIMALS),
    marketLiquidityUsdc: args.marketLiquidityUsdc,
    blockNumber: args.blockNumber,
    refreshedAt: args.now ?? Date.now(),
  }
}

async function findActiveLoan(wallet: Address): Promise<RawLoan | null> {
  const kit = getKit()
  let pageAfter: string | undefined
  do {
    const page = await kit.borrow.getLoans({
      walletAddress: wallet,
      chain: BORROW_CHAIN,
      pageAfter,
    })
    const hit = page.loans.find(
      (l) =>
        l.status === 'active' &&
        l.marketId.toLowerCase() === CIRBTC_USDC_MARKET_ID.toLowerCase(),
    )
    if (hit) return hit
    pageAfter = page.pagination.pageAfter
  } while (pageAfter)
  return null
}

export async function readPosition(wallet: Address): Promise<Position> {
  const kit = getKit()
  const [loan, market, blockNumber, walletUsdc, walletCirBtc] =
    await Promise.all([
      findActiveLoan(wallet),
      kit.borrow.getMarket({ chain: BORROW_CHAIN, marketId: CIRBTC_USDC_MARKET_ID }),
      publicClient.getBlockNumber(),
      publicClient.readContract({
        address: ADDRESSES.usdc,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet],
      }),
      publicClient.readContract({
        address: ADDRESSES.cirBtc,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [wallet],
      }),
    ])

  const maxBorrow = loan?.collateral
    ? await kit.borrow.getMaxBorrow({
        chain: BORROW_CHAIN,
        marketId: CIRBTC_USDC_MARKET_ID,
        collateralAmount: loan.collateral.amount,
      })
    : null

  return buildPosition({
    wallet,
    loan,
    maxBorrow: maxBorrow
      ? { amount: maxBorrow.maxBorrowAmount.amount, health: maxBorrow.resultingHealthFactor }
      : null,
    borrowApy: market.borrowApy ?? 0,
    walletUsdc,
    walletCirBtc,
    marketLiquidityUsdc: market.liquidity?.amount ?? '0',
    blockNumber,
  })
}
