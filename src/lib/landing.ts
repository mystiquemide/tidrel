import { DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from './chain'
import { publicClient } from './client'
import { formatUsdc } from './format'
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

export type ProofFigures = {
  drawn: string
  seconds: string
  interest: string
  legs: string
}

/** The four headline figures of a repaid cycle, formatted exactly. Null if any is not measured yet. */
export function proofFigures(s: Settlement | null): ProofFigures | null {
  if (!s || s.openSeconds === null || s.interestUsdc === null || !s.drawTxHash) return null
  return {
    drawn: formatUsdc(s.drawnUsdc, 2),
    seconds: String(s.openSeconds),
    interest: formatUsdc(s.interestUsdc, 6),
    legs: String(s.legs),
  }
}
