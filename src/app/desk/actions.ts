'use server'

import { getDeskHeader, getDeskHistory, type DeskHeader, type DeskHistory } from '@/lib/desk'
import { parseDeskAddress } from '@/lib/deskAddress'
import { readPosition, type Position } from '@/lib/position'

/** The quick half of a desk: the loan and the collateral. The page shows it as soon as it lands. */
export async function loadDeskHeader(address: string): Promise<DeskHeader | null> {
  const parsed = parseDeskAddress(address)
  return parsed ? getDeskHeader(parsed) : null
}

/** The slow half: the settlement history, a scan of recent blocks. */
export async function loadDeskHistory(address: string): Promise<DeskHistory | null> {
  const parsed = parseDeskAddress(address)
  return parsed ? getDeskHistory(parsed) : null
}

/**
 * A wallet's position, read on the server for the settle, repay and collateral sheets.
 * Reading it here keeps those sheets from depending on the visitor's browser reaching
 * Arc and Circle, and an error comes back as text so the sheet can say what went wrong.
 */
export async function loadPosition(
  address: string,
): Promise<{ ok: true; position: Position } | { ok: false; error: string }> {
  const parsed = parseDeskAddress(address)
  if (!parsed) return { ok: false, error: 'not a valid address' }
  try {
    return { ok: true, position: await readPosition(parsed) }
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e)
    console.error('position read failed', parsed, text.slice(0, 300))
    return { ok: false, error: text.split('\n')[0].slice(0, 140) }
  }
}
