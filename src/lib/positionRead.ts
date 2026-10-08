import { loadPosition } from '@/app/desk/actions'
import type { Position } from './position'

/** The sheets' fresh position read. It runs on the server and throws the server's reason on failure. */
export async function readPositionOnServer(address: string): Promise<Position> {
  const r = await loadPosition(address)
  if (!r.ok) throw new Error(r.error)
  return r.position
}
