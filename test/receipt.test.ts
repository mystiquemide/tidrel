import { describe, expect, it } from 'vitest'
import { encodeAbiParameters, encodeEventTopics, padHex, stringToHex, type Address, type Log } from 'viem'
import { settlerAbi } from '../src/lib/abis'
import { ADDRESSES } from '../src/lib/chain'
import { decodePayout } from '../src/lib/receipt'

const payer = '0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04' as Address
const a = '0x1111111111111111111111111111111111111111' as Address
const b = '0x2222222222222222222222222222222222222222' as Address
const ref = padHex(stringToHex('BLK-0420'), { dir: 'right', size: 32 })

const log = (address: Address, eventName: 'Settled' | 'Leg', args: object, data: `0x${string}`): Log =>
  ({
    address,
    topics: encodeEventTopics({ abi: settlerAbi, eventName, args } as never),
    data,
  }) as unknown as Log

const settled = log(
  ADDRESSES.settler,
  'Settled',
  { payer, ref },
  encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [3_500_000n, 2n]),
)
const leg = (to: Address, amount: bigint) =>
  log(ADDRESSES.settler, 'Leg', { payer, ref, to }, encodeAbiParameters([{ type: 'uint256' }], [amount]))

describe('decodePayout', () => {
  it('reads the payer, reference, total and each leg', () => {
    const out = decodePayout([leg(a, 1_000_000n), leg(b, 2_500_000n), settled])
    expect(out).toEqual({
      payer,
      reference: 'BLK-0420',
      totalUsdc: '3.5',
      legs: [
        { to: a, amountUsdc: '1' },
        { to: b, amountUsdc: '2.5' },
      ],
    })
  })

  it('ignores events from other contracts', () => {
    const other = { ...settled, address: a } as Log
    expect(decodePayout([other])).toBeNull()
  })

  it('returns null when the transaction holds no payout', () => {
    expect(decodePayout([])).toBeNull()
  })
})
