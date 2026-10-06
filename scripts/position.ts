import { isAddress, type Address } from 'viem'
import { readPosition } from '../src/lib/position'

const wallet = process.argv[2]
if (!wallet || !isAddress(wallet)) {
  console.error('usage: tsx scripts/position.ts <wallet address>')
  process.exit(1)
}

readPosition(wallet as Address)
  .then((p) =>
    console.log(JSON.stringify(p, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2)),
  )
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
