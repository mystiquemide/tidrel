import { cache } from 'react'
import { DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from './chain'
import { publicClient } from './client'
import { formatUsdc } from './format'
import { readHistory, type Settlement } from './history'
import snapshot from './demoSnapshot.json'

export type DemoCycles =
  | { ok: true; settlements: Settlement[]; blockNumber: bigint }
  | { ok: false }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Good = Extract<DemoCycles, { ok: true }>

// The last successful read, kept in memory for this server instance. Cycles that
// already happened never change, so serving it after a failed read is still true.
let lastGood: { at: number; value: Good } | null = null
const FRESH_MS = 120_000

// Cycles before the checkpoint are frozen in demoSnapshot.json (the desk owed nothing at
// that block), so only the blocks since are read. Reading from the first block every time
// grows by about 30 pages a day and soon outlasts a page build. The snapshot is used only
// when it was made for the desk and start block this build is configured with.
const frozen =
  snapshot.desk.toLowerCase() === DEMO_DESK_ADDRESS.toLowerCase() &&
  BigInt(snapshot.fromBlock) === DEMO_DESK_FROM_BLOCK
    ? { settlements: snapshot.settlements as Settlement[], checkpoint: BigInt(snapshot.checkpointBlock) }
    : null

// How long the read since the checkpoint may take before the frozen cycles are served alone.
const LIVE_READ_MS = 25_000

async function readCycles(): Promise<Good> {
  if (!frozen) {
    const [history, blockNumber] = await Promise.all([
      readHistory(DEMO_DESK_ADDRESS, { fromBlock: DEMO_DESK_FROM_BLOCK }),
      publicClient.getBlockNumber(),
    ])
    return { ok: true, settlements: history.settlements, blockNumber }
  }
  try {
    const live = await Promise.race([
      Promise.all([
        // Legacy Memo payouts all predate the checkpoint, so skip that log read.
        readHistory(DEMO_DESK_ADDRESS, { fromBlock: frozen.checkpoint + 1n, includeMemo: false }),
        publicClient.getBlockNumber(),
      ]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('live read timed out')), LIVE_READ_MS)),
    ])
    return { ok: true, settlements: [...frozen.settlements, ...live[0].settlements], blockNumber: live[1] }
  } catch (e) {
    // A newer read is better than the frozen cycles, so let the caller serve that one.
    if (lastGood) throw e
    return { ok: true, settlements: frozen.settlements, blockNumber: frozen.checkpoint }
  }
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
