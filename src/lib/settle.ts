import {
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { multicall3FromAbi } from './abis'
import { ADDRESSES, USDC_DECIMALS } from './chain'
import { buildPayoutCalls, memoIdOf, type PayoutLeg } from './memo'

export const MIN_HEALTH = 1.2
export const SLIPPAGE_BPS = 50

export type Refusal =
  | 'HEALTH'
  | 'LIQUIDITY'
  | 'NO_COLLATERAL'
  | 'INVALID'
  | 'DUPLICATE_REF'

export type LegInput = { to: string; amountUsdc: string }

export type SettlementPlan = {
  reference: string
  legs: { to: Address; amountUsdc: string }[]
  mergedDuplicates: boolean
  totalUsdc: string
  drawUsdc: string
  resultingHealth: number | null
  refusal: Refusal | null
  detail: string | null
  duplicateTx: Hash | null
  idempotencyKey: string
}

export type SettlePosition = {
  wallet: Address
  loanId: string | null
  hasCollateral: boolean
  walletUsdc: string
  marketLiquidityUsdc: string
}

export type PlanDeps = {
  quoteDraw: (a: {
    wallet: Address
    loanId: string | null
    drawUsdc: string
  }) => Promise<{ resultingHealthFactor: number | null }>
  findReference: (reference: string, wallet: Address) => Promise<Hash | null>
  newKey: () => string
}

export class SettleRefusal extends Error {
  constructor(
    readonly refusal: Refusal,
    message: string,
  ) {
    super(message)
    this.name = 'SettleRefusal'
  }
}

const usdc = (v: bigint) => formatUnits(v, USDC_DECIMALS)

function parseLegs(inputs: LegInput[]) {
  const merged = new Map<Address, bigint>()
  let mergedDuplicates = false
  for (const [i, leg] of inputs.entries()) {
    if (!isAddress(leg.to, { strict: false })) {
      throw new SettleRefusal('INVALID', `Recipient ${i + 1} is not a valid address.`)
    }
    let amount: bigint
    try {
      amount = parseUnits(leg.amountUsdc.trim(), USDC_DECIMALS)
    } catch {
      throw new SettleRefusal('INVALID', `Amount for recipient ${i + 1} is not a number.`)
    }
    if (amount <= 0n) {
      throw new SettleRefusal('INVALID', `Amount for recipient ${i + 1} must be above zero.`)
    }
    const to = getAddress(leg.to.toLowerCase())
    if (merged.has(to)) mergedDuplicates = true
    merged.set(to, (merged.get(to) ?? 0n) + amount)
  }
  return {
    legs: [...merged.entries()].map(([to, amount]) => ({ to, amount })),
    mergedDuplicates,
  }
}

export async function planSettlement(
  input: { reference: string; legs: LegInput[] },
  position: SettlePosition,
  deps: PlanDeps,
): Promise<SettlementPlan> {
  const reference = input.reference.trim()
  const base: SettlementPlan = {
    reference,
    legs: [],
    mergedDuplicates: false,
    totalUsdc: '0',
    drawUsdc: '0',
    resultingHealth: null,
    refusal: null,
    detail: null,
    duplicateTx: null,
    idempotencyKey: deps.newKey(),
  }
  const refuse = (refusal: Refusal, detail: string, extra: Partial<SettlementPlan> = {}) => ({
    ...base,
    ...extra,
    refusal,
    detail,
  })

  let parsed: ReturnType<typeof parseLegs>
  try {
    if (!reference) throw new SettleRefusal('INVALID', 'Reference is required.')
    if (input.legs.length === 0) throw new SettleRefusal('INVALID', 'Add at least one recipient.')
    parsed = parseLegs(input.legs)
  } catch (e) {
    if (e instanceof SettleRefusal) return refuse(e.refusal, e.message)
    throw e
  }

  const total = parsed.legs.reduce((s, l) => s + l.amount, 0n)
  const wallet = parseUnits(position.walletUsdc, USDC_DECIMALS)
  const draw = total > wallet ? total - wallet : 0n
  const filled = {
    legs: parsed.legs.map((l) => ({ to: l.to, amountUsdc: usdc(l.amount) })),
    mergedDuplicates: parsed.mergedDuplicates,
    totalUsdc: usdc(total),
    drawUsdc: usdc(draw),
  }

  const dup = await deps.findReference(reference, position.wallet)
  if (dup) {
    return refuse('DUPLICATE_REF', `Reference already used in tx ${dup}.`, {
      ...filled,
      duplicateTx: dup,
    })
  }

  if (draw === 0n) return { ...base, ...filled }

  if (!position.hasCollateral) {
    return refuse('NO_COLLATERAL', 'Post cirBTC before drawing.', filled)
  }
  const liquidity = parseUnits(position.marketLiquidityUsdc, USDC_DECIMALS)
  if (draw > liquidity) {
    return refuse(
      'LIQUIDITY',
      `The market has ${usdc(liquidity)} USDC available. Reduce the amount.`,
      filled,
    )
  }
  const quote = await deps.quoteDraw({
    wallet: position.wallet,
    loanId: position.loanId,
    drawUsdc: usdc(draw),
  })
  const hf = quote.resultingHealthFactor
  if (hf !== null && hf < MIN_HEALTH) {
    return refuse(
      'HEALTH',
      `This draw takes health to ${hf.toFixed(2)}. Reduce the amount or post more cirBTC.`,
      { ...filled, resultingHealth: hf },
    )
  }
  return { ...base, ...filled, resultingHealth: hf }
}

export type DrawDeps = {
  quoteDraw: PlanDeps['quoteDraw']
  getLiquidityUsdc: () => Promise<string>
  borrow: (a: {
    loanId: string | null
    drawUsdc: string
    idempotencyKey: string
  }) => Promise<{ txHash: string; loanId: string }>
}

const inflight = new Map<string, Promise<{ txHash: string; loanId: string }>>()

/** Re-quotes right before signing. A repeated call for one plan joins the first. */
export function executeDraw(
  plan: SettlementPlan,
  position: Pick<SettlePosition, 'wallet' | 'loanId'>,
  deps: DrawDeps,
) {
  if (plan.refusal) {
    throw new SettleRefusal(plan.refusal, plan.detail ?? 'Plan was refused.')
  }
  const existing = inflight.get(plan.idempotencyKey)
  if (existing) return existing

  const run = (async () => {
    const draw = parseUnits(plan.drawUsdc, USDC_DECIMALS)
    const liquidity = parseUnits(await deps.getLiquidityUsdc(), USDC_DECIMALS)
    if (draw > liquidity) {
      throw new SettleRefusal('LIQUIDITY', `The market now has ${usdc(liquidity)} USDC available.`)
    }
    const quote = await deps.quoteDraw({
      wallet: position.wallet,
      loanId: position.loanId,
      drawUsdc: plan.drawUsdc,
    })
    const hf = quote.resultingHealthFactor
    if (hf !== null && hf < MIN_HEALTH) {
      throw new SettleRefusal('HEALTH', `Health moved to ${hf.toFixed(2)} before signing.`)
    }
    return deps.borrow({
      loanId: position.loanId,
      drawUsdc: plan.drawUsdc,
      idempotencyKey: plan.idempotencyKey,
    })
  })()

  inflight.set(plan.idempotencyKey, run)
  run.catch(() => inflight.delete(plan.idempotencyKey))
  return run
}

export async function executePayouts(args: {
  plan: SettlementPlan
  walletClient: WalletClient
  publicClient: PublicClient
}): Promise<Hash> {
  const { plan, walletClient, publicClient } = args
  if (plan.refusal) {
    throw new SettleRefusal(plan.refusal, plan.detail ?? 'Plan was refused.')
  }
  const account = walletClient.account
  if (!account) throw new SettleRefusal('INVALID', 'No account connected.')

  const legs: PayoutLeg[] = plan.legs.map((l) => ({
    to: l.to,
    amount: parseUnits(l.amountUsdc, USDC_DECIMALS),
  }))
  const calls = buildPayoutCalls(legs, plan.reference)

  const { request } = await publicClient.simulateContract({
    account,
    address: ADDRESSES.multicall3From,
    abi: multicall3FromAbi,
    functionName: 'aggregate3',
    args: [calls],
  })
  const hash = await walletClient.writeContract(request)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`Payout transaction ${hash} reverted.`)
  }
  return hash
}

export { memoIdOf }
