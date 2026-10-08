/** Terms of use and privacy policy, as data. Both describe what the app actually does. */

export type LegalSection = { title: string; paragraphs: string[]; items?: string[] }
export type LegalDoc = { title: string; intro: string; updated: string; sections: LegalSection[] }

const CONTACT = 'github.com/mystiquemide/tidrel/issues'

export const TERMS: LegalDoc = {
  title: 'Terms of use',
  intro:
    'These terms cover your use of Tidrel, a settlement tool for Arc mainnet at tidrel.midelabs.xyz. By connecting a wallet or using the app you agree to them. If you do not agree, do not use Tidrel.',
  updated: 'October 8, 2026',
  sections: [
    {
      title: 'What Tidrel is',
      paragraphs: [
        'Tidrel is software that reads your position on Arc mainnet and builds transactions for your own wallet to sign. It helps you draw USDC against cirBTC through Circle Borrow Kit and Morpho Blue, pay counterparties through the TidrelSettler contract, and repay.',
        'Tidrel is built and run by an individual builder, MystiqueMide. It is not a bank, broker, exchange, custodian or financial adviser.',
      ],
    },
    {
      title: 'You stay in control',
      paragraphs: [
        'Tidrel never holds your funds or your keys. Every transaction is signed by your wallet, and you can read and reject each one before it is sent. Once a transaction is confirmed on Arc it cannot be reversed by Tidrel or anyone else.',
      ],
    },
    {
      title: 'Risks you accept',
      paragraphs: ['Using Tidrel moves real assets on a public blockchain. You accept these risks:'],
      items: [
        'Liquidation. A loan against cirBTC can be liquidated if the price of bitcoin falls or the loan stays open too long. Tidrel refuses draws that start too close to the limit but cannot prevent a liquidation.',
        'Smart contract risk. TidrelSettler, Morpho Blue, Circle Borrow Kit, cirBTC and Multicall3From can contain bugs. TidrelSettler is unaudited.',
        'Third-party services. Quotes, draws and repays go through Circle’s Borrow service and public Arc RPC nodes, which can be slow, unavailable or wrong.',
        'Market and liquidity risk. A market can lack liquidity, rates can change and prices can move between a quote and a transaction.',
        'Network risk. Arc is operated by a permissioned validator set and can be disrupted, changed or halted.',
        'User error. Sending USDC to the wrong address, or reusing a wallet you do not control, cannot be undone.',
      ],
    },
    {
      title: 'No advice',
      paragraphs: [
        'Nothing in Tidrel is financial, legal, tax or investment advice. Figures shown are read from the chain or from third parties and may be out of date by the time you sign. Do your own checks.',
      ],
    },
    {
      title: 'Who may use it',
      paragraphs: [
        'You must be legally able to enter these terms and to use Tidrel where you live. You must not use it if you are subject to sanctions, if you are in a jurisdiction where its use is prohibited, or to move funds you do not have the right to move. You are responsible for any licences, reporting and taxes that apply to you.',
      ],
    },
    {
      title: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      items: [
        'use Tidrel for unlawful activity, money laundering or sanctions evasion;',
        'attack, overload or probe the site, its API routes or its infrastructure;',
        'misuse the read-only RPC proxy for traffic that has nothing to do with using Tidrel;',
        'put private or personal information in a trade reference, which is public on-chain forever.',
      ],
    },
    {
      title: 'Open source',
      paragraphs: [
        'The Tidrel code and the TidrelSettler contract are published under the MIT license at github.com/mystiquemide/tidrel. The license covers the code. The Tidrel name and logo are not licensed for use that suggests endorsement.',
      ],
    },
    {
      title: 'No warranty',
      paragraphs: [
        'Tidrel is provided as is and as available, without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, availability or non-infringement. It is early software and may contain errors.',
      ],
    },
    {
      title: 'Limit of liability',
      paragraphs: [
        'To the fullest extent the law allows, the builder is not liable for any loss arising from your use of Tidrel, including loss of funds, liquidation, failed or delayed transactions, third-party failures, or lost profits. Nothing in these terms limits liability that cannot be limited by law.',
      ],
    },
    {
      title: 'Changes and availability',
      paragraphs: [
        'Tidrel may change, pause or stop at any time, and these terms may be updated. The date above shows the latest version. Using Tidrel after a change means you accept it.',
      ],
    },
    {
      title: 'Contact',
      paragraphs: [`Questions or problems: open an issue at ${CONTACT}. Never post a seed phrase or private key there.`],
    },
  ],
}

export const PRIVACY: LegalDoc = {
  title: 'Privacy policy',
  intro:
    'Tidrel is built to collect as little as possible. There are no accounts, no sign-up and no analytics. This page says what still happens to data when you use the app.',
  updated: 'October 8, 2026',
  sections: [
    {
      title: 'What Tidrel does not collect',
      paragraphs: [
        'Tidrel does not ask for your name, email or phone number. It has no user accounts, no database of users, no advertising, no tracking pixels and no analytics scripts. It sets no cookies of its own.',
      ],
    },
    {
      title: 'What is public by design',
      paragraphs: [
        'Everything you do on Arc mainnet is public: your wallet address, your transactions, the trade references you write and the addresses you pay. Tidrel reads this public data to build your desk, and anyone can read it from the chain. Do not put private information in a trade reference.',
      ],
    },
    {
      title: 'What happens when you use the app',
      paragraphs: [],
      items: [
        'Your wallet address. When you connect a wallet, the address is used to read your position and history from Arc and from Circle’s Borrow service. Some reads run on Tidrel’s server on your behalf, so the address reaches that server for the length of the request. It is not stored by Tidrel.',
        'Chain reads. Your browser reads Arc through a same-site proxy on this domain, which forwards read-only requests to public Arc RPC nodes. Those node operators can see the request and your IP address, as with any RPC.',
        'Circle. Quotes, draws and repays go through Circle Borrow Kit and Circle’s Borrow service, which have their own privacy practices.',
        'Hosting. The site is hosted on Vercel and its domain is served through Cloudflare. They process standard request data such as IP address, user agent and timestamps to deliver the site and keep it secure, under their own policies.',
        'Your wallet. Your wallet software handles your keys. Tidrel never sees them.',
      ],
    },
    {
      title: 'What stays on your device',
      paragraphs: ['Tidrel uses your browser’s local storage for two conveniences. Neither is sent to Tidrel.'],
      items: [
        'The last wallet you connected, so the app can reconnect on your next visit.',
        'Counterparties you choose to save, so you can pick them again when you settle.',
      ],
    },
    {
      title: 'Your choices',
      paragraphs: [
        'You can clear this data any time by clearing site data in your browser, or by choosing Disconnect in the app. You can use the read-only desk views without connecting a wallet at all.',
      ],
    },
    {
      title: 'Sharing and sale',
      paragraphs: [
        'Tidrel does not sell or rent your data and does not share it for advertising. It is shared only with the service providers above, as needed to run the app, or where the law requires it.',
      ],
    },
    {
      title: 'Children',
      paragraphs: ['Tidrel is not meant for anyone under 18 and does not knowingly collect data from children.'],
    },
    {
      title: 'Changes',
      paragraphs: ['If this policy changes, the date above changes with it.'],
    },
    {
      title: 'Contact',
      paragraphs: [`Questions about privacy: open an issue at ${CONTACT}. Do not include a seed phrase or private key.`],
    },
  ],
}
