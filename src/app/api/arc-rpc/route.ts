import { ARC_RPC_FALLBACK_URLS } from '@/lib/chain'
import { MAX_RPC_BODY_BYTES, checkRpcRequest, isSameSite } from '@/lib/rpcProxy'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

/**
 * Read-only Arc RPC for the browser. Some browsers, blockers and networks stop a page
 * from reaching the public Arc nodes, and the wallet adapter then wrongly decides a
 * normal wallet cannot batch. Sending those reads through here removes that dependency,
 * and tries each node in turn so one slow node does not stop a draw.
 */
export async function POST(req: Request) {
  if (!isSameSite(req.headers.get('origin'), req.headers.get('host'))) return json({ error: 'forbidden' }, 403)
  const text = await req.text()
  if (text.length > MAX_RPC_BODY_BYTES) return json({ error: 'too large' }, 413)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const checked = checkRpcRequest(body)
  if (!checked.ok) return json({ error: checked.reason }, 400)

  let last: unknown = { error: 'no node answered' }
  for (const url of ARC_RPC_FALLBACK_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: text,
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        last = { error: `node answered ${res.status}` }
        continue
      }
      const out = await res.json()
      // A node that has dropped old blocks answers null for a receipt. Try the next node for that.
      const single = !Array.isArray(out) && out && typeof out === 'object' && 'result' in out && (out as { result: unknown }).result === null
      if (single && url !== ARC_RPC_FALLBACK_URLS[ARC_RPC_FALLBACK_URLS.length - 1]) {
        last = out
        continue
      }
      return json(out, 200)
    } catch (e) {
      last = { error: e instanceof Error ? e.message.slice(0, 100) : 'node unreachable' }
    }
  }
  return json(last, 502)
}
