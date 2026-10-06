import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { erc20Abi, memoAbi } from './abis'
import { ADDRESSES } from './chain'

const MEMO_DATA_PARAMS = parseAbiParameters(
  'string ref, uint16 legIndex, uint16 legCount',
)

export type PayoutLeg = { to: Address; amount: bigint }

export const memoIdOf = (reference: string): Hex =>
  keccak256(toHex(reference))

export function encodeMemoData(
  reference: string,
  legIndex: number,
  legCount: number,
): Hex {
  return encodeAbiParameters(MEMO_DATA_PARAMS, [reference, legIndex, legCount])
}

export function decodeMemoData(data: Hex) {
  const [ref, legIndex, legCount] = decodeAbiParameters(
    MEMO_DATA_PARAMS,
    data,
  )
  return { reference: ref, legIndex, legCount }
}

export function encodePayoutCall(
  leg: PayoutLeg,
  reference: string,
  legIndex: number,
  legCount: number,
): Hex {
  const transfer = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [leg.to, leg.amount],
  })
  return encodeFunctionData({
    abi: memoAbi,
    functionName: 'memo',
    args: [
      ADDRESSES.usdc,
      transfer,
      memoIdOf(reference),
      encodeMemoData(reference, legIndex, legCount),
    ],
  })
}

/** One Multicall3From subcall per leg, each routed through Memo. */
export function buildPayoutCalls(legs: PayoutLeg[], reference: string) {
  return legs.map((leg, i) => ({
    target: ADDRESSES.memo,
    allowFailure: false,
    callData: encodePayoutCall(leg, reference, i, legs.length),
  }))
}
