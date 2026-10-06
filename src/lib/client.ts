import { createPublicClient, http } from 'viem'
import { ARC_RPC_URL, arcChain } from './chain'

/** Read-only Arc client. Kept apart from kit.ts so server pages do not load the Circle SDKs. */
export const publicClient = createPublicClient({
  chain: arcChain,
  transport: http(ARC_RPC_URL, { retryCount: 6, retryDelay: 500 }),
})
