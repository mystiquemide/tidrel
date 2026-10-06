/**
 * Mainnet runner for the ops wallet. One stage per invocation so each spend is deliberate.
 *   tsx scripts/mainnet-run.ts status
 *   tsx scripts/mainnet-run.ts estimate-swap <usdc>
 *   tsx scripts/mainnet-run.ts swap <usdc>
 *   tsx scripts/mainnet-run.ts quote-draw <usdc>
 *   tsx scripts/mainnet-run.ts draw <usdc>
 *   tsx scripts/mainnet-run.ts repay [usdc]
 * Reads the key from DESK_PRIVATE_KEY. Never prints it.
 */
import { formatUnits, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ADDRESSES, CIRBTC_DECIMALS, CIRBTC_USDC_MARKET_ID, USDC_DECIMALS } from '../src/lib/chain'
import { BORROW_CHAIN, getKit, publicClient, serverAdapter } from '../src/lib/kit'
import { erc20Abi } from '../src/lib/abis'
import { readPosition } from '../src/lib/position'
import { kitDrawDeps, quoteDraw } from '../src/lib/draw'
import { executeRepay, kitRepayDeps, planRepay, quoteRepay } from '../src/lib/repay'

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
    case 'quote-draw': {
      const p = await readPosition(wallet)
      const q = await kit.borrow.getBorrowQuote(
        p.loanId
          ? { loanId: p.loanId, borrowAmount: arg }
          : { walletAddress: wallet, chain: BORROW_CHAIN, marketId: CIRBTC_USDC_MARKET_ID, borrowAmount: arg },
      )
      console.log(json(q))
      console.log('guard view', await quoteDraw({ wallet, loanId: p.loanId, drawUsdc: arg }))
      break
    }
    case 'draw': {
      const p = await readPosition(wallet)
      const out = await kitDrawDeps(serverAdapter(key!), wallet).borrow({
        loanId: p.loanId,
        drawUsdc: arg,
        idempotencyKey: crypto.randomUUID(),
      })
      console.log(json(out))
      console.log('balances', await balances())
      console.log('position', json(await readPosition(wallet)))
      break
    }
    case 'repay': {
      const p = await readPosition(wallet)
      const plan = await planRepay(p, { amountUsdc: arg }, { quoteRepay, newKey: () => crypto.randomUUID() })
      console.log('plan', json(plan))
      if (plan.refusal) break
      const out = await executeRepay(plan, kitRepayDeps(serverAdapter(key!), wallet))
      console.log('outcome', json(out))
      console.log('balances', await balances())
      console.log('position', json(await readPosition(wallet)))
      break
    }
    default:
      throw new Error('stage: status | estimate-swap | swap | quote-draw | draw | repay')
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
