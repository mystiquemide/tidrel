import { decodeFunctionData } from 'viem'
import { describe, expect, it, vi } from 'vitest'
import { erc20ApproveAbi, multicall3FromAbi, settlerAbi } from '../src/lib/abis'
import { ADDRESSES } from '../src/lib/chain'
import {
  buildSettleCalls,
  bytes32ToReference,
  MAX_REFERENCE_BYTES,
  referenceToBytes32,
} from '../src/lib/settler'
import { executePayouts, planSettlement, SettleRefusal } from '../src/lib/settle'

const A = '0x1111111111111111111111111111111111111111' as const
const B = '0x2222222222222222222222222222222222222222' as const
const WALLET = '0x3333333333333333333333333333333333333333' as const

describe('reference as bytes32', () => {
  it('round trips a readable reference', () => {
    expect(bytes32ToReference(referenceToBytes32('BLK-0413'))).toBe('BLK-0413')
  })
  it('right pads so the text reads from the first byte', () => {
    expect(referenceToBytes32('A')).toBe(`0x41${'00'.repeat(31)}`)
  })
  it('accepts exactly 31 bytes and rejects 32', () => {
    expect(() => referenceToBytes32('x'.repeat(MAX_REFERENCE_BYTES))).not.toThrow()
    expect(() => referenceToBytes32('x'.repeat(MAX_REFERENCE_BYTES + 1))).toThrow()
  })
  it('counts bytes, not characters', () => {
    expect(() => referenceToBytes32('é'.repeat(16))).toThrow()
  })
})

describe('buildSettleCalls', () => {
  const calls = buildSettleCalls(
    [{ to: A, amount: 500_000n }, { to: B, amount: 400_000n }],
    'BLK-1',
  )

  it('approves the exact total to the settler, then settles', () => {
    expect(calls).toHaveLength(2)
    expect(calls[0].target).toBe(ADDRESSES.usdc)
    const approve = decodeFunctionData({ abi: erc20ApproveAbi, data: calls[0].callData })
    expect(approve.args).toEqual([ADDRESSES.settler, 900_000n])
    expect(calls[1].target).toBe(ADDRESSES.settler)
    const settle = decodeFunctionData({ abi: settlerAbi, data: calls[1].callData })
    expect(settle.args).toEqual([referenceToBytes32('BLK-1'), [A, B], [500_000n, 400_000n]])
  })
  it('never lets a subcall fail silently', () => {
    expect(calls.every((c) => c.allowFailure === false)).toBe(true)
  })
})

describe('planSettlement reference length', () => {
  it('refuses a reference that cannot be stored on-chain', async () => {
    const p = await planSettlement(
      { reference: 'x'.repeat(32), legs: [{ to: A, amountUsdc: '1' }] },
      { wallet: WALLET, loanId: null, hasCollateral: false, walletUsdc: '5', walletCirBtc: '0', marketLiquidityUsdc: '0' },
      { quoteDraw: async () => ({ resultingHealthFactor: null }), findReference: async () => null, newKey: () => 'k' },
    )
    expect(p).toMatchObject({ refusal: 'INVALID' })
  })
})

describe('executePayouts against the contract', () => {
  const plan = async () =>
    planSettlement(
      { reference: 'BLK-1', legs: [{ to: A, amountUsdc: '1' }] },
      { wallet: WALLET, loanId: null, hasCollateral: false, walletUsdc: '5', walletCirBtc: '0', marketLiquidityUsdc: '0' },
      { quoteDraw: async () => ({ resultingHealthFactor: null }), findReference: async () => null, newKey: () => 'k' },
    )
  const walletClient = { account: { address: WALLET }, writeContract: vi.fn() }

  it('simulates the approve plus settle batch through Multicall3From', async () => {
    const simulateContract = vi.fn(async () => ({ request: {} }))
    walletClient.writeContract.mockResolvedValue('0xpay')
    await executePayouts({
      plan: await plan(),
      walletClient: walletClient as never,
      publicClient: { simulateContract, waitForTransactionReceipt: async () => ({ status: 'success' }) } as never,
    })
    const call = simulateContract.mock.calls[0] as unknown as [{ address: string; abi: unknown; args: unknown[][] }]
    expect(call[0].address).toBe(ADDRESSES.multicall3From)
    expect(call[0].abi).toBe(multicall3FromAbi)
    expect(call[0].args[0]).toHaveLength(2)
  })

  it('reports a reference the chain already holds as a duplicate', async () => {
    await expect(
      executePayouts({
        plan: await plan(),
        walletClient: walletClient as never,
        publicClient: {
          simulateContract: async () => { throw new Error('reverted') },
          readContract: async () => true,
        } as never,
      }),
    ).rejects.toMatchObject({ refusal: 'DUPLICATE_REF' } satisfies Partial<SettleRefusal>)
  })

  it('rethrows the original error when the reference is free', async () => {
    await expect(
      executePayouts({
        plan: await plan(),
        walletClient: walletClient as never,
        publicClient: {
          simulateContract: async () => { throw new Error('out of gas') },
          readContract: async () => false,
        } as never,
      }),
    ).rejects.toThrow('out of gas')
  })
})
