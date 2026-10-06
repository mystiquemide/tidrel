import { isAddress, type Address } from 'viem'
import { readHistory } from '../src/lib/history'

const [wallet, from, lookback] = process.argv.slice(2)
if (!wallet || !isAddress(wallet)) {
  console.error('usage: tsx scripts/history.ts <wallet> [fromBlock] [lookbackBlocks]')
  process.exit(1)
}

readHistory(wallet as Address, {
  fromBlock: from ? BigInt(from) : undefined,
  lookbackBlocks: lookback ? BigInt(lookback) : undefined,
})
  .then((r) =>
    console.log(JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)),
  )
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
