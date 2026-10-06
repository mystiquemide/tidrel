// Simulates TidrelSettler against real Arc state with no transaction and no key:
// eth_call with the contract code injected through a state override.
// Usage: npx tsx scripts/sim-settler.mts <creation-bytecode-file>
import { readFileSync } from 'node:fs'
import { createPublicClient, encodeAbiParameters, encodeFunctionData, http, padHex, parseAbi, stringToHex } from 'viem'
import { ADDRESSES } from '../src/lib/chain'
import { multicall3FromAbi } from '../src/lib/abis'

const c = createPublicClient({ transport: http('https://rpc.mainnet.arc.io') })
const DESK = '0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04'
const creation = (readFileSync(process.argv[2], 'utf8').trim() +
  encodeAbiParameters([{ type: 'address' }], [ADDRESSES.usdc]).slice(2)) as `0x${string}`
const { data: runtime } = await c.call({ data: creation, account: DESK })
console.log('runtime bytes', (runtime!.length - 2) / 2)

const SETTLER = '0x00000000000000000000000000000000000571e5'
const settlerAbi = parseAbi(['function settle(bytes32 ref, address[] recipients, uint256[] amounts)'])
const approveAbi = parseAbi(['function approve(address,uint256) returns (bool)'])
const r1 = '0x00000000000000000000000000000000000000a1'
const r2 = '0x00000000000000000000000000000000000000a2'
const ref = padHex(stringToHex('SIM-1'), { size: 32, dir: 'right' })
const calls: { target: `0x${string}`; allowFailure: boolean; callData: `0x${string}` }[] = [
  { target: ADDRESSES.usdc, allowFailure: false, callData: encodeFunctionData({ abi: approveAbi, functionName: 'approve', args: [SETTLER, 900000n] }) },
  { target: SETTLER, allowFailure: false, callData: encodeFunctionData({ abi: settlerAbi, functionName: 'settle', args: [ref, [r1, r2], [500000n, 400000n]] }) },
]
const run = (cs: typeof calls) =>
  c.call({
    account: DESK,
    to: ADDRESSES.multicall3From,
    data: encodeFunctionData({ abi: multicall3FromAbi, functionName: 'aggregate3', args: [cs] }),
    stateOverride: [{ address: SETTLER, code: runtime }],
  })
console.log('approve + settle batch ok:', !!(await run(calls)).data)
try {
  await run([...calls, calls[1]])
  console.log('DUPLICATE REFERENCE WAS NOT REJECTED')
} catch (e) {
  console.log('same reference twice rejected:', (e as Error).message.split('\n')[0].slice(0, 100))
}
