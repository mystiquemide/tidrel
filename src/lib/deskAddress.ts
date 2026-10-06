import { getAddress, isAddress, type Address } from 'viem'
import { DEMO_DESK_ADDRESS } from './chain'

export const parseDeskAddress = (raw: string): Address | null =>
  isAddress(raw, { strict: false }) ? getAddress(raw.toLowerCase()) : null

export const isDemoDesk = (a: Address) => a.toLowerCase() === DEMO_DESK_ADDRESS.toLowerCase()
