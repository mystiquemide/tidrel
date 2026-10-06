import type { Address, PublicClient } from 'viem'
import { ARC_CHAIN_ID } from './chain'

export type WalletCheck =
  | { ok: true }
  | { ok: false; reason: 'WRONG_CHAIN'; chainId: number }
  | { ok: false; reason: 'SMART_ACCOUNT' }

/**
 * Memo and Multicall3From reject smart-account callers, so a connected address
 * with deployed code is refused. A chain other than Arc is flagged first.
 */
export async function checkWallet(args: {
  address: Address
  chainId: number
  publicClient: Pick<PublicClient, 'getCode'>
}): Promise<WalletCheck> {
  if (args.chainId !== ARC_CHAIN_ID) {
    return { ok: false, reason: 'WRONG_CHAIN', chainId: args.chainId }
  }
  const code = await args.publicClient.getCode({ address: args.address })
  if (code && code !== '0x') return { ok: false, reason: 'SMART_ACCOUNT' }
  return { ok: true }
}
