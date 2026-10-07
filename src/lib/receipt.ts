import { cache } from 'react'
import { formatUnits, getAddress, isHash, parseEventLogs, type Address, type Hash, type Log } from 'viem'
import { erc20Abi, memoAbi, settlerAbi } from './abis'
import { ADDRESSES, USDC_DECIMALS } from './chain'
import { publicClient } from './client'
import { isDemoDesk } from './deskAddress'
import { readHistory, type Settlement } from './history'
import { getDemoCycles } from './landing'
import { decodeMemoData } from './memo'
import { bytes32ToReference } from './settler'

export type ReceiptLeg = { to: Address; amountUsdc: string }

export type DecodedPayout = {
  payer: Address
  reference: string
  totalUsdc: string
  legs: ReceiptLeg[]
}

/** Reads the Settled and Leg events a TidrelSettler call emitted. Null when the transaction holds no payout. */
export function decodePayout(logs: readonly Log[]): DecodedPayout | null {
  const mine = logs.filter((l) => l.address.toLowerCase() === ADDRESSES.settler.toLowerCase())
  const parsed = parseEventLogs({ abi: settlerAbi, logs: mine as Log[] })
  const settled = parsed.find((e) => e.eventName === 'Settled')
  if (!settled || settled.eventName !== 'Settled') return null
  const legs: ReceiptLeg[] = parsed.flatMap((e) =>
    e.eventName === 'Leg' ? [{ to: e.args.to, amountUsdc: formatUnits(e.args.amount, USDC_DECIMALS) }] : [],
  )
  return {
    payer: settled.args.payer,
    reference: bytes32ToReference(settled.args.ref),
    totalUsdc: formatUnits(settled.args.total, USDC_DECIMALS),
    legs,
  }
}

/**
 * The first mainnet run paid through the Memo contract, before TidrelSettler existed.
 * Each USDC transfer from the sender carries the trade reference in a Memo event.
 */
export function decodeMemoPayout(logs: readonly Log[], sender: Address): DecodedPayout | null {
  const memos = parseEventLogs({
    abi: memoAbi,
    eventName: 'Memo',
    logs: logs.filter((l) => l.address.toLowerCase() === ADDRESSES.memo.toLowerCase()) as Log[],
  })
  if (memos.length === 0) return null
  let reference: string
  try {
    reference = decodeMemoData(memos[0].args.memo).reference
  } catch {
    return null
  }
  const transfers = parseEventLogs({
    abi: erc20Abi,
    eventName: 'Transfer',
    logs: logs.filter((l) => l.address.toLowerCase() === ADDRESSES.usdc.toLowerCase()) as Log[],
  }).filter((t) => t.args.from.toLowerCase() === sender.toLowerCase())
  if (transfers.length === 0) return null
  const total = transfers.reduce((s, t) => s + t.args.value, 0n)
  return {
    payer: getAddress(sender),
    reference,
    totalUsdc: formatUnits(total, USDC_DECIMALS),
    legs: transfers.map((t) => ({ to: t.args.to, amountUsdc: formatUnits(t.args.value, USDC_DECIMALS) })),
  }
}

export type Receipt =
  | {
      ok: true
      txHash: Hash
      blockNumber: bigint
      timestamp: number
      payout: DecodedPayout
      /** The draw and repay around this payout. Null when the history could not be matched. */
      cycle: Settlement | null
    }
  | { ok: false; reason: 'invalid' | 'not-found' | 'not-a-payout' | 'chain' }

export const getReceipt = cache(async (raw: string): Promise<Receipt> => {
  if (!isHash(raw)) return { ok: false, reason: 'invalid' }
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: raw }).catch(() => null)
    if (!receipt) return { ok: false, reason: 'not-found' }
    const payout =
      receipt.status === 'success'
        ? (decodePayout(receipt.logs) ?? decodeMemoPayout(receipt.logs, receipt.from))
        : null
    if (!payout) return { ok: false, reason: 'not-a-payout' }
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })
    // The demo desk's cycles are already read and kept for the home and proof pages.
    const cycle = isDemoDesk(payout.payer)
      ? await getDemoCycles()
          .then((d) => (d.ok ? (d.settlements.find((s) => s.txHash === raw) ?? null) : null))
          .catch(() => null)
      : await readHistory(payout.payer, {
          includeMemo: false,
          fromBlock: receipt.blockNumber > 20000n ? receipt.blockNumber - 20000n : 0n,
        })
          .then((h) => h.settlements.find((s) => s.txHash === raw) ?? null)
          .catch(() => null)
    return {
      ok: true,
      txHash: raw,
      blockNumber: receipt.blockNumber,
      timestamp: Number(block.timestamp),
      payout,
      cycle,
    }
  } catch {
    return { ok: false, reason: 'chain' }
  }
})
