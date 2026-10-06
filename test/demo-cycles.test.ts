import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ readHistory: vi.fn(), getBlockNumber: vi.fn() }))
vi.mock('../src/lib/history', () => ({ readHistory: mocks.readHistory }))
vi.mock('../src/lib/client', () => ({ publicClient: { getBlockNumber: mocks.getBlockNumber } }))

const good = (n: number) => ({ settlements: [{ reference: `R${n}` }], fromBlock: 0n, toBlock: 1n, truncated: false })

async function fresh() {
  vi.resetModules()
  return (await import('../src/lib/landing')).getDemoCycles
}

describe('getDemoCycles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.readHistory.mockReset()
    mocks.getBlockNumber.mockReset().mockResolvedValue(100n)
  })
  afterEach(() => vi.useRealTimers())

  it('returns the history and the block it was read at', async () => {
    mocks.readHistory.mockResolvedValue(good(1))
    const get = await fresh()
    const r = await get()
    expect(r).toMatchObject({ ok: true, blockNumber: 100n })
    expect(r.ok && r.settlements[0]).toMatchObject({ reference: 'R1' })
  })

  it('retries a failed read and then succeeds', async () => {
    mocks.readHistory.mockRejectedValueOnce(new Error('rate limited')).mockResolvedValue(good(2))
    const get = await fresh()
    const p = get()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await p).toMatchObject({ ok: true })
    expect(mocks.readHistory).toHaveBeenCalledTimes(2)
  })

  it('reuses a recent read instead of hitting the chain again', async () => {
    mocks.readHistory.mockResolvedValue(good(3))
    const get = await fresh()
    await get()
    await get()
    expect(mocks.readHistory).toHaveBeenCalledTimes(1)
  })

  it('serves the last good read when every later attempt fails', async () => {
    mocks.readHistory.mockResolvedValueOnce(good(4))
    const get = await fresh()
    await get()
    vi.setSystemTime(Date.now() + 10 * 60_000)
    mocks.readHistory.mockRejectedValue(new Error('down'))
    const p = get()
    await vi.advanceTimersByTimeAsync(10_000)
    const r = await p
    expect(r.ok && r.settlements[0]).toMatchObject({ reference: 'R4' })
  })

  it('reports failure, not an empty history, when there was never a good read', async () => {
    mocks.readHistory.mockRejectedValue(new Error('down'))
    const get = await fresh()
    const p = get()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await p).toEqual({ ok: false })
    expect(mocks.readHistory).toHaveBeenCalledTimes(3)
  })
})
