// Freezes the demo desk's finished settlements into src/lib/demoSnapshot.json so the
// site only reads the chain from the checkpoint onward. Run again to move the checkpoint:
//   npx tsx scripts/freeze-demo-history.mts <checkpointBlock>
// Pick a block where the desk owes nothing, so no cycle straddles it.
import { writeFileSync } from 'node:fs'
import { ADDRESSES, CIRBTC_USDC_MARKET_ID, DEMO_DESK_ADDRESS, DEMO_DESK_FROM_BLOCK } from '../src/lib/chain'
import { morphoAbi } from '../src/lib/abis'
import { publicClient } from '../src/lib/client'
import { readHistory } from '../src/lib/history'
import { decodeMemoPayout, decodePayout, lookupReceipt } from '../src/lib/receipt'

const checkpoint = BigInt(process.argv[2] ?? '')

const [, borrowShares] = await publicClient.readContract({
  address: ADDRESSES.morpho,
  abi: morphoAbi,
  functionName: 'position',
  args: [CIRBTC_USDC_MARKET_ID, DEMO_DESK_ADDRESS],
  blockNumber: checkpoint,
})
if (borrowShares !== 0n) throw new Error(`The desk still owes at block ${checkpoint}. Pick a quieter block.`)

const history = await readHistory(DEMO_DESK_ADDRESS, { fromBlock: DEMO_DESK_FROM_BLOCK, toBlock: checkpoint })
if (history.settlements.some((s) => s.state === 'open' || s.state === 'drawn-not-settled')) {
  throw new Error('A cycle is still open at the checkpoint.')
}

// Receipts of the payouts above, decoded once, so their pages need no live RPC call.
const receipts: Record<string, unknown> = {}
for (const s of history.settlements) {
  if (!s.txHash) continue
  const hit = await lookupReceipt(s.txHash)
  if (!hit.found) throw new Error(`No RPC could find the receipt for ${s.txHash}`)
  const payout = decodePayout(hit.receipt.logs) ?? decodeMemoPayout(hit.receipt.logs, hit.receipt.from)
  if (!payout) throw new Error(`${s.txHash} holds no payout`)
  const block = await hit.source.getBlock({ blockNumber: hit.receipt.blockNumber })
  receipts[s.txHash.toLowerCase()] = {
    blockNumber: hit.receipt.blockNumber.toString(),
    timestamp: Number(block.timestamp),
    payout,
  }
}

const out = new URL('../src/lib/demoSnapshot.json', import.meta.url)
writeFileSync(
  out,
  JSON.stringify(
    {
      desk: DEMO_DESK_ADDRESS,
      fromBlock: DEMO_DESK_FROM_BLOCK.toString(),
      checkpointBlock: checkpoint.toString(),
      settlements: history.settlements,
      receipts,
    },
    null,
    2,
  ) + '\n',
)
console.log(`Froze ${history.settlements.length} settlements up to block ${checkpoint}`)
