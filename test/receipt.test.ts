import { describe, expect, it } from 'vitest'
import { TransactionReceiptNotFoundError, encodeAbiParameters, encodeEventTopics, padHex, stringToHex, type Address, type Log } from 'viem'
import { settlerAbi } from '../src/lib/abis'
import { ADDRESSES } from '../src/lib/chain'
import { decodePayout, lookupReceipt } from '../src/lib/receipt'

const payer = '0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04' as Address
const a = '0x1111111111111111111111111111111111111111' as Address
const b = '0x2222222222222222222222222222222222222222' as Address
const ref = padHex(stringToHex('BLK-0420'), { dir: 'right', size: 32 })

const log = (address: Address, eventName: 'Settled' | 'Leg', args: object, data: `0x${string}`): Log =>
  ({
    address,
    topics: encodeEventTopics({ abi: settlerAbi, eventName, args } as never),
    data,
  }) as unknown as Log

const settled = log(
  ADDRESSES.settler,
  'Settled',
  { payer, ref },
  encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [3_500_000n, 2n]),
)
const leg = (to: Address, amount: bigint) =>
  log(ADDRESSES.settler, 'Leg', { payer, ref, to }, encodeAbiParameters([{ type: 'uint256' }], [amount]))

describe('decodePayout', () => {
  it('reads the payer, reference, total and each leg', () => {
    const out = decodePayout([leg(a, 1_000_000n), leg(b, 2_500_000n), settled])
    expect(out).toEqual({
      payer,
      reference: 'BLK-0420',
      totalUsdc: '3.5',
      legs: [
        { to: a, amountUsdc: '1' },
        { to: b, amountUsdc: '2.5' },
      ],
    })
  })

  it('ignores events from other contracts', () => {
    const other = { ...settled, address: a } as Log
    expect(decodePayout([other])).toBeNull()
  })

  it('returns null when the transaction holds no payout', () => {
    expect(decodePayout([])).toBeNull()
  })
})

describe('lookupReceipt', () => {
  const hash = ('0x' + 'ab'.repeat(32)) as `0x${string}`
  const missing = () => Promise.reject(new TransactionReceiptNotFoundError({ hash }))
  const down = () => Promise.reject(new Error('429 rate limited'))
  const has = (n: number) => () => Promise.resolve({ blockNumber: BigInt(n) } as never)
  const src = (get: () => Promise<never>) => ({ getTransactionReceipt: get, getBlock: () => Promise.resolve({} as never) })

  it('keeps going past a node that answers null and past one that is down', async () => {
    const r = await lookupReceipt(hash, [src(down), src(missing), src(has(7))])
    expect(r).toMatchObject({ found: true })
    expect(r.found && r.receipt.blockNumber).toBe(7n)
  })

  it('reports the transaction absent only when every node answers with nothing', async () => {
    expect(await lookupReceipt(hash, [src(missing), src(missing)])).toEqual({ found: false, failed: false })
  })

  it('reports a chain problem, not a missing receipt, when a node failed and none had it', async () => {
    expect(await lookupReceipt(hash, [src(down), src(missing)])).toEqual({ found: false, failed: true })
  })
})

describe('frozen demo receipts', () => {
  it('opens every demo payout from the snapshot without any RPC call', async () => {
    const { vi } = await import('vitest')
    const snapshot = (await import('../src/lib/demoSnapshot.json')).default as {
      settlements: { txHash: string | null; reference: string | null }[]
      receipts: Record<string, { payout: { reference: string; legs: unknown[] } }>
    }
    const { getReceipt } = await import('../src/lib/receipt')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const paid = snapshot.settlements.filter((s) => s.txHash)
    expect(paid.length).toBeGreaterThan(0)
    for (const s of paid) {
      const r = await getReceipt(s.txHash!)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.payout.reference).toBe(snapshot.receipts[s.txHash!.toLowerCase()].payout.reference)
        expect(r.payout.legs.length).toBeGreaterThan(0)
        expect(r.cycle?.txHash).toBe(s.txHash)
      }
    }
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
