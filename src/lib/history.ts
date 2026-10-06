import {
  formatUnits,
  getAbiItem,
  keccak256,
  parseEventLogs,
  toHex,
  type Address,
  type Hash,
} from 'viem'
import { erc20Abi, memoAbi, morphoAbi } from './abis'
import { ADDRESSES, CIRBTC_USDC_MARKET_ID, USDC_DECIMALS } from './chain'
import { publicClient } from './kit'
import { decodeMemoData } from './memo'

const memoEvent = getAbiItem({ abi: memoAbi, name: 'Memo' })
const borrowEvent = getAbiItem({ abi: morphoAbi, name: 'Borrow' })
const repayEvent = getAbiItem({ abi: morphoAbi, name: 'Repay' })

/** Arc's RPC rejects eth_getLogs ranges above 5,000 blocks (about 42 minutes). */
export const LOG_PAGE_BLOCKS = 5000n
export const DEFAULT_LOOKBACK_BLOCKS = 100_000n

export type SettlementState =
  | 'open'
  | 'repaid'
  | 'self-funded'
  | 'drawn-not-settled'

export type Settlement = {
  reference: string | null
  txHash: Hash | null
  payoutAt: number | null
  legs: number
  totalUsdc: string
  drawTxHash: Hash | null
  drawnUsdc: string
  repayTxHash: Hash | null
  repaidAt: number | null
  openSeconds: number | null
  interestUsdc: string | null
  /** True when one repay closed several draws and interest was split by draw size. */
  sharedCycle: boolean
  state: SettlementState
}

type Pos = { block: bigint; txIndex: number; logIndex: number }

export type DebtEvent = Pos & {
  kind: 'borrow' | 'repay'
  assets: bigint
  shares: bigint
  txHash: Hash
  timestamp: number
}

export type PayoutEvent = Pos & {
  kind: 'payout'
  reference: string
  legs: number
  totalUsdc: bigint
  txHash: Hash
  timestamp: number
}

export type HistoryEvent = DebtEvent | PayoutEvent

const order = (a: Pos, b: Pos) =>
  a.block !== b.block
    ? a.block < b.block ? -1 : 1
    : a.txIndex - b.txIndex || a.logIndex - b.logIndex

const usdc = (v: bigint) => formatUnits(v, USDC_DECIMALS)

type Row = Settlement & { _drawn: bigint; _drawTs: number | null; _pos: Pos }

function publicRow(row: Row): Settlement {
  const out: Partial<Row> = { ...row }
  delete out._drawn
  delete out._drawTs
  delete out._pos
  return out as Settlement
}

/**
 * Pure matcher. A draw is the Borrow immediately before a payout from the same
 * wallet. A repay that brings borrow shares back to zero closes every draw of
 * that debt cycle. Interest is repaid minus drawn over the cycle.
 */
export function buildSettlements(
  events: HistoryEvent[],
  opts: { startingShares?: bigint } = {},
): { settlements: Settlement[]; truncated: boolean } {
  const sorted = [...events].sort(order)
  const rows: Row[] = []
  let shares = opts.startingShares ?? 0n
  const truncated = shares !== 0n
  let pending: DebtEvent | null = null
  let cycle: Row[] = []
  let cycleDrawn = 0n
  let cycleRepaid = 0n

  const dnsRow = (d: DebtEvent): Row => ({
    reference: null,
    txHash: null,
    payoutAt: null,
    legs: 0,
    totalUsdc: '0',
    drawTxHash: d.txHash,
    drawnUsdc: usdc(d.assets),
    repayTxHash: null,
    repaidAt: null,
    openSeconds: null,
    interestUsdc: null,
    sharedCycle: false,
    state: 'drawn-not-settled',
    _drawn: d.assets,
    _drawTs: d.timestamp,
    _pos: d,
  })

  for (const e of sorted) {
    if (e.kind === 'borrow') {
      if (pending) {
        const r = dnsRow(pending)
        rows.push(r)
        cycle.push(r)
      }
      pending = e
      shares += e.shares
      cycleDrawn += e.assets
    } else if (e.kind === 'payout') {
      const row: Row = {
        reference: e.reference,
        txHash: e.txHash,
        payoutAt: e.timestamp,
        legs: e.legs,
        totalUsdc: usdc(e.totalUsdc),
        drawTxHash: pending?.txHash ?? null,
        drawnUsdc: pending ? usdc(pending.assets) : '0',
        repayTxHash: null,
        repaidAt: null,
        openSeconds: null,
        interestUsdc: null,
        sharedCycle: false,
        state: pending ? 'open' : 'self-funded',
        _drawn: pending?.assets ?? 0n,
        _drawTs: pending?.timestamp ?? null,
        _pos: e,
      }
      rows.push(row)
      if (pending) cycle.push(row)
      pending = null
    } else {
      shares -= e.shares
      cycleRepaid += e.assets
      if (shares <= 0n) {
        if (pending) {
          const r = dnsRow(pending)
          rows.push(r)
          cycle.push(r)
          pending = null
        }
        const interest = cycleRepaid > cycleDrawn ? cycleRepaid - cycleDrawn : 0n
        const shared = cycle.length > 1
        let left = interest
        cycle.forEach((r, i) => {
          const part =
            i === cycle.length - 1
              ? left
              : cycleDrawn > 0n
                ? (interest * r._drawn) / cycleDrawn
                : 0n
          left -= part
          r.state = 'repaid'
          r.repayTxHash = e.txHash
          r.repaidAt = e.timestamp
          r.openSeconds = r._drawTs === null ? null : e.timestamp - r._drawTs
          r.interestUsdc = usdc(part)
          r.sharedCycle = shared
        })
        cycle = []
        cycleDrawn = 0n
        cycleRepaid = 0n
        shares = 0n
      }
    }
  }
  if (pending) rows.push(dnsRow(pending))

  rows.sort((a, b) => order(a._pos, b._pos))
  return {
    settlements: rows.map(publicRow),
    truncated,
  }
}

/** Duplicate-reference check against loaded history. */
export function findReference(
  settlements: Settlement[],
  reference: string,
): Hash | null {
  return settlements.find((s) => s.reference === reference && s.txHash)?.txHash ?? null
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

export async function readHistory(
  wallet: Address,
  opts: { fromBlock?: bigint; lookbackBlocks?: bigint; concurrency?: number } = {},
) {
  const head = await publicClient.getBlockNumber()
  const lookback = opts.lookbackBlocks ?? DEFAULT_LOOKBACK_BLOCKS
  const from = opts.fromBlock ?? (head > lookback ? head - lookback : 0n)

  const pages: { from: bigint; to: bigint }[] = []
  for (let s = from; s <= head; s += LOG_PAGE_BLOCKS) {
    const e = s + LOG_PAGE_BLOCKS - 1n
    pages.push({ from: s, to: e > head ? head : e })
  }

  const perPage = await mapLimit(pages, opts.concurrency ?? 2, async (p) => {
    const range = { fromBlock: p.from, toBlock: p.to }
    const [memos, borrows, repays] = await Promise.all([
      publicClient.getLogs({
        address: ADDRESSES.memo,
        event: memoEvent,
        args: { sender: wallet },
        ...range,
      }),
      publicClient.getLogs({
        address: ADDRESSES.morpho,
        event: borrowEvent,
        args: { id: CIRBTC_USDC_MARKET_ID, onBehalf: wallet },
        ...range,
      }),
      publicClient.getLogs({
        address: ADDRESSES.morpho,
        event: repayEvent,
        args: { id: CIRBTC_USDC_MARKET_ID, onBehalf: wallet },
        ...range,
      }),
    ])
    return { memos, borrows, repays }
  })

  const events: HistoryEvent[] = []
  const pos = (l: {
    blockNumber: bigint
    transactionIndex: number
    logIndex: number
  }): Pos => ({ block: l.blockNumber, txIndex: l.transactionIndex, logIndex: l.logIndex })

  for (const page of perPage) {
    for (const [logs, kind] of [
      [page.borrows, 'borrow'],
      [page.repays, 'repay'],
    ] as const) {
      for (const l of logs) {
        events.push({
          kind,
          ...pos(l),
          assets: l.args.assets!,
          shares: l.args.shares!,
          txHash: l.transactionHash,
          timestamp: Number(l.blockTimestamp),
        })
      }
    }
  }

  const memoByTx = new Map<Hash, (typeof perPage)[number]['memos']>()
  for (const page of perPage) {
    for (const l of page.memos) {
      memoByTx.set(l.transactionHash, [...(memoByTx.get(l.transactionHash) ?? []), l])
    }
  }

  const candidates = [...memoByTx.entries()].flatMap(([tx, logs]) => {
    try {
      const { reference } = decodeMemoData(logs[0].args.memo!)
      const id = keccak256(toHex(reference))
      if (!logs.every((l) => l.args.memoId === id)) return []
      return [{ tx, logs, reference }]
    } catch {
      return [] // a Memo this desk sent that is not a Tidrel payout
    }
  })

  const totals = await mapLimit(candidates, 2, async (c) => {
    const receipt = await publicClient.getTransactionReceipt({ hash: c.tx })
    const transfers = parseEventLogs({
      abi: erc20Abi,
      eventName: 'Transfer',
      logs: receipt.logs.filter(
        (l) => l.address.toLowerCase() === ADDRESSES.usdc.toLowerCase(),
      ),
    }).filter((t) => t.args.from.toLowerCase() === wallet.toLowerCase())
    return receipt.status === 'success'
      ? transfers.reduce((s, t) => s + t.args.value, 0n)
      : null
  })

  candidates.forEach((c, i) => {
    const total = totals[i]
    if (total === null) return
    const first = c.logs[0]
    events.push({
      kind: 'payout',
      ...pos(first),
      reference: c.reference,
      legs: c.logs.length,
      totalUsdc: total,
      txHash: c.tx,
      timestamp: Number(first.blockTimestamp),
    })
  })

  const [, borrowShares] = await publicClient.readContract({
    address: ADDRESSES.morpho,
    abi: morphoAbi,
    functionName: 'position',
    args: [CIRBTC_USDC_MARKET_ID, wallet],
    blockNumber: head,
  })
  const netInWindow = events.reduce(
    (s, e) =>
      e.kind === 'borrow' ? s + e.shares : e.kind === 'repay' ? s - e.shares : s,
    0n,
  )
  const startingShares = borrowShares - netInWindow

  return {
    ...buildSettlements(events, { startingShares }),
    fromBlock: from,
    toBlock: head,
  }
}
