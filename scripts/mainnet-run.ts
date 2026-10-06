/**
 * Mainnet runner for the ops wallet. One stage per invocation so each spend is deliberate.
 *   tsx scripts/mainnet-run.ts status
 *   tsx scripts/mainnet-run.ts estimate-swap <usdc>
 *   tsx scripts/mainnet-run.ts swap <usdc>
 *   tsx scripts/mainnet-run.ts quote-draw <usdc>
 *   tsx scripts/mainnet-run.ts draw <usdc>
 *   tsx scripts/mainnet-run.ts repay [usdc]
 *   tsx scripts/mainnet-run.ts counterparties
 *   tsx scripts/mainnet-run.ts payout <reference> <usdc> <usdc> <usdc>
 *   tsx scripts/mainnet-run.ts return
 * Reads the key from DESK_PRIVATE_KEY. Never prints it.
 */
import {
  createWalletClient,
  encodePacked,
  formatUnits,
  http,
  keccak256,
  parseUnits,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ADDRESSES, ARC_RPC_URL, CIRBTC_DECIMALS, CIRBTC_USDC_MARKET_ID, USDC_DECIMALS, arcChain, explorerTx } from '../src/lib/chain'
import { BORROW_CHAIN, getKit, publicClient, serverAdapter } from '../src/lib/kit'
import { erc20Abi } from '../src/lib/abis'
import { hasCollateral, readPosition } from '../src/lib/position'
import { kitDrawDeps, quoteDraw } from '../src/lib/draw'
import { findReference, readHistory } from '../src/lib/history'
import { executePayouts, planSettlement } from '../src/lib/settle'
import { executeRepay, kitRepayDeps, planRepay, quoteRepay } from '../src/lib/repay'

const key = process.env.DESK_PRIVATE_KEY as `0x${string}` | undefined
if (!key) throw new Error('DESK_PRIVATE_KEY is not set')
const wallet: Address = privateKeyToAccount(key).address

/** Builder-controlled counterparties, derived from the desk key so they are recoverable. */
const counterparty = (i: number) =>
  privateKeyToAccount(keccak256(encodePacked(['bytes32', 'string'], [key!, `tidrel-counterparty-${i}`])))
const counterparties = [0, 1, 2].map(counterparty)

const walletFor = (account: ReturnType<typeof counterparty>) =>
  createWalletClient({ account, chain: arcChain, transport: http(ARC_RPC_URL) })

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
    case 'counterparties':
      for (const [i, a] of counterparties.entries()) {
        const bal = await publicClient.readContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [a.address] })
        console.log(i, a.address, formatUnits(bal, USDC_DECIMALS))
      }
      break
    case 'payout': {
      const [reference, ...amounts] = process.argv.slice(3)
      const p = await readPosition(wallet)
      const history = await readHistory(wallet)
      const plan = await planSettlement(
        { reference, legs: amounts.map((amountUsdc, i) => ({ to: counterparties[i].address, amountUsdc })) },
        { wallet, loanId: p.loanId, hasCollateral: hasCollateral(p), walletUsdc: p.walletUsdc, walletCirBtc: p.walletCirBtc, marketLiquidityUsdc: p.marketLiquidityUsdc },
        { quoteDraw, findReference: async (r) => findReference(history.settlements, r), newKey: () => crypto.randomUUID() },
      )
      console.log('plan', json(plan))
      if (plan.refusal) break
      const hash = await executePayouts({
        plan,
        walletClient: createWalletClient({ account: privateKeyToAccount(key!), chain: arcChain, transport: http(ARC_RPC_URL) }),
        publicClient,
      })
      console.log('payout tx', hash, explorerTx(hash))
      console.log('history', json((await readHistory(wallet)).settlements))
      break
    }
    case 'return': {
      const reserve = parseUnits('0.004', USDC_DECIMALS)
      for (const a of counterparties) {
        const bal = await publicClient.readContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'balanceOf', args: [a.address] })
        if (bal <= reserve) { console.log(a.address, 'nothing to return'); continue }
        const hash = await walletFor(a).writeContract({ address: ADDRESSES.usdc, abi: erc20Abi, functionName: 'transfer', args: [wallet, bal - reserve] })
        await publicClient.waitForTransactionReceipt({ hash })
        console.log(a.address, 'returned', formatUnits(bal - reserve, USDC_DECIMALS), hash)
      }
      console.log('balances', await balances())
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
