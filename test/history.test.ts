import { encodeAbiParameters, encodeEventTopics, keccak256, toHex } from 'viem'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erc20Abi } from '../src/lib/abis'
import { ADDRESSES } from '../src/lib/chain'
import {
  buildSettlements,
  findReference,
  type DebtEvent,
  type PayoutEvent,
} from '../src/lib/history'
import { encodeMemoData } from '../src/lib/memo'
import { referenceToBytes32 } from '../src/lib/settler'

const tx = (n: number) => `0x${n.toString(16).padStart(64, '0')}` as const
let seq = 0
const pos = (block: number) => ({ block: BigInt(block), txIndex: 0, logIndex: seq++ })

const borrow = (block: number, ts: number, assets: bigint, shares = assets * 1000n): DebtEvent => ({
  kind: 'borrow', ...pos(block), assets, shares, txHash: tx(block), timestamp: ts,
})
const repay = (block: number, ts: number, assets: bigint, shares: bigint): DebtEvent => ({
  kind: 'repay', ...pos(block), assets, shares, txHash: tx(block), timestamp: ts,
})
const payout = (block: number, ts: number, reference: string, total: bigint, legs = 3): PayoutEvent => ({
  kind: 'payout', ...pos(block), reference, legs, totalUsdc: total, txHash: tx(block), timestamp: ts,
})

describe('buildSettlements', () => {
  it('marks a payout with no preceding draw as self-funded', () => {
    const { settlements } = buildSettlements([payout(10, 100, 'BLK-1', 6_000_000n)])
    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toMatchObject({
      reference: 'BLK-1', state: 'self-funded', drawnUsdc: '0', totalUsdc: '6', legs: 3,
    })
  })

  it('measures open seconds and exact interest on a repaid settlement', () => {
    const { settlements } = buildSettlements([
      borrow(10, 1000, 1_200_000n),
      payout(11, 1001, 'BLK-1', 1_200_000n),
      repay(12, 1052, 1_200_001n, 1_200_000_000n),
    ])
    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toMatchObject({
      reference: 'BLK-1',
      state: 'repaid',
      drawnUsdc: '1.2',
      openSeconds: 52,
      interestUsdc: '0.000001',
      sharedCycle: false,
      drawTxHash: tx(10),
      repayTxHash: tx(12),
    })
  })

  it('stays open until the repay brings borrow shares to zero', () => {
    const { settlements } = buildSettlements([
      borrow(10, 1000, 1_200_000n),
      payout(11, 1001, 'BLK-1', 1_200_000n),
      repay(12, 1010, 600_000n, 600_000_000n),
    ])
    expect(settlements[0]).toMatchObject({ state: 'open', interestUsdc: null, openSeconds: null })
  })

  it('reports a draw with no payout as drawn-not-settled', () => {
    const { settlements } = buildSettlements([borrow(10, 1000, 1_200_000n)])
    expect(settlements[0]).toMatchObject({
      state: 'drawn-not-settled', reference: null, txHash: null, drawnUsdc: '1.2',
    })
  })

  it('lets a retried payout pick up the stranded draw', () => {
    const { settlements } = buildSettlements([
      borrow(10, 1000, 1_200_000n),
      payout(20, 1100, 'BLK-1', 1_200_000n),
    ])
    expect(settlements).toHaveLength(1)
    expect(settlements[0]).toMatchObject({ state: 'open', drawTxHash: tx(10), reference: 'BLK-1' })
  })

  it('splits interest across draws closed by one repay and flags it', () => {
    const { settlements } = buildSettlements([
      borrow(10, 1000, 1_000_000n),
      payout(11, 1001, 'A', 1_000_000n),
      borrow(12, 1005, 3_000_000n),
      payout(13, 1006, 'B', 3_000_000n),
      repay(14, 1020, 4_000_004n, 4_000_000_000n),
    ])
    expect(settlements.map((s) => s.interestUsdc)).toEqual(['0.000001', '0.000003'])
    expect(settlements.every((s) => s.sharedCycle && s.state === 'repaid')).toBe(true)
    expect(settlements[0].openSeconds).toBe(20)
    expect(settlements[1].openSeconds).toBe(15)
  })

  it('flags truncated history when debt predates the scan window', () => {
    const r = buildSettlements([payout(10, 100, 'BLK-1', 1n)], { startingShares: 5n })
    expect(r.truncated).toBe(true)
    expect(buildSettlements([], { startingShares: 0n }).truncated).toBe(false)
  })

  it('keeps rows in chain order', () => {
    const { settlements } = buildSettlements([
      payout(30, 3000, 'LATE', 1n),
      payout(10, 1000, 'EARLY', 1n),
    ])
    expect(settlements.map((s) => s.reference)).toEqual(['EARLY', 'LATE'])
  })
})

describe('findReference', () => {
  it('returns the earlier payout tx for a used reference', () => {
    const { settlements } = buildSettlements([payout(10, 100, 'BLK-1', 1n)])
    expect(findReference(settlements, 'BLK-1')).toBe(tx(10))
    expect(findReference(settlements, 'BLK-2')).toBeNull()
  })
})

// readHistory against a mocked chain, to prove the sender filter and memo checks.
const WALLET = '0x1111111111111111111111111111111111111111' as const
const OTHER = '0x9999999999999999999999999999999999999999' as const

const memoLog = (sender: string, reference: string, memoId: string, block: number) => ({
  address: ADDRESSES.memo,
  blockNumber: BigInt(block),
  transactionIndex: 0,
  logIndex: 0,
  transactionHash: tx(block),
  blockTimestamp: 5000n,
  args: { sender, memoId, memo: encodeMemoData(reference, 0, 1) },
})

const transferLog = (from: string, value: bigint) => ({
  address: ADDRESSES.usdc,
  data: encodeAbiParameters([{ type: 'uint256' }], [value]),
  topics: encodeEventTopics({
    abi: erc20Abi,
    eventName: 'Transfer',
    args: { from: from as `0x${string}`, to: '0x3333333333333333333333333333333333333333' },
  }),
})

const mocks = vi.hoisted(() => ({ getLogs: vi.fn(), receipt: vi.fn() }))
vi.mock('../src/lib/client', () => ({
  publicClient: {
    getBlockNumber: async () => 100n,
    getLogs: mocks.getLogs,
    getTransactionReceipt: mocks.receipt,
    readContract: async () => [0n, 0n, 0n],
  },
}))

// The history reader asks every RPC for a receipt through this module. Here it answers from the same mock.
vi.mock('../src/lib/rpcReceipt', () => ({
  lookupReceipt: async (hash: string) => {
    try {
      return { found: true as const, receipt: await mocks.receipt({ hash }), source: {} }
    } catch {
      return { found: false as const, failed: true }
    }
  },
}))

describe('readHistory', () => {
  const store = [
    memoLog(WALLET, 'BLK-1', keccak256(toHex('BLK-1')), 50),
    memoLog(OTHER, 'BLK-1', keccak256(toHex('BLK-1')), 60),
    memoLog(WALLET, 'FORGED', keccak256(toHex('SOMETHING-ELSE')), 70),
  ]

  beforeEach(() => {
    mocks.getLogs.mockReset()
    mocks.receipt.mockReset()
    mocks.getLogs.mockImplementation(async (p: { address: string; args: { sender?: string } }) =>
      p.address === ADDRESSES.memo
        ? store.filter((l) => l.args.sender === p.args.sender)
        : [],
    )
    mocks.receipt.mockImplementation(async () => ({
      status: 'success',
      logs: [transferLog(WALLET, 4_000_000n), transferLog(WALLET, 2_000_000n)],
    }))
  })

  it('queries Memo by sender and ignores a foreign sender reusing the reference', async () => {
    const { readHistory } = await import('../src/lib/history')
    const r = await readHistory(WALLET, { fromBlock: 0n })
    expect(mocks.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ args: { sender: WALLET }, address: ADDRESSES.memo }),
    )
    expect(r.settlements.map((s) => s.reference)).toEqual(['BLK-1'])
    expect(r.settlements[0]).toMatchObject({ state: 'self-funded', totalUsdc: '6', legs: 1 })
  })

  it('reads a TidrelSettler settlement from its Settled event', async () => {
    const { readHistory } = await import('../src/lib/history')
    const settled = {
      address: ADDRESSES.settler,
      blockNumber: 80n,
      transactionIndex: 0,
      logIndex: 0,
      transactionHash: tx(80),
      blockTimestamp: 6000n,
      args: { payer: WALLET, ref: referenceToBytes32('BLK-9'), total: 900_000n, legs: 2n },
    }
    mocks.getLogs.mockImplementation(async (p: { address: string }) =>
      p.address === ADDRESSES.settler ? [settled] : [],
    )
    const r = await readHistory(WALLET, { fromBlock: 0n })
    expect(mocks.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ args: { payer: WALLET }, address: ADDRESSES.settler }),
    )
    expect(r.settlements).toHaveLength(1)
    expect(r.settlements[0]).toMatchObject({ reference: 'BLK-9', totalUsdc: '0.9', legs: 2, state: 'self-funded' })
  })

  it('drops a Memo whose memoId does not match its reference', async () => {
    const { readHistory } = await import('../src/lib/history')
    const r = await readHistory(WALLET, { fromBlock: 0n })
    expect(r.settlements.some((s) => s.reference === 'FORGED')).toBe(false)
  })
})
