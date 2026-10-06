import { cache } from 'react'
import { type Address } from 'viem'
import { morphoAbi } from './abis'
import { ADDRESSES, CIRBTC_DECIMALS, CIRBTC_USDC_MARKET_ID } from './chain'
import { isDemoDesk } from './deskAddress'
import { publicClient } from './client'
import { formatUnits } from 'viem'
import { readHistory, type Settlement } from './history'
import { getDemoCycles } from './landing'
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

/**
 * Everything the console shows for one address. The loan comes from Circle's Borrow
 * service and the history from Arc. If the service is down the page still renders
 * the chain data, and says so.
 */
export const getDesk = cache(async (address: Address): Promise<Desk> => {
  const history = isDemoDesk(address)
    ? getDemoCycles().then((d) =>
        d.ok
          ? { settlements: d.settlements, truncated: false, blockNumber: d.blockNumber }
          : null,
      )
    : readHistory(address)
        .then((h) => ({ settlements: h.settlements, truncated: h.truncated, blockNumber: h.toBlock }))
        .catch(() => null)

  const [hist, position, collateral] = await Promise.all([
    history,
    readPosition(address).catch(() => null),
    publicClient
      .readContract({
        address: ADDRESSES.morpho,
        abi: morphoAbi,
        functionName: 'position',
        args: [CIRBTC_USDC_MARKET_ID, address],
      })
      .then((p) => formatUnits(p[2], CIRBTC_DECIMALS))
      .catch(() => null),
  ])

  if (!hist || collateral === null) return { ok: false, address, reason: 'chain' }
  return {
    ok: true,
    address,
    position,
    collateralCirBtc: collateral,
    settlements: hist.settlements,
    truncated: hist.truncated,
    blockNumber: hist.blockNumber,
  }
})
