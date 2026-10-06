import { formatUnits } from 'viem'
import { ADDRESSES, USDC_DECIMALS } from '../src/lib/chain'
import { BORROW_CHAIN, getKit, publicClient } from '../src/lib/kit'

const erc20 = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

async function main() {
  const wallet = process.argv[2] as `0x${string}` | undefined
  const kit = getKit()

  const { markets } = await kit.borrow.exploreMarkets({ chain: BORROW_CHAIN })
  const market = markets.find(
    (m) =>
      m.collateralAsset.address?.toLowerCase() ===
        ADDRESSES.cirBtc.toLowerCase() &&
      m.loanAsset.symbol === 'USDC',
  )
  console.log('markets on Arc:', markets.length)
  console.log('cirBTC market:', JSON.stringify(market, null, 2))

  if (wallet) {
    const usdc = await publicClient.readContract({
      address: ADDRESSES.usdc,
      abi: erc20,
      functionName: 'balanceOf',
      args: [wallet],
    })
    console.log('wallet USDC:', formatUnits(usdc, USDC_DECIMALS))
    const loans = await kit.borrow.getLoans({
      walletAddress: wallet,
      chain: BORROW_CHAIN,
    })
    console.log('loans:', JSON.stringify(loans, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
