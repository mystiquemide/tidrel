/**
 * Published sources on settlement capital, quoted word for word with a link to each.
 * These are third-party statements, not chain figures, so they live here as cited data.
 */
export type Source = {
  quote: string
  publisher: string
  title: string
  href: string
}

export const SOURCES: Source[] = [
  {
    quote:
      'Institutional spot OTC volumes expanded +109% YoY, while top-20 CEXs grew just +9% YoY by year-end 2025.',
    publisher: 'Finery Markets',
    title: 'State of Crypto OTC 2026',
    href: 'https://finerymarkets.com/blog/state-of-crypto-otc-2026',
  },
  {
    quote:
      'Requiring full payment before each one would force it to keep enormous sums idle, pre-positioned across venues, just to be ready to trade.',
    publisher: 'Mintarex',
    title: 'Crypto OTC credit and financing',
    href: 'https://mintarex.com/en/blog/crypto-otc-credit-and-financing-for-institutions',
  },
  {
    quote:
      'For many BTC holders, selling is a blunt instrument that can reduce potential upside exposure, disrupt strategic treasury operations, create accounting complexity, or trigger taxable events.',
    publisher: 'Circle',
    title: 'How USDC and cirBTC unlock capital efficiency',
    href: 'https://www.circle.com/blog/how-usdc-and-cirbtc-unlock-capital-efficiency',
  },
  {
    quote: 'Stablecoin settlement via blockchain networks can complete in minutes',
    publisher: 'Fasset',
    title: 'OTC crypto settlement for treasury teams',
    href: 'https://fasset.com/blog/otc-crypto-settlement-for-treasury-teams/',
  },
]
