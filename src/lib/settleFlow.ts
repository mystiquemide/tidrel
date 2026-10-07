import { SettleRefusal, type SettlementPlan } from './settle'

export type Step = 'checking' | 'drawing' | 'paying'

export type Outcome =
  | { kind: 'settled'; drawTx: string | null; payoutTx: string }
  | { kind: 'drawn-not-settled'; drawTx: string; error: string }
  | { kind: 'failed'; error: string }

const USER_REJECTED = 4001

/** Plain-language text for whatever went wrong. A wallet rejection means nothing was sent. */
export function describeError(e: unknown): string {
  if (e instanceof SettleRefusal) return e.message
  const code = typeof e === 'object' && e !== null && 'code' in e ? Number((e as { code: unknown }).code) : undefined
  const msg = e instanceof Error ? e.message : ''
  if (code === USER_REJECTED || /user (rejected|denied)|rejected the request/i.test(msg)) {
    return 'You cancelled in your wallet. Nothing was sent.'
  }
  // Messages Tidrel writes itself are already plain language and say what to do.
  if (e instanceof Error && TIDREL_MESSAGE.test(msg)) return msg
  if (/insufficient funds|exceeds balance/i.test(msg)) {
    return 'The wallet does not have enough to cover this and its network fee. Add funds and try again.'
  }
  if (/timeout|timed out|network|fetch failed|failed to fetch/i.test(msg)) {
    return 'Arc mainnet did not respond in time. Check your wallet activity, then try again.'
  }
  // Anything else stays out of the interface: raw node errors are not readable and can
  // leak internals. The full error goes to the console for whoever is debugging.
  console.error('Tidrel: transaction failed', e)
  return 'The transaction did not go through. Check your wallet, then try again.'
}

/** Errors Tidrel throws itself start with one of these, so they are shown as written. */
const TIDREL_MESSAGE = /^(Your |The |This |There |Loan |Counterparty |Add |Enter |Shorten |Only )/

/**
 * Runs one settlement: check the reference, draw if the wallet is short, then pay
 * every counterparty. If the payout fails after a draw, the outcome says so and the
 * caller can retry the payout alone with `skipDraw`.
 */
export async function runSettlement(args: {
  plan: SettlementPlan
  skipDraw?: { drawTx: string }
  checkReference: () => Promise<void>
  draw: () => Promise<{ txHash: string }>
  payout: () => Promise<string>
  onStep: (s: Step) => void
}): Promise<Outcome> {
  const { plan, onStep } = args
  let drawTx: string | null = args.skipDraw?.drawTx ?? null
  try {
    if (!args.skipDraw) {
      onStep('checking')
      await args.checkReference()
      if (Number(plan.drawUsdc) > 0) {
        onStep('drawing')
        drawTx = (await args.draw()).txHash
      }
    }
  } catch (e) {
    return { kind: 'failed', error: describeError(e) }
  }

  try {
    onStep('paying')
    return { kind: 'settled', drawTx, payoutTx: await args.payout() }
  } catch (e) {
    return drawTx
      ? { kind: 'drawn-not-settled', drawTx, error: describeError(e) }
      : { kind: 'failed', error: describeError(e) }
  }
}
