import { describe, expect, it } from 'vitest'
import { checkRpcRequest, isSameSite } from '../src/lib/rpcProxy'

const call = (method: string) => ({ jsonrpc: '2.0', id: 1, method, params: [] })

describe('checkRpcRequest', () => {
  it('allows the reads the adapter and the sheets need', () => {
    for (const m of ['eth_call', 'eth_getCode', 'eth_estimateGas', 'eth_getTransactionReceipt', 'eth_getLogs', 'eth_blockNumber']) {
      expect(checkRpcRequest(call(m))).toEqual({ ok: true, batch: false })
    }
  })
  it('allows a batch of reads', () => {
    expect(checkRpcRequest([call('eth_call'), call('eth_getCode')])).toEqual({ ok: true, batch: true })
  })
  it('never relays a send or an account method', () => {
    for (const m of ['eth_sendRawTransaction', 'eth_sendTransaction', 'eth_sign', 'personal_sign', 'eth_accounts', 'debug_traceTransaction']) {
      expect(checkRpcRequest(call(m)).ok).toBe(false)
    }
  })
  it('refuses a batch that hides one forbidden call among reads', () => {
    expect(checkRpcRequest([call('eth_call'), call('eth_sendRawTransaction')]).ok).toBe(false)
  })
  it('refuses empty, oversized and malformed requests', () => {
    expect(checkRpcRequest([]).ok).toBe(false)
    expect(checkRpcRequest(Array.from({ length: 21 }, () => call('eth_call'))).ok).toBe(false)
    expect(checkRpcRequest({ id: 1 }).ok).toBe(false)
    expect(checkRpcRequest(null).ok).toBe(false)
  })
})

describe('isSameSite', () => {
  it('accepts a request from the site itself', () => {
    expect(isSameSite('https://tidrel.midelabs.xyz', 'tidrel.midelabs.xyz')).toBe(true)
  })
  it('refuses another site, a missing origin and a malformed one', () => {
    expect(isSameSite('https://evil.example', 'tidrel.midelabs.xyz')).toBe(false)
    expect(isSameSite(null, 'tidrel.midelabs.xyz')).toBe(false)
    expect(isSameSite('not a url', 'tidrel.midelabs.xyz')).toBe(false)
  })
})
