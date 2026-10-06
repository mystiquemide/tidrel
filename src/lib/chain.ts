import { arc } from 'viem/chains'
import type { Address } from 'viem'

export const ARC_CHAIN_ID = 5042
export const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? 'https://rpc.mainnet.arc.io'

/**
 * Public Arc RPCs that serve the 5,000 block log pages the history reader needs, in
 * failover order. The primary honors NEXT_PUBLIC_ARC_RPC_URL. (The fourth listed in
 * viem's chain config, dRPC, rejects these log requests on its free plan.)
 */
export const ARC_RPC_FALLBACK_URLS = [
  ARC_RPC_URL,
  'https://rpc.blockdaemon.mainnet.arc.io',
  'https://rpc.quicknode.mainnet.arc.io',
].filter((u, i, all) => all.indexOf(u) === i)

export const arcChain = {
  ...arc,
  rpcUrls: { default: { http: [ARC_RPC_URL] } },
} as const

export const ADDRESSES = {
  usdc: '0x3600000000000000000000000000000000000000',
  cirBtc: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0',
  multicall3From: '0x522fAf9A91c41c443c66765030741e4AaCe147D0',
  memo: '0x5294E9927c3306DcBaDb03fe70b92e01cCede505',
  morpho: '0x34cd04070dd72b14e241112f6d83812df5af7fcd',
} as const satisfies Record<string, Address>

export const USDC_DECIMALS = 6
export const CIRBTC_DECIMALS = 8

export const EXPLORER_URL = arc.blockExplorers.default.url

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`
export const explorerAddress = (address: string) =>
  `${EXPLORER_URL}/address/${address}`

export const CIRBTC_USDC_MARKET_ID =
  '0xc2db905f174e5defcce01d321b09f15f78856a36a21b90cc7e1abbc29225815d'

/** Desk whose history feeds the landing page tide line. Public on-chain address, no key. */
export const DEMO_DESK_ADDRESS = (process.env.NEXT_PUBLIC_DEMO_DESK ??
  '0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04') as Address

/** First block of the demo desk's activity (its swap). History is read from here so it never ages out. */
export const DEMO_DESK_FROM_BLOCK = BigInt(
  process.env.NEXT_PUBLIC_DEMO_FROM_BLOCK ?? '24575996',
)

/** Budget of the mainnet run, in USDC. A statement about the run, not a chain reading. */
export const RUN_BUDGET_USDC = process.env.NEXT_PUBLIC_RUN_BUDGET_USDC ?? '5'
