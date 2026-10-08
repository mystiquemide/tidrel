import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readHistory: vi.fn(),
  getBlockNumber: vi.fn(),
  // A snapshot made for some other desk is ignored, so the plain read path is what runs.
  snapshot: { desk: '0x0', fromBlock: '0', checkpointBlock: '0', settlements: [] as unknown[] },
}))
vi.mock('../src/lib/history', () => ({ readHistory: mocks.readHistory }))
vi.mock('../src/lib/demoSnapshot.json', () => ({ default: mocks.snapshot }))
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

describe('getDemoCycles with frozen history', () => {
  const frozenRow = { reference: 'OLD-1', state: 'repaid' }

  async function frozen() {
    vi.resetModules()
    const chain = await import('../src/lib/chain')
    Object.assign(mocks.snapshot, {
      desk: chain.DEMO_DESK_ADDRESS,
      fromBlock: chain.DEMO_DESK_FROM_BLOCK.toString(),
      checkpointBlock: '5000',
      settlements: [frozenRow],
    })
    return (await import('../src/lib/landing')).getDemoCycles
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mocks.readHistory.mockReset()
    mocks.getBlockNumber.mockReset().mockResolvedValue(9000n)
  })
  afterEach(() => vi.useRealTimers())

  it('reads only after the checkpoint and puts the frozen cycles first', async () => {
    mocks.readHistory.mockResolvedValue(good(1))
    const get = await frozen()
    const r = await get()
    expect(mocks.readHistory).toHaveBeenCalledWith(expect.anything(), { fromBlock: 5001n, includeMemo: false })
    expect(r).toMatchObject({ ok: true, blockNumber: 9000n })
    expect(r.ok && r.settlements.map((s) => s.reference)).toEqual(['OLD-1', 'R1'])
  })

  it('serves the frozen cycles when the live read is too slow', async () => {
    mocks.readHistory.mockReturnValue(new Promise(() => {}))
    const get = await frozen()
    const p = get()
    await vi.advanceTimersByTimeAsync(30_000)
    const r = await p
    expect(r).toMatchObject({ ok: true, blockNumber: 5000n })
    expect(r.ok && r.settlements.map((s) => s.reference)).toEqual(['OLD-1'])
  })

  it('prefers a newer earlier read over the frozen cycles when a later read fails', async () => {
    mocks.readHistory.mockResolvedValueOnce(good(7))
    const get = await frozen()
    await get()
    vi.setSystemTime(Date.now() + 10 * 60_000)
    mocks.readHistory.mockRejectedValue(new Error('down'))
    const p = get()
    await vi.advanceTimersByTimeAsync(10_000)
    const r = await p
    expect(r.ok && r.settlements.map((s) => s.reference)).toEqual(['OLD-1', 'R7'])
  })
})
