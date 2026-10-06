// Deploys TidrelSettler to Arc mainnet from the key in DESK_PRIVATE_KEY (never printed).
// Usage: npx tsx scripts/deploy-settler.mts <creation-bytecode-file>
import { readFileSync } from 'node:fs'
import { createPublicClient, createWalletClient, encodeAbiParameters, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { ADDRESSES, arcChain } from '../src/lib/chain'

const account = privateKeyToAccount(process.env.DESK_PRIVATE_KEY as `0x${string}`)
const pub = createPublicClient({ chain: arcChain, transport: http('https://rpc.mainnet.arc.io') })
const wallet = createWalletClient({ account, chain: arcChain, transport: http('https://rpc.mainnet.arc.io') })
const data = (readFileSync(process.argv[2], 'utf8').trim() +
  encodeAbiParameters([{ type: 'address' }], [ADDRESSES.usdc]).slice(2)) as `0x${string}`
const hash = await wallet.sendTransaction({ data })
console.log('deploy tx', hash)
const r = await pub.waitForTransactionReceipt({ hash })
console.log('status', r.status, 'address', r.contractAddress, 'gasUsed', r.gasUsed, 'block', r.blockNumber)
