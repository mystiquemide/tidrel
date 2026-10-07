import { formatUnits, parseUnits, type Address, type PublicClient, type WalletClient } from 'viem'
import { erc20AllowanceAbi, erc20ApproveAbi, morphoCollateralAbi } from './abis'
import { ADDRESSES, CIRBTC_DECIMALS, CIRBTC_USDC_MARKET_ID, USDC_DECIMALS } from './chain'
import { BORROW_CHAIN, getKit } from './kit'
import type { Position } from './position'
import { MIN_HEALTH } from './settle'

export type CollateralMode = 'add' | 'withdraw'

export type CollateralRefusal =
  | 'NO_LOAN'
  | 'INVALID'
  | 'NO_CIRBTC'
  | 'EXCEEDS_POSTED'
  | 'NO_USDC'
  | 'HEALTH'

export type CollateralQuote = {
  resultingHealthFactor: number | null
  liquidationPriceUsd: string | null
  /** USDC the withdrawal may pull to keep the loan healthy. Zero when nothing is owed. */
  bundledRepaymentUsdc: string
}

/** "kit" goes through Circle's Borrow service while a loan is open. "direct" calls Morpho Blue when none is. */
export type CollateralRoute = 'kit' | 'direct'

export type CollateralPlan = {
  mode: CollateralMode
  route: CollateralRoute
  loanId: string | null
  amountCirBtc: string
  resultingHealth: number | null
  liquidationPriceUsd: string | null
  bundledRepaymentUsdc: string
  refusal: CollateralRefusal | null
  detail: string | null
  idempotencyKey: string
}

export type CollateralDeps = {
  quote: (a: { mode: CollateralMode; loanId: string; amountCirBtc: string }) => Promise<CollateralQuote>
  newKey: () => string
}

export type ExecuteCollateralDeps = {
  run: (a: {
    mode: CollateralMode
    route: CollateralRoute
    loanId: string | null
    amountCirBtc: string
    idempotencyKey: string
  }) => Promise<{ txHash: string }>
}

export class CollateralRefusalError extends Error {
  constructor(
    readonly refusal: CollateralRefusal,
    message: string,
  ) {
    super(message)
    this.name = 'CollateralRefusalError'
  }
}

const cir = (v: bigint) => formatUnits(v, CIRBTC_DECIMALS)

function parseAmount(text: string): bigint | null {
  const t = text.trim()
  if (!/^\d*\.?\d+$/.test(t) && !/^\d+\.?$/.test(t)) return null
  const frac = t.split('.')[1] ?? ''
  if (frac.length > CIRBTC_DECIMALS) return null
  try {
    const v = parseUnits(t.endsWith('.') ? t.slice(0, -1) : t, CIRBTC_DECIMALS)
    return v > 0n ? v : null
  } catch {
    return null
  }
}

/**
 * Adding collateral raises health and cannot lower it. A withdrawal can, so it is
 * refused when it would take health under the same floor a draw uses, or when the
 * USDC it may need to repay is not in the wallet.
 */
export async function planCollateral(
  position: Pick<Position, 'loanId' | 'collateralCirBtc' | 'walletCirBtc' | 'walletUsdc' | 'debtUsdc'>,
  input: { mode: CollateralMode; amount: string },
  deps: CollateralDeps,
): Promise<CollateralPlan> {
  const base: CollateralPlan = {
    mode: input.mode,
    route: position.loanId ? 'kit' : 'direct',
    loanId: position.loanId,
    amountCirBtc: '0',
    resultingHealth: null,
    liquidationPriceUsd: null,
    bundledRepaymentUsdc: '0',
    refusal: null,
    detail: null,
    idempotencyKey: deps.newKey(),
  }
  const refuse = (refusal: CollateralRefusal, detail: string, extra: Partial<CollateralPlan> = {}) => ({
    ...base,
    ...extra,
    refusal,
    detail,
  })

  // Debt with no loan means Circle's service has not caught up. Moving collateral then would be a guess.
  if (!position.loanId && parseUnits(position.debtUsdc, USDC_DECIMALS) > 0n) {
    return refuse('NO_LOAN', "Circle's Borrow service has not caught up with your loan yet. Try again in a moment.")
  }
  const amount = parseAmount(input.amount)
  if (amount === null) {
    return refuse('INVALID', `Enter an amount above zero with up to ${CIRBTC_DECIMALS} decimals.`)
  }
  if (input.mode === 'add' && amount > parseUnits(position.walletCirBtc, CIRBTC_DECIMALS)) {
    return refuse('NO_CIRBTC', `This wallet holds ${position.walletCirBtc} cirBTC. Enter that much or less.`, {
      amountCirBtc: cir(amount),
    })
  }
  if (input.mode === 'withdraw' && amount > parseUnits(position.collateralCirBtc, CIRBTC_DECIMALS)) {
    return refuse('EXCEEDS_POSTED', `Only ${position.collateralCirBtc} cirBTC is posted. Enter that much or less.`, {
      amountCirBtc: cir(amount),
    })
  }

  // With no open loan nothing is owed, so there is no health to price. Morpho itself enforces the rest.
  if (!position.loanId) return { ...base, amountCirBtc: cir(amount) }

  const q = await deps.quote({ mode: input.mode, loanId: position.loanId, amountCirBtc: cir(amount) })
  const filled: Partial<CollateralPlan> = {
    amountCirBtc: cir(amount),
    resultingHealth: q.resultingHealthFactor,
    liquidationPriceUsd: q.liquidationPriceUsd,
    bundledRepaymentUsdc: q.bundledRepaymentUsdc,
  }
  if (input.mode === 'withdraw') {
    if (parseUnits(q.bundledRepaymentUsdc, USDC_DECIMALS) > parseUnits(position.walletUsdc, USDC_DECIMALS)) {
      return refuse(
        'NO_USDC',
        `This withdrawal may need to repay up to ${q.bundledRepaymentUsdc} USDC, and the wallet holds ${position.walletUsdc}. Add USDC or withdraw less.`,
        filled,
      )
    }
    if (q.resultingHealthFactor !== null && q.resultingHealthFactor < MIN_HEALTH) {
      return refuse(
        'HEALTH',
        `This would take loan health to ${q.resultingHealthFactor.toFixed(2)}, below the ${MIN_HEALTH.toFixed(2)} floor. Withdraw less, or repay first.`,
        filled,
      )
    }
  }
  return { ...base, ...filled }
}

const inflight = new Map<string, Promise<{ txHash: string }>>()

/** One collateral move per plan. A repeated call for the same plan joins the first. */
export function executeCollateral(plan: CollateralPlan, deps: ExecuteCollateralDeps) {
  if (plan.refusal) {
    throw new CollateralRefusalError(plan.refusal, plan.detail ?? 'Tidrel could not plan this change. Try again in a moment.')
  }
  const existing = inflight.get(plan.idempotencyKey)
  if (existing) return existing
  const run = deps.run({
    mode: plan.mode,
    route: plan.route,
    loanId: plan.loanId,
    amountCirBtc: plan.amountCirBtc,
    idempotencyKey: plan.idempotencyKey,
  })
  inflight.set(plan.idempotencyKey, run)
  run.catch(() => inflight.delete(plan.idempotencyKey))
  return run
}

export const quoteCollateral: CollateralDeps['quote'] = async ({ mode, loanId, amountCirBtc }) => {
  const kit = getKit().borrow
  if (mode === 'add') {
    const q = await kit.getAddCollateralQuote({
      loanId,
      chain: BORROW_CHAIN,
      collateralAmount: amountCirBtc,
    })
    return {
      resultingHealthFactor: q.resultingHealthFactor,
      liquidationPriceUsd: q.liquidationPrice?.amount ?? null,
      bundledRepaymentUsdc: '0',
    }
  }
  const q = await kit.getWithdrawCollateralRepayIfNeededQuote({
    loanId,
    chain: BORROW_CHAIN,
    collateralAmount: amountCirBtc,
  })
  return {
    resultingHealthFactor: q.resultingHealthFactor,
    liquidationPriceUsd: q.liquidationPrice?.amount ?? null,
    bundledRepaymentUsdc: q.bundledRepayment.amount,
  }
}

type Adapter = Parameters<ReturnType<typeof getKit>['borrow']['addCollateral']>[0]['from']['adapter']

export function kitCollateralDeps(adapter: Adapter, wallet: Address): ExecuteCollateralDeps {
  return {
    run: async ({ mode, loanId, amountCirBtc, idempotencyKey }) => {
      if (!loanId) throw new Error('There is no open loan to move collateral on. Refresh the desk and try again.')
      const from = { adapter, chain: BORROW_CHAIN, address: wallet }
      const result =
        mode === 'add'
          ? await getKit().borrow.addCollateral({ from, loanId, collateralAmount: amountCirBtc, idempotencyKey })
          : await getKit().borrow.withdrawCollateralRepayIfNeeded({
              from,
              loanId,
              collateralAmount: amountCirBtc,
              idempotencyKey,
            })
      if (result.status === 'submitted') {
        throw new Error('Your transaction was sent but has not confirmed yet. Check your wallet activity before trying again.')
      }
      return { txHash: result.txHash }
    },
  }
}

/**
 * Moves cirBTC straight against the Morpho Blue market, for a wallet with no open loan.
 * Adding approves what is missing, then supplies. Withdrawing needs no debt, so nothing
 * can be left under-collateralised. Both are simulated before the wallet is asked.
 */
export function directCollateralDeps(args: {
  walletClient: WalletClient
  publicClient: PublicClient
}): ExecuteCollateralDeps {
  const { walletClient, publicClient } = args
  return {
    run: async ({ mode, amountCirBtc }) => {
      const account = walletClient.account
      if (!account) throw new Error('Your wallet disconnected. Reconnect it and try again.')
      const assets = parseUnits(amountCirBtc, CIRBTC_DECIMALS)
      const [loanToken, collateralToken, oracle, irm, lltv] = await publicClient.readContract({
        address: ADDRESSES.morpho,
        abi: morphoCollateralAbi,
        functionName: 'idToMarketParams',
        args: [CIRBTC_USDC_MARKET_ID],
      })
      const marketParams = { loanToken, collateralToken, oracle, irm, lltv }

      if (mode === 'add') {
        const allowance = await publicClient.readContract({
          address: ADDRESSES.cirBtc,
          abi: erc20AllowanceAbi,
          functionName: 'allowance',
          args: [account.address, ADDRESSES.morpho],
        })
        if (allowance < assets) {
          const approve = await walletClient.writeContract({
            account,
            chain: walletClient.chain,
            address: ADDRESSES.cirBtc,
            abi: erc20ApproveAbi,
            functionName: 'approve',
            args: [ADDRESSES.morpho, assets],
          })
          const r = await publicClient.waitForTransactionReceipt({ hash: approve })
          if (r.status !== 'success') throw new Error('The cirBTC approval did not go through. Nothing moved. Try again.')
        }
        const { request } = await publicClient.simulateContract({
          account,
          address: ADDRESSES.morpho,
          abi: morphoCollateralAbi,
          functionName: 'supplyCollateral',
          args: [marketParams, assets, account.address, '0x'],
        })
        const hash = await walletClient.writeContract(request)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('The transaction did not go through. Nothing moved. Try again.')
        return { txHash: hash }
      }

      const { request } = await publicClient.simulateContract({
        account,
        address: ADDRESSES.morpho,
        abi: morphoCollateralAbi,
        functionName: 'withdrawCollateral',
        args: [marketParams, assets, account.address, account.address],
      })
      const hash = await walletClient.writeContract(request)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('The transaction did not go through. Nothing moved. Try again.')
      return { txHash: hash }
    },
  }
}
