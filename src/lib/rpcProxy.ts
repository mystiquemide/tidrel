/** The JSON-RPC methods the browser may ask the Arc proxy for. Reads and fee lookups only, never a send. */
export const ALLOWED_RPC_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getCode',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'net_version',
])

export const MAX_RPC_BODY_BYTES = 64_000
export const MAX_RPC_BATCH = 20

type RpcCall = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown }

/** Returns the calls when every one is an allowed read, or a short reason when the request is refused. */
export function checkRpcRequest(body: unknown): { ok: true; batch: boolean } | { ok: false; reason: string } {
  const calls: unknown[] = Array.isArray(body) ? body : [body]
  if (calls.length === 0 || calls.length > MAX_RPC_BATCH) return { ok: false, reason: 'bad batch size' }
  for (const c of calls) {
    const m = (c as RpcCall | null)?.method
    if (typeof m !== 'string') return { ok: false, reason: 'missing method' }
    if (!ALLOWED_RPC_METHODS.has(m)) return { ok: false, reason: `method not allowed: ${m.slice(0, 40)}` }
  }
  return { ok: true, batch: Array.isArray(body) }
}

/** The proxy only serves this site's own pages. A request with no origin header (a server or a script) is refused too. */
export function isSameSite(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
