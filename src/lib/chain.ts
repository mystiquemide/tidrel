import { arc } from 'viem/chains'
import type { Address } from 'viem'

export const ARC_CHAIN_ID = 5042
export const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? 'https://rpc.mainnet.arc.io'

export const arcChain = {
  ...arc,
  rpcUrls: { default: { http: [ARC_RPC_URL] } },
} as const

export const ADDRESSES = {
  usdc: '0x3600000000000000000000000000000000000000',
  cirBtc: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0',
  multicall3From: '0x522fAf9A91c41c443c66765030741e4AaCe147D0',
  memo: '0x5294E9927c3306DcBaDb03fe70b92e01cCede505',
} as const satisfies Record<string, Address>

export const USDC_DECIMALS = 6
export const CIRBTC_DECIMALS = 8

export const EXPLORER_URL = arc.blockExplorers.default.url

export const explorerTx = (hash: string) => `${EXPLORER_URL}/tx/${hash}`
export const explorerAddress = (address: string) =>
  `${EXPLORER_URL}/address/${address}`

export const CIRBTC_USDC_MARKET_ID =
  '0xc2db905f174e5defcce01d321b09f15f78856a36a21b90cc7e1abbc29225815d'
