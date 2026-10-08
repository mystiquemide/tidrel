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
    return 'You cancelled in your wallet. Nothing was sent. If you try again straight away, Circle may ask you to wait a few minutes first.'
  }
  // Messages Tidrel writes itself are already plain language and say what to do.
  if (e instanceof Error && TIDREL_MESSAGE.test(msg)) return msg
  // Circle's service keeps an earlier attempt to open a loan alive for a while, even one that was
  // cancelled or failed in the wallet, and refuses a second open until it expires.
  if (/BORROW_LOAN_ALREADY_EXISTS|earlier signed request to open this loan/i.test(msg)) {
    const at = /retry after (\d{4}-\d\d-\d\dT[\d:.]+Z)/.exec(msg)?.[1]
    const when = at ? new Date(at) : null
    const time =
      when && !Number.isNaN(when.getTime())
        ? ` Try again after ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
        : ' Try again in a few minutes.'
    return `Circle's Borrow service is still holding your earlier attempt to open this loan. That happens after a cancelled or failed try, and it clears by itself. Nothing was sent.${time}`
  }
  if (/insufficient funds|exceeds balance/i.test(msg)) {
    return 'The wallet does not have enough to cover this and its network fee. Add funds and try again.'
  }
  if (/timeout|timed out|network|fetch failed|failed to fetch/i.test(msg)) {
    return 'Arc mainnet did not respond in time. Check your wallet activity, then try again.'
  }
  // Anything else stays out of the interface: raw node errors are not readable and can
  // leak internals. The full error goes to the console for whoever is debugging.
  console.error('Tidrel: transaction failed', e)
  return `The transaction did not go through. Check your wallet, then try again.${reasonOf(e)}`
}

/** The wallet's or node's own first line, kept short, so a failure can be reported and fixed. */
function reasonOf(e: unknown): string {
  const anyE = e as { shortMessage?: unknown; message?: unknown; code?: unknown } | null
  const raw = typeof anyE?.shortMessage === 'string' ? anyE.shortMessage : typeof anyE?.message === 'string' ? anyE.message : ''
  const line = raw.split('\n')[0].trim().slice(0, 140)
  const code = typeof anyE?.code === 'number' || typeof anyE?.code === 'string' ? ` [${String(anyE.code).slice(0, 20)}]` : ''
  return line ? ` Reason: ${line}${code}` : ''
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
