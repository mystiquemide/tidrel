import type { Address } from 'viem'
import { CIRBTC_USDC_MARKET_ID } from './chain'
import { BORROW_CHAIN, getKit } from './kit'
import { SLIPPAGE_BPS, type DrawDeps, type PlanDeps } from './settle'

type Adapter = Parameters<ReturnType<typeof getKit>['borrow']['borrow']>[0]['from']['adapter']

/** Borrow Kit quote for a draw: opens a loan when none exists, else borrows more. */
export const quoteDraw: PlanDeps['quoteDraw'] = async ({ wallet, loanId, drawUsdc }) => {
  const kit = getKit()
  const quote = loanId
    ? await kit.borrow.getBorrowQuote({
        loanId,
        borrowAmount: drawUsdc,
        slippageBps: SLIPPAGE_BPS,
      })
    : await kit.borrow.getBorrowQuote({
        walletAddress: wallet,
        chain: BORROW_CHAIN,
        marketId: CIRBTC_USDC_MARKET_ID,
        borrowAmount: drawUsdc,
        slippageBps: SLIPPAGE_BPS,
      })
  return { resultingHealthFactor: quote.resultingHealthFactor }
}

export async function marketLiquidityUsdc(): Promise<string> {
  const market = await getKit().borrow.getMarket({
    chain: BORROW_CHAIN,
    marketId: CIRBTC_USDC_MARKET_ID,
  })
  return market.liquidity?.amount ?? '0'
}

export function kitDrawDeps(adapter: Adapter, wallet: Address): DrawDeps {
  return {
    quoteDraw,
    getLiquidityUsdc: marketLiquidityUsdc,
    borrow: async ({ loanId, drawUsdc, idempotencyKey }) => {
      const from = { adapter, chain: BORROW_CHAIN, address: wallet }
      const result = loanId
        ? await getKit().borrow.borrow({
            from,
            loanId,
            borrowAmount: drawUsdc,
            slippageBps: SLIPPAGE_BPS,
            idempotencyKey,
          })
        : await getKit().borrow.borrow({
            from,
            marketId: CIRBTC_USDC_MARKET_ID,
            borrowAmount: drawUsdc,
            slippageBps: SLIPPAGE_BPS,
            idempotencyKey,
          })
      if (result.status === 'submitted') {
        throw new Error('Borrow was submitted but is not confirmed yet.')
      }
      return { txHash: result.txHash, loanId: result.loanId }
    },
  }
}
