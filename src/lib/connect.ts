import type { AddEthereumChainParameter, EIP1193Provider } from 'viem'
import { ARC_CHAIN_ID, ARC_RPC_URL, EXPLORER_URL } from './chain'

export const ARC_CHAIN_ID_HEX = `0x${ARC_CHAIN_ID.toString(16)}` as const

/** Params for wallet_addEthereumChain. USDC is Arc's gas token with 18 native decimals. */
export const ARC_ADD_CHAIN_PARAMS: AddEthereumChainParameter = {
  chainId: ARC_CHAIN_ID_HEX,
  chainName: 'Arc',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: [ARC_RPC_URL],
  blockExplorerUrls: [EXPLORER_URL],
}

const UNRECOGNIZED_CHAIN = 4902
const USER_REJECTED = 4001

const codeOf = (e: unknown): number | undefined =>
  typeof e === 'object' && e !== null && 'code' in e
    ? Number((e as { code: unknown }).code)
    : undefined

/**
 * Switch the wallet to Arc, adding the chain first when the wallet does not know it.
 * A user rejection is rethrown so the UI can show it, not retried.
 */
export async function switchToArc(provider: Pick<EIP1193Provider, 'request'>) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID_HEX }],
    })
  } catch (e) {
    if (codeOf(e) === USER_REJECTED) throw e
    if (codeOf(e) !== UNRECOGNIZED_CHAIN) throw e
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [ARC_ADD_CHAIN_PARAMS],
    })
  }
}
