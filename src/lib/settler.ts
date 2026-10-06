import { encodeFunctionData, hexToString, padHex, stringToHex, type Address, type Hex } from 'viem'
import { erc20ApproveAbi, settlerAbi } from './abis'
import { ADDRESSES } from './chain'
import type { PayoutLeg } from './memo'

/** A reference is stored as a bytes32 on-chain, so it must fit in 31 bytes of UTF-8. */
export const MAX_REFERENCE_BYTES = 31

export const referenceBytes = (reference: string) => new TextEncoder().encode(reference).length

export function referenceToBytes32(reference: string): Hex {
  if (referenceBytes(reference) > MAX_REFERENCE_BYTES) {
    throw new Error(`Reference is longer than ${MAX_REFERENCE_BYTES} bytes.`)
  }
  return padHex(stringToHex(reference), { size: 32, dir: 'right' })
}

export const bytes32ToReference = (ref: Hex): string =>
  hexToString(ref, { size: 32 }).replace(/\0+$/, '')

/** The batch a wallet sends through Multicall3From: approve the exact total, then settle. */
export function buildSettleCalls(legs: PayoutLeg[], reference: string) {
  const total = legs.reduce((s, l) => s + l.amount, 0n)
  const recipients: Address[] = legs.map((l) => l.to)
  const amounts = legs.map((l) => l.amount)
  return [
    {
      target: ADDRESSES.usdc,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: erc20ApproveAbi,
        functionName: 'approve',
        args: [ADDRESSES.settler, total],
      }),
    },
    {
      target: ADDRESSES.settler,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: settlerAbi,
        functionName: 'settle',
        args: [referenceToBytes32(reference), recipients, amounts],
      }),
    },
  ]
}
