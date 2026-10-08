import { createPublicClient, fallback, http } from 'viem'
import { ARC_RPC_FALLBACK_URLS, arcChain } from './chain'

/**
 * Read-only Arc client. Kept apart from kit.ts so server pages skip the Circle SDKs.
 * It fails over across several public RPCs, because one provider rate-limits the
 * shared network addresses that serverless hosts use.
 */
// In a browser every read goes through this site's own /api/arc-rpc, which tries each node. A visitor's
// browser, blocker or network may stop a page from reaching the public Arc nodes directly, and then
// the wallet adapter wrongly decides a normal wallet cannot batch. On the server it asks the nodes itself.
const transport =
  typeof window === 'undefined'
    ? fallback(
        ARC_RPC_FALLBACK_URLS.map((url) => http(url, { retryCount: 2, retryDelay: 400 })),
        { retryCount: 2, retryDelay: 400 },
      )
    : http(new URL('/api/arc-rpc', window.location.origin).href, { retryCount: 2, retryDelay: 400 })

export const publicClient = createPublicClient({ chain: arcChain, transport })
