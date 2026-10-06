import { createPublicClient, fallback, http } from 'viem'
import { ARC_RPC_FALLBACK_URLS, arcChain } from './chain'

/**
 * Read-only Arc client. Kept apart from kit.ts so server pages skip the Circle SDKs.
 * It fails over across several public RPCs, because one provider rate-limits the
 * shared network addresses that serverless hosts use.
 */
export const publicClient = createPublicClient({
  chain: arcChain,
  transport: fallback(
    ARC_RPC_FALLBACK_URLS.map((url) => http(url, { retryCount: 2, retryDelay: 400 })),
    { retryCount: 2, retryDelay: 400 },
  ),
})
