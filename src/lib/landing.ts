import { cache } from 'react'
import { DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from './chain'
import { publicClient } from './client'
import { formatUsdc } from './format'
import { readHistory, type Settlement } from './history'

export type DemoCycles =
  | { ok: true; settlements: Settlement[]; blockNumber: bigint }
  | { ok: false }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Good = Extract<DemoCycles, { ok: true }>

// The last successful read, kept in memory for this server instance. Cycles that
// already happened never change, so serving it after a failed read is still true.
let lastGood: { at: number; value: Good } | null = null
const FRESH_MS = 120_000

async function readCycles(): Promise<Good> {
  const [history, blockNumber] = await Promise.all([
    readHistory(DEMO_DESK_ADDRESS, { fromBlock: DEMO_DESK_FROM_BLOCK }),
    publicClient.getBlockNumber(),
  ])
  return { ok: true, settlements: history.settlements, blockNumber }
}

/**
 * Settlement history of the demo desk, read from its first block so the proof never
 * ages out. React cache lets every component in one render share a single read, a
 * recent read is reused across pages, a failed read is retried, and if every attempt
 * fails the last good read is served. Only with no good read at all is it reported
 * as failed, and never as an empty history.
 */
export const getDemoCycles = cache(async (): Promise<DemoCycles> => {
  if (lastGood && Date.now() - lastGood.at < FRESH_MS) return lastGood.value
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const value = await readCycles()
      lastGood = { at: Date.now(), value }
      return value
    } catch {
      if (attempt < 2) await sleep(1000 * (attempt + 1))
    }
  }
  return lastGood?.value ?? { ok: false }
})

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
