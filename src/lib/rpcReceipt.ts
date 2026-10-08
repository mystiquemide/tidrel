import { TransactionReceiptNotFoundError, createPublicClient, http, type Hash } from 'viem'
import { ARC_RPC_FALLBACK_URLS, arcChain } from './chain'
import type { publicClient } from './client'

type ReceiptSource = Pick<typeof publicClient, 'getTransactionReceipt' | 'getBlock'>

export const receiptSources: ReceiptSource[] = ARC_RPC_FALLBACK_URLS.map((url) =>
  createPublicClient({ chain: arcChain, transport: http(url, { retryCount: 2, retryDelay: 300 }) }),
)

/**
 * Asks each RPC in turn for the receipt. A node that has pruned old blocks answers null,
 * which is a reply and not an error, so the shared failover stops there and calls a real
 * receipt missing. Only when every node answers with nothing is the transaction absent.
 */
export async function lookupReceipt(hash: Hash, sources: ReceiptSource[] = receiptSources) {
  let failed = false
  for (const source of sources) {
    try {
      return { found: true as const, receipt: await source.getTransactionReceipt({ hash }), source }
    } catch (e) {
      if (!(e instanceof TransactionReceiptNotFoundError)) {
        failed = true
        console.error('receipt lookup failed on one RPC', e instanceof Error ? e.message.slice(0, 200) : e)
      }
    }
  }
  return { found: false as const, failed }
}
