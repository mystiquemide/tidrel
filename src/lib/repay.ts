import { formatUnits, parseUnits, type Address } from 'viem'
import { USDC_DECIMALS } from './chain'
import { BORROW_CHAIN, getKit } from './kit'
import { readPosition, type Position } from './position'

export type RepayRefusal =
  | 'NO_LOAN'
  | 'NOTHING_TO_REPAY'
  | 'NO_USDC'
  | 'INVALID'

export type RepayPlan = {
  loanId: string | null
  repayUsdc: string
  debtUsdc: string
  /** True when this repay covers the whole debt read at plan time. */
  fullRepay: boolean
  resultingHealth: number | null
  refusal: RepayRefusal | null
  detail: string | null
  idempotencyKey: string
}

export type RepayDeps = {
  quoteRepay: (a: {
    loanId: string
    repayUsdc: string
  }) => Promise<{ repayUsdc: string; resultingHealthFactor: number | null }>
  newKey: () => string
}

export type ExecuteRepayDeps = {
  repay: (a: {
    loanId: string
    repayUsdc: string
    idempotencyKey: string
  }) => Promise<{ txHash: string; amountRepaidUsdc: string | null }>
  readDebtUsdc: () => Promise<string>
}

export type RepayOutcome = {
  txHash: string
  amountRepaidUsdc: string | null
  remainingDebtUsdc: string
  /** A sliver of debt is left that a repay cannot clear. */
  dust: boolean
}

/** Debt at or below this after a repay counts as dust (0.00001 USDC). */
export const DUST_UNITS = 10n

export class RepayRefusalError extends Error {
  constructor(
    readonly refusal: RepayRefusal,
    message: string,
  ) {
    super(message)
    this.name = 'RepayRefusalError'
  }
}

const usdc = (v: bigint) => formatUnits(v, USDC_DECIMALS)

/**
 * Default repay is min(wallet USDC, debt). An explicit amount is capped at both,
 * since Borrow Kit rejects a repay above the debt. Collateral stays posted.
 */
export async function planRepay(
  position: Pick<Position, 'loanId' | 'debtUsdc' | 'walletUsdc'>,
  input: { amountUsdc?: string },
  deps: RepayDeps,
): Promise<RepayPlan> {
  const base: RepayPlan = {
    loanId: position.loanId,
    repayUsdc: '0',
    debtUsdc: position.debtUsdc,
    fullRepay: false,
    resultingHealth: null,
    refusal: null,
    detail: null,
    idempotencyKey: deps.newKey(),
  }
  const refuse = (refusal: RepayRefusal, detail: string): RepayPlan => ({
    ...base,
    refusal,
    detail,
  })

  if (!position.loanId) return refuse('NO_LOAN', 'No loan is open for this wallet.')
  const debt = parseUnits(position.debtUsdc, USDC_DECIMALS)
  if (debt === 0n) return refuse('NOTHING_TO_REPAY', 'There is no debt to repay.')
  const wallet = parseUnits(position.walletUsdc, USDC_DECIMALS)
  if (wallet === 0n) return refuse('NO_USDC', 'This wallet holds no USDC to repay with.')

  let want = debt < wallet ? debt : wallet
  if (input.amountUsdc !== undefined) {
    let typed: bigint
    try {
      typed = parseUnits(input.amountUsdc.trim(), USDC_DECIMALS)
    } catch {
      return refuse('INVALID', 'Repay amount is not a number.')
    }
    if (typed <= 0n) return refuse('INVALID', 'Repay amount must be above zero.')
    want = typed < want ? typed : want
  }

  const quote = await deps.quoteRepay({ loanId: position.loanId, repayUsdc: usdc(want) })
  let amount = parseUnits(quote.repayUsdc, USDC_DECIMALS)
  if (amount > debt) amount = debt
  if (amount > wallet) amount = wallet

  return {
    ...base,
    repayUsdc: usdc(amount),
    fullRepay: amount === debt,
    resultingHealth: quote.resultingHealthFactor,
  }
}

const inflight = new Map<string, Promise<RepayOutcome>>()

/** One repay per plan. A repeated call for the same plan joins the first. */
export function executeRepay(plan: RepayPlan, deps: ExecuteRepayDeps) {
  if (plan.refusal || !plan.loanId) {
    throw new RepayRefusalError(plan.refusal ?? 'NO_LOAN', plan.detail ?? 'Plan was refused.')
  }
  const existing = inflight.get(plan.idempotencyKey)
  if (existing) return existing

  const loanId = plan.loanId
  const run = (async (): Promise<RepayOutcome> => {
    const sent = await deps.repay({
      loanId,
      repayUsdc: plan.repayUsdc,
      idempotencyKey: plan.idempotencyKey,
    })
    const remaining = parseUnits(await deps.readDebtUsdc(), USDC_DECIMALS)
    return {
      txHash: sent.txHash,
      amountRepaidUsdc: sent.amountRepaidUsdc,
      remainingDebtUsdc: usdc(remaining),
      dust: remaining > 0n && remaining <= DUST_UNITS,
    }
  })()

  inflight.set(plan.idempotencyKey, run)
  run.catch(() => inflight.delete(plan.idempotencyKey))
  return run
}

type Adapter = Parameters<ReturnType<typeof getKit>['borrow']['repay']>[0]['from']['adapter']

export const quoteRepay: RepayDeps['quoteRepay'] = async ({ loanId, repayUsdc }) => {
  const q = await getKit().borrow.getRepayQuote({
    loanId,
    chain: BORROW_CHAIN,
    repayAmount: repayUsdc,
  })
  return { repayUsdc: q.repayAmount.amount, resultingHealthFactor: q.resultingHealthFactor }
}

export function kitRepayDeps(adapter: Adapter, wallet: Address): ExecuteRepayDeps {
  return {
    repay: async ({ loanId, repayUsdc, idempotencyKey }) => {
      const result = await getKit().borrow.repay({
        from: { adapter, chain: BORROW_CHAIN, address: wallet },
        loanId,
        repayAmount: repayUsdc,
        idempotencyKey,
      })
      if (result.status === 'submitted') {
        throw new Error('Repay was submitted but is not confirmed yet.')
      }
      return {
        txHash: result.txHash,
        amountRepaidUsdc:
          result.status === 'confirmed' ? result.amountRepaid.amount : null,
      }
    },
    readDebtUsdc: async () => (await readPosition(wallet)).debtUsdc,
  }
}
