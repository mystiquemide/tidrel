import { describe, expect, it } from 'vitest'
import type { Desk } from '../src/lib/desk'
import { deskNotices } from '../src/lib/notices'
import { addWallet, type WalletOption } from '../src/lib/wallets'

const A = '0x1111111111111111111111111111111111111111' as const

const position = (over: Record<string, unknown> = {}) =>
  ({
    wallet: A, loanId: null, dataStatus: null, collateralCirBtc: '0', debtUsdc: '0',
    accruedInterestUsdc: '0', healthFactor: null, band: null, liquidationPriceUsd: null,
    borrowApy: 0.01, lineUsdc: '0', walletUsdc: '5', walletCirBtc: '0',
    marketLiquidityUsdc: '100', blockNumber: 1n, refreshedAt: 0, ...over,
  }) as never

const desk = (over: { position?: unknown; collateral?: string; settlements?: unknown[] } = {}): Desk => ({
  ok: true,
  address: A,
  position: over.position === undefined ? position() : (over.position as never),
  collateralCirBtc: over.collateral ?? '0',
  settlements: (over.settlements ?? []) as never,
  truncated: false,
  blockNumber: 1n,
})

describe('deskNotices', () => {
  it('tells a wallet with no cirBTC and no loan what Tidrel borrows against', () => {
    const n = deskNotices(desk())
    expect(n).toHaveLength(1)
    expect(n[0].text).toBe('This wallet holds no cirBTC. Tidrel borrows against cirBTC.')
    expect(n[0].link?.href).toContain('circle.com/cirbtc')
  })
  it('says a wallet holding cirBTC with no history has no loan yet', () => {
    const n = deskNotices(desk({ position: position({ walletCirBtc: '0.001' }) }))
    expect(n[0].text).toContain('No loan yet')
    expect(n[0].text).toContain('posts the cirBTC it needs automatically')
  })
  it('stays quiet for a wallet with history and no problems', () => {
    expect(deskNotices(desk({ collateral: '0.00001', settlements: [{ state: 'repaid' }] }))).toEqual([])
  })
  it('warns on a risky band and goes red when urgent', () => {
    const warn = deskNotices(desk({ position: position({ debtUsdc: '1.2', band: 'WARN', healthFactor: 1.3, liquidationPriceUsd: '71000' }), collateral: '0.1' }))
    expect(warn[0]).toMatchObject({ tone: 'warn', text: 'Health 1.30. Liquidation near $71000.' })
    const urgent = deskNotices(desk({ position: position({ debtUsdc: '1.2', band: 'URGENT', healthFactor: 1.1 }), collateral: '0.1' }))
    expect(urgent[0].tone).toBe('urgent')
  })
  it('reports a draw whose payout never went out', () => {
    const n = deskNotices(desk({ position: position({ debtUsdc: '1.2' }), collateral: '0.1', settlements: [{ state: 'drawn-not-settled', drawnUsdc: '1.2' }] }))
    expect(n.map((x) => x.text)).toContain('1.20 USDC drawn, payout not sent.')
  })
  it('says nothing when the chain read failed or the Borrow service is down', () => {
    expect(deskNotices({ ok: false, address: A, reason: 'chain' })).toEqual([])
    expect(deskNotices(desk({ position: null }))).toEqual([])
  })
})

describe('addWallet', () => {
  const ann = (rdns: string, name: string, uuid = rdns) => ({
    info: { uuid, name, icon: 'data:,', rdns },
    provider: {} as never,
  })
  it('keeps one entry per wallet and sorts by name', () => {
    let list: WalletOption[] = []
    list = addWallet(list, ann('io.rabby', 'Rabby'))
    list = addWallet(list, ann('io.metamask', 'MetaMask'))
    list = addWallet(list, ann('io.rabby', 'Rabby', 'second'))
    expect(list.map((w) => w.name)).toEqual(['MetaMask', 'Rabby'])
    expect(list.find((w) => w.rdns === 'io.rabby')?.uuid).toBe('second')
  })
})
