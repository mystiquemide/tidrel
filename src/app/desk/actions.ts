'use server'

import { getDesk, type Desk } from '@/lib/desk'
import { parseDeskAddress } from '@/lib/deskAddress'

/** Reads one wallet's desk on the server, where the Borrow service and history reads are cached. */
export async function loadDesk(address: string): Promise<Desk | null> {
  const parsed = parseDeskAddress(address)
  return parsed ? getDesk(parsed) : null
}
