/**
 * Mainnet runner for the ops wallet. One stage per invocation so each spend is deliberate.
 *   tsx scripts/mainnet-run.ts status
 *   tsx scripts/mainnet-run.ts estimate-swap <usdc>
 *   tsx scripts/mainnet-run.ts swap <usdc>
 * Reads the key from DESK_PRIVATE_KEY. Never prints it.
 */
import { formatUnits, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ADDRESSES, CIRBTC_DECIMALS, USDC_DECIMALS } from '../src/lib/chain'
import { BORROW_CHAIN, getKit, publicClient, serverAdapter } from '../src/lib/kit'
import { erc20Abi } from '../src/lib/abis'
import { readPosition } from '../src/lib/position'

const key = process.env.DESK_PRIVATE_KEY as `0x${string}` | undefined
if (!key) throw new Error('DESK_PRIVATE_KEY is not set')
const wallet: Address = privateKeyToAccount(key).address

const json = (v: unknown) =>
  JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x), 2)

async function balances() {
  const [usdc, cir] = await Promise.all(
    [ADDRESSES.usdc, ADDRESSES.cirBtc].map((address) =>
      publicClient.readContract({ address, abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }),
    ),
  )
  return { usdc: formatUnits(usdc, USDC_DECIMALS), cirBtc: formatUnits(cir, CIRBTC_DECIMALS) }
}

async function main() {
  const [stage, arg] = process.argv.slice(2)
  const kit = getKit()
  const swapParams = (amountIn: string) => ({
    from: { adapter: serverAdapter(key!), chain: BORROW_CHAIN },
    tokenIn: 'USDC' as const,
    tokenOut: 'cirBTC' as const,
    amountIn,
  })

  switch (stage) {
    case 'status':
      console.log('wallet', wallet)
      console.log('balances', await balances())
      console.log('position', json(await readPosition(wallet)))
      break
    case 'estimate-swap':
      console.log(json(await kit.estimateSwap(swapParams(arg))))
      break
    case 'swap': {
      console.log('before', await balances())
      const r = await kit.swap(swapParams(arg))
      console.log(json(r))
      console.log('after', await balances())
      break
    }
    default:
      throw new Error('stage: status | estimate-swap <usdc> | swap <usdc>')
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
