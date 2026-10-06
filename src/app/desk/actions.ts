'use server'

import { getDeskHeader, getDeskHistory, type DeskHeader, type DeskHistory } from '@/lib/desk'
import { parseDeskAddress } from '@/lib/deskAddress'

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
