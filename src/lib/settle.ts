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
import { multicall3FromAbi, settlerAbi } from './abis'
import { ADDRESSES, CIRBTC_DECIMALS, USDC_DECIMALS } from './chain'
import type { PayoutLeg } from './memo'
import { buildSettleCalls, MAX_REFERENCE_BYTES, referenceBytes, referenceToBytes32 } from './settler'

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
  /** cirBTC this draw will pull from the wallet to post, from the Borrow Kit quote. */
  collateralToPostCirBtc: string | null
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
  walletCirBtc: string
  marketLiquidityUsdc: string
}

export type PlanDeps = {
  quoteDraw: (a: {
    wallet: Address
    loanId: string | null
    drawUsdc: string
  }) => Promise<{
    resultingHealthFactor: number | null
    collateralCirBtc?: string | null
  }>
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
      throw new SettleRefusal('INVALID', `Counterparty ${i + 1}: that is not an Arc address. It starts with 0x and has 40 more characters.`)
    }
    let amount: bigint
    try {
      amount = parseUnits(leg.amountUsdc.trim(), USDC_DECIMALS)
    } catch {
      throw new SettleRefusal('INVALID', `Counterparty ${i + 1}: enter the amount in USDC as a number.`)
    }
    if (amount <= 0n) {
      throw new SettleRefusal('INVALID', `Counterparty ${i + 1}: enter an amount above zero.`)
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
    collateralToPostCirBtc: null,
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
    if (!reference) throw new SettleRefusal('INVALID', 'Add a trade reference, so this payout can be matched to its trade.')
    if (referenceBytes(reference) > MAX_REFERENCE_BYTES) {
      throw new SettleRefusal('INVALID', `Shorten the reference to ${MAX_REFERENCE_BYTES} characters or fewer.`)
    }
    if (input.legs.length === 0) throw new SettleRefusal('INVALID', 'Add at least one counterparty to pay.')
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
    return refuse('DUPLICATE_REF', 'This wallet already settled a trade with this reference. Use a new reference for this trade.', {
      ...filled,
      duplicateTx: dup,
    })
  }

  if (draw === 0n) return { ...base, ...filled }

  if (!position.hasCollateral) {
    return refuse('NO_COLLATERAL', 'This wallet has no cirBTC to borrow against. Add cirBTC, then try again.', filled)
  }
  const liquidity = parseUnits(position.marketLiquidityUsdc, USDC_DECIMALS)
  if (draw > liquidity) {
    return refuse(
      'LIQUIDITY',
      `The market can lend ${usdc(liquidity)} USDC right now. Lower the total, or pay more from your wallet.`,
      filled,
    )
  }
  const quote = await deps.quoteDraw({
    wallet: position.wallet,
    loanId: position.loanId,
    drawUsdc: usdc(draw),
  })
  const hf = quote.resultingHealthFactor
  const toPost = quote.collateralCirBtc ?? null
  if (hf !== null && hf < MIN_HEALTH) {
    return refuse(
      'HEALTH',
      `This draw would take loan health to ${hf.toFixed(2)}, below the ${MIN_HEALTH.toFixed(2)} floor. Lower the amount or add more cirBTC.`,
      { ...filled, resultingHealth: hf, collateralToPostCirBtc: toPost },
    )
  }
  if (toPost && parseUnits(toPost, CIRBTC_DECIMALS) > parseUnits(position.walletCirBtc, CIRBTC_DECIMALS)) {
    return refuse(
      'NO_COLLATERAL',
      `This draw needs ${toPost} cirBTC as collateral, and the wallet holds ${position.walletCirBtc}. Add cirBTC or lower the amount.`,
      { ...filled, resultingHealth: hf, collateralToPostCirBtc: toPost },
    )
  }
  return { ...base, ...filled, resultingHealth: hf, collateralToPostCirBtc: toPost }
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
    throw new SettleRefusal(plan.refusal, plan.detail ?? 'Tidrel could not plan this settlement. Try again in a moment.')
  }
  const existing = inflight.get(plan.idempotencyKey)
  if (existing) return existing

  const run = (async () => {
    const draw = parseUnits(plan.drawUsdc, USDC_DECIMALS)
    const liquidity = parseUnits(await deps.getLiquidityUsdc(), USDC_DECIMALS)
    if (draw > liquidity) {
      throw new SettleRefusal('LIQUIDITY', `The market's available USDC fell to ${usdc(liquidity)} before you signed. Nothing was sent. Lower the total and try again.`)
    }
    const quote = await deps.quoteDraw({
      wallet: position.wallet,
      loanId: position.loanId,
      drawUsdc: plan.drawUsdc,
    })
    const hf = quote.resultingHealthFactor
    if (hf !== null && hf < MIN_HEALTH) {
      throw new SettleRefusal('HEALTH', `Loan health would fall to ${hf.toFixed(2)}, below the ${MIN_HEALTH.toFixed(2)} floor, after the market moved. Nothing was sent. Lower the amount or add collateral.`)
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
    throw new SettleRefusal(plan.refusal, plan.detail ?? 'Tidrel could not plan this settlement. Try again in a moment.')
  }
  const account = walletClient.account
  if (!account) throw new SettleRefusal('INVALID', 'Your wallet disconnected. Reconnect it and try again.')

  const legs: PayoutLeg[] = plan.legs.map((l) => ({
    to: l.to,
    amount: parseUnits(l.amountUsdc, USDC_DECIMALS),
  }))
  const calls = buildSettleCalls(legs, plan.reference)

  let request
  try {
    ;({ request } = await publicClient.simulateContract({
      account,
      address: ADDRESSES.multicall3From,
      abi: multicall3FromAbi,
      functionName: 'aggregate3',
      args: [calls],
    }))
  } catch (e) {
    // Another tab or device may have used this reference since the plan was made.
    if (await referenceTaken(publicClient, account.address, plan.reference)) {
      throw new SettleRefusal('DUPLICATE_REF', 'This wallet already settled a trade with this reference. Use a new reference for this trade.')
    }
    throw e
  }
  const hash = await walletClient.writeContract(request)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`Payout transaction ${hash} reverted.`)
  }
  return hash
}

async function referenceTaken(publicClient: PublicClient, payer: Address, reference: string) {
  try {
    return await publicClient.readContract({
      address: ADDRESSES.settler,
      abi: settlerAbi,
      functionName: 'settled',
      args: [payer, referenceToBytes32(reference)],
    })
  } catch {
    return false
  }
}
