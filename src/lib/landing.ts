import { DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from './chain'
import { publicClient } from './client'
import { readHistory, type Settlement } from './history'

export type DemoCycles =
  | { ok: true; settlements: Settlement[]; blockNumber: bigint }
  | { ok: false }

/**
 * Settlement history of the demo desk, read from its first block so the proof never
 * ages out. A failed read is reported as such, never as an empty history.
 */
export async function getDemoCycles(): Promise<DemoCycles> {
  try {
    const [history, blockNumber] = await Promise.all([
      readHistory(DEMO_DESK_ADDRESS, { fromBlock: DEMO_DESK_FROM_BLOCK }),
      publicClient.getBlockNumber(),
    ])
    return { ok: true, settlements: history.settlements, blockNumber }
  } catch {
    return { ok: false }
  }
}

/** The newest repaid settlement that closed on its own draw, else the newest repaid one. */
export function headlineCycle(settlements: Settlement[]): Settlement | null {
  const repaid = settlements.filter(
    (s) => s.state === 'repaid' && s.txHash && s.drawTxHash && s.repayTxHash,
  )
  const clean = repaid.filter((s) => !s.sharedCycle)
  const pool = clean.length ? clean : repaid
  return pool.length ? pool[pool.length - 1] : null
}
