import { describe, expect, it } from 'vitest'
import snapshot from '../src/lib/demoSnapshot.json'
import { DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from '../src/lib/chain'

describe('demo history snapshot', () => {
  it('was made for the configured demo desk and start block', () => {
    expect(snapshot.desk.toLowerCase()).toBe(DEMO_DESK_ADDRESS.toLowerCase())
    expect(BigInt(snapshot.fromBlock)).toBe(DEMO_DESK_FROM_BLOCK)
    expect(BigInt(snapshot.checkpointBlock)).toBeGreaterThan(DEMO_DESK_FROM_BLOCK)
  })

  it('holds only cycles that already closed, so no cycle straddles the checkpoint', () => {
    expect(snapshot.settlements.length).toBeGreaterThan(0)
    for (const s of snapshot.settlements) expect(['repaid', 'self-funded']).toContain(s.state)
  })
})
