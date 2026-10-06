import { AppKit } from '@circle-fin/app-kit'
import {
  createViemAdapterFromPrivateKey,
  createViemAdapterFromProvider,
} from '@circle-fin/adapter-viem-v2'
import { createPublicClient, http, type EIP1193Provider } from 'viem'
import { ARC_RPC_URL, arcChain } from './chain'

export const BORROW_CHAIN = 'Arc' as const

let kit: AppKit | null = null

export function getKit(): AppKit {
  kit ??= new AppKit()
  return kit
}

export const publicClient = createPublicClient({
  chain: arcChain,
  transport: http(ARC_RPC_URL),
})

export function browserAdapter(provider: EIP1193Provider) {
  return createViemAdapterFromProvider({
    provider,
    capabilities: { addressContext: 'user-controlled' },
  })
}

export function serverAdapter(privateKey: `0x${string}`) {
  return createViemAdapterFromPrivateKey({
    privateKey,
    getPublicClient: () => publicClient,
    capabilities: { addressContext: 'user-controlled' },
  })
}
