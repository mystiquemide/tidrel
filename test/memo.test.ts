import { decodeFunctionData, keccak256, toHex } from 'viem'
import { describe, expect, it } from 'vitest'
import { erc20Abi, memoAbi } from '../src/lib/abis'
import { ADDRESSES } from '../src/lib/chain'
import {
  buildPayoutCalls,
  decodeMemoData,
  encodeMemoData,
  encodePayoutCall,
  memoIdOf,
} from '../src/lib/memo'

const TO = '0x1111111111111111111111111111111111111111' as const

describe('memo encoding', () => {
  it('derives memoId as keccak256 of the reference', () => {
    expect(memoIdOf('BLK-0413')).toBe(keccak256(toHex('BLK-0413')))
  })

  it('round trips memoData', () => {
    const data = encodeMemoData('BLK-0413', 2, 3)
    expect(decodeMemoData(data)).toEqual({
      reference: 'BLK-0413',
      legIndex: 2,
      legCount: 3,
    })
  })

  it('wraps a USDC transfer in a Memo call', () => {
    const call = encodePayoutCall({ to: TO, amount: 4_000_000n }, 'BLK-0413', 0, 2)
    const outer = decodeFunctionData({ abi: memoAbi, data: call })
    expect(outer.functionName).toBe('memo')
    const [target, data, memoId, memoData] = outer.args as [string, `0x${string}`, string, `0x${string}`]
    expect(target).toBe(ADDRESSES.usdc)
    expect(memoId).toBe(memoIdOf('BLK-0413'))
    expect(decodeMemoData(memoData)).toEqual({
      reference: 'BLK-0413',
      legIndex: 0,
      legCount: 2,
    })
    const inner = decodeFunctionData({ abi: erc20Abi, data })
    expect(inner.functionName).toBe('transfer')
    expect(inner.args).toEqual([TO, 4_000_000n])
  })

  it('builds one non-failing Memo subcall per leg', () => {
    const calls = buildPayoutCalls(
      [
        { to: TO, amount: 1n },
        { to: TO, amount: 2n },
      ],
      'REF',
    )
    expect(calls).toHaveLength(2)
    for (const c of calls) {
      expect(c.target).toBe(ADDRESSES.memo)
      expect(c.allowFailure).toBe(false)
    }
  })
})
