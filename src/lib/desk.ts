import { cache } from 'react'
import { type Address } from 'viem'
import { morphoAbi } from './abis'
import { ADDRESSES, CIRBTC_DECIMALS, CIRBTC_USDC_MARKET_ID } from './chain'
import { isDemoDesk } from './deskAddress'
import { publicClient } from './client'
import { formatUnits } from 'viem'
import { readHistory, type Settlement } from './history'
import { getDemoCycles } from './landing'
import { reconcileDebt, borrowSharesToAssets } from './debt'
import { readPosition, type Position } from './position'

export type Desk =
  | {
      ok: true
      address: Address
      /** Null when Circle's Borrow service could not be reached. */
      position: Position | null
      /** Collateral posted on Morpho, read from the chain either way. */
      collateralCirBtc: string
      settlements: Settlement[]
      truncated: boolean
      blockNumber: bigint
    }
  | { ok: false; address: Address; reason: 'chain' }

export type DeskHeader = {
  position: Position | null
  collateralCirBtc: string
  blockNumber: bigint
}

export type DeskHistory = { settlements: Settlement[]; truncated: boolean; blockNumber: bigint }

/** The quick half: the loan and the collateral. Reads in about a second or two. */
export const getDeskHeader = cache(async (address: Address): Promise<DeskHeader | null> => {
  const [position, chain, head] = await Promise.all([
    readPosition(address).catch(() => null),
    Promise.all([
      publicClient.readContract({
        address: ADDRESSES.morpho,
        abi: morphoAbi,
        functionName: 'position',
        args: [CIRBTC_USDC_MARKET_ID, address],
      }),
      publicClient.readContract({
        address: ADDRESSES.morpho,
        abi: morphoAbi,
        functionName: 'market',
        args: [CIRBTC_USDC_MARKET_ID],
      }),
    ]).catch(() => null),
    publicClient.getBlockNumber().catch(() => null),
  ])
  if (!chain || head === null) return null
  const [pos, mkt] = chain
  const morphoDebt = borrowSharesToAssets(BigInt(pos[1]), BigInt(mkt[2]), BigInt(mkt[3]))
  return {
    position: position ? reconcileDebt(position, morphoDebt) : null,
    collateralCirBtc: formatUnits(pos[2], CIRBTC_DECIMALS),
    blockNumber: position?.blockNumber ?? head,
  }
})

/** The slow half: the log scan. Memo is skipped for everyone but the demo desk, and pages read in parallel. */
export const getDeskHistory = cache(async (address: Address): Promise<DeskHistory | null> => {
  if (isDemoDesk(address)) {
    const d = await getDemoCycles()
    return d.ok ? { settlements: d.settlements, truncated: false, blockNumber: d.blockNumber } : null
  }
  return readHistory(address, { concurrency: 6, includeMemo: false })
    .then((h) => ({ settlements: h.settlements, truncated: h.truncated, blockNumber: h.toBlock }))
    .catch(() => null)
})

/** Everything the console shows for one address, for pages that render on the server. */
export const getDesk = cache(async (address: Address): Promise<Desk> => {
  const [header, hist] = await Promise.all([getDeskHeader(address), getDeskHistory(address)])
  if (!header || !hist) return { ok: false, address, reason: 'chain' }
  return {
    ok: true,
    address,
    position: header.position,
    collateralCirBtc: header.collateralCirBtc,
    settlements: hist.settlements,
    truncated: hist.truncated,
    blockNumber: hist.blockNumber,
  }
})
