import { describe, expect, it, vi } from 'vitest'
import { ARC_ADD_CHAIN_PARAMS, ARC_CHAIN_ID_HEX, switchToArc } from '../src/lib/connect'

const rpcError = (code: number) => Object.assign(new Error(`rpc ${code}`), { code })

describe('switchToArc', () => {
  it('uses the chain id for Arc mainnet', () => {
    expect(ARC_CHAIN_ID_HEX).toBe('0x13b2')
    expect(ARC_ADD_CHAIN_PARAMS.nativeCurrency).toEqual({ name: 'USDC', symbol: 'USDC', decimals: 18 })
  })

  it('only switches when the wallet already knows Arc', async () => {
    const request = vi.fn(async () => null)
    await switchToArc({ request } as never)
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x13b2' }],
    })
  })

  it('adds Arc when the wallet does not recognize the chain', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(rpcError(4902))
      .mockResolvedValueOnce(null)
    await switchToArc({ request } as never)
    expect(request).toHaveBeenLastCalledWith({
      method: 'wallet_addEthereumChain',
      params: [ARC_ADD_CHAIN_PARAMS],
    })
  })

  it('rethrows a user rejection without adding the chain', async () => {
    const request = vi.fn().mockRejectedValue(rpcError(4001))
    await expect(switchToArc({ request } as never)).rejects.toMatchObject({ code: 4001 })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('rethrows other errors without adding the chain', async () => {
    const request = vi.fn().mockRejectedValue(rpcError(-32603))
    await expect(switchToArc({ request } as never)).rejects.toMatchObject({ code: -32603 })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
