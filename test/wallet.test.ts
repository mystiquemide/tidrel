import { describe, expect, it, vi } from 'vitest'
import { checkWallet } from '../src/lib/wallet'

const address = '0x1111111111111111111111111111111111111111' as const
const client = (code: `0x${string}` | undefined) => ({
  getCode: vi.fn(async () => code),
})

describe('checkWallet', () => {
  it('accepts an EOA (no code) on Arc', async () => {
    expect(await checkWallet({ address, chainId: 5042, publicClient: client(undefined) })).toEqual({ ok: true })
    expect(await checkWallet({ address, chainId: 5042, publicClient: client('0x') })).toEqual({ ok: true })
  })

  it('refuses an address with deployed code as a smart account', async () => {
    expect(await checkWallet({ address, chainId: 5042, publicClient: client('0x6080') })).toEqual({
      ok: false,
      reason: 'SMART_ACCOUNT',
    })
  })

  it('flags the wrong chain without hitting the RPC', async () => {
    const c = client(undefined)
    expect(await checkWallet({ address, chainId: 1, publicClient: c })).toEqual({
      ok: false,
      reason: 'WRONG_CHAIN',
      chainId: 1,
    })
    expect(c.getCode).not.toHaveBeenCalled()
  })
})
