import { ADDRESSES, ARC_CHAIN_ID, explorerAddress } from './chain'
import { GAS_RESERVE_USDC, MIN_HEALTH } from './settle'
import { MAX_REFERENCE_BYTES } from './settler'

/** The documentation, as data, so the page, the sidebar and the tests read one source. */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'note'; title: string; text: string }
  | { type: 'code'; label?: string; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'links'; items: { label: string; href: string }[] }

export type DocSection = { id: string; title: string; summary: string; blocks: Block[] }

const health = MIN_HEALTH.toFixed(2)
const REPO = 'https://github.com/mystiquemide/tidrel'

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    summary: 'What Tidrel is, who it is for and what it does not do.',
    blocks: [
      {
        type: 'p',
        text: 'Tidrel is a settlement desk on Arc mainnet. A desk that trades bitcoin for USDC posts cirBTC once. When a trade settles, Tidrel draws only the USDC that trade needs from a lending market, pays every counterparty in one transaction, and records the trade reference on-chain. When USDC comes back, one repay closes the loan. The cirBTC stays posted for the next trade.',
      },
      {
        type: 'p',
        text: 'The point is time. A desk that prefunds USDC, sells its bitcoin or leans on a broker credit line ties up capital for longer than a trade needs it. With Tidrel the loan lasts about as long as the settlement does.',
      },
      {
        type: 'h3',
        text: 'What Tidrel is',
      },
      {
        type: 'ul',
        items: [
          'A web app at tidrel.midelabs.xyz that reads your position from Arc mainnet and builds each transaction for your wallet to sign.',
          'A small settlement contract, TidrelSettler, that pays up to fifty counterparties in one transaction and records a trade reference that can be used once.',
          'A public proof page and read-only desk views, so anyone can check what happened without a wallet.',
        ],
      },
      {
        type: 'h3',
        text: 'What Tidrel is not',
      },
      {
        type: 'ul',
        items: [
          'Not a custodian. Tidrel never holds your funds or keys. Your wallet signs every step.',
          'Not a lender. Loans come from Morpho Blue through Circle Borrow Kit. Tidrel sizes the draw and refuses unsafe ones.',
          'Not an account service. There is no sign-up, no password and no database of users.',
          'Not audited. The contract source is public and verified, but it has not had a third-party audit.',
        ],
      },
    ],
  },
  {
    id: 'quickstart',
    title: 'Quickstart',
    summary: 'From a new wallet to a first settlement.',
    blocks: [
      { type: 'h3', text: 'You need' },
      {
        type: 'ul',
        items: [
          `A regular wallet (an externally owned account, such as MetaMask or Rabby) on Arc mainnet, chain ID ${ARC_CHAIN_ID}. Smart-contract accounts are refused.`,
          'Some cirBTC. This is your collateral. A swap from USDC to cirBTC through Circle App Kit is the simplest way to get it.',
          'A few USDC for network fees. Gas on Arc is paid in USDC, so a wallet with no USDC cannot send anything.',
          'The wallets of the people you will pay, and the amount each one gets.',
        ],
      },
      { type: 'h3', text: 'Steps' },
      {
        type: 'ol',
        items: [
          'Open the desk and choose Connect wallet. Pick your wallet. If it is on another network, Tidrel asks it to switch to Arc.',
          'Read your desk. Available to draw shows how much USDC you could borrow right now at the safety floor. Loan health shows once a draw is open.',
          'Choose Settle a trade. Give it a reference, add who you are paying and how much, and read the cost box.',
          'Confirm. Your wallet asks twice if a draw is needed: once to draw, once to pay everyone. If your wallet already holds enough USDC, there is no draw and only one prompt.',
          'When USDC comes back, choose Repay and confirm once.',
        ],
      },
      {
        type: 'note',
        title: 'Try it without a wallet',
        text: 'Open the demo desk to see a real desk read from Arc mainnet. It is read-only and shows the real history, the tide line and every receipt.',
      },
      {
        type: 'links',
        items: [
          { label: 'Open the desk', href: '/desk' },
          { label: 'See the demo desk', href: `/view/${'0x100E8AF5Ba507641Bb87c7D3229B8d458b78ca04'}` },
        ],
      },
    ],
  },
  {
    id: 'concepts',
    title: 'Core concepts',
    summary: 'The words the desk uses.',
    blocks: [
      {
        type: 'table',
        head: ['Term', 'Meaning'],
        rows: [
          ['Desk', 'Your wallet as Tidrel shows it: collateral, loan, history. One wallet is one desk.'],
          ['Collateral', 'cirBTC posted to the lending market. It backs every draw. It stays posted after you repay.'],
          ['Available to draw', 'The most USDC you could borrow now while keeping loan health at or above the floor.'],
          ['Draw', 'A borrow of USDC, sized to what a trade needs.'],
          ['Settle', 'One transaction that pays every counterparty from your wallet.'],
          ['Repay', 'Paying the loan back. The collateral stays posted.'],
          ['Loan health', `A ratio of collateral value to debt. Tidrel refuses any draw that would take it below ${health}.`],
          ['Trade reference', 'A short label you choose for a trade. It is written on-chain and can be used once per wallet.'],
          ['Tide line', 'A chart of your USDC borrowed over time. It rises at each draw and falls at each repay.'],
        ],
      },
    ],
  },
  {
    id: 'settling',
    title: 'Settling a trade',
    summary: 'The settle sheet, field by field.',
    blocks: [
      { type: 'h3', text: 'Reference' },
      {
        type: 'p',
        text: `A label for the trade, up to ${MAX_REFERENCE_BYTES} characters. It is public on Arc mainnet, so keep anything private out of it. A reference can be used once per wallet. The contract rejects a repeat, even from another browser or device, and Tidrel checks your history first so you find out before you sign.`,
      },
      { type: 'h3', text: 'Who are you paying' },
      {
        type: 'p',
        text: 'Each row is one counterparty: their wallet address on Arc and the amount of USDC they receive. This is the wallet of the person or company being paid, not your own. Paying your own wallet is allowed but Tidrel warns you, because it is usually a mistake.',
      },
      {
        type: 'p',
        text: 'To add many recipients at once, choose Paste a list and paste one recipient per line: an address, then an amount, separated by a comma, tab, semicolon or space. A header line is skipped. Saved counterparties on this device appear as suggestions.',
      },
      {
        type: 'code',
        label: 'Example list',
        text: '0xAbC0000000000000000000000000000000000001, 1.50\n0xAbC0000000000000000000000000000000000002, 0.75\n0xAbC0000000000000000000000000000000000003, 2.00',
      },
      { type: 'h3', text: 'The cost box' },
      {
        type: 'p',
        text: 'Before anything is signed, Tidrel shows what will happen. It reads your position and the market, then lays out:',
      },
      {
        type: 'ul',
        items: [
          'What your wallet pays out to the counterparties.',
          'What Tidrel draws, if your wallet does not already hold enough USDC.',
          'The cirBTC the draw posts as collateral, if any is needed.',
          'What stays in your wallet.',
          'Loan health after the draw.',
        ],
      },
      {
        type: 'p',
        text: `A draw covers the shortfall plus a gas reserve of ${GAS_RESERVE_USDC} USDC that stays in your wallet. Arc charges gas in USDC, and without the reserve the draw's own fee would leave the payout short.`,
      },
      { type: 'h3', text: 'What you sign' },
      {
        type: 'ol',
        items: [
          'Check the reference and the position. Nothing is sent.',
          'Draw. Circle Borrow Kit opens or tops up the loan and posts collateral. Your wallet asks once.',
          'Pay. One batch approves the exact total and calls TidrelSettler, which pays everyone and records the reference. Your wallet asks once.',
        ],
      },
      {
        type: 'p',
        text: 'The batch goes through Arc’s Multicall3From, which keeps your wallet as the sender. All payments land or none do.',
      },
      {
        type: 'note',
        title: 'If the draw lands but the payout does not',
        text: 'Your history marks the row as drawn, not settled and the desk offers Retry payout and Repay now. Retrying never draws twice. If you prefer to unwind, repay.',
      },
    ],
  },
  {
    id: 'repaying',
    title: 'Repaying',
    summary: 'Closing the loan, in full or in part.',
    blocks: [
      {
        type: 'p',
        text: 'Choose Repay on the desk. Leave the amount empty to repay the smaller of your wallet USDC and the debt, or enter an amount. Tidrel caps it at the debt, because the lending service rejects a repay above it. One signature repays.',
      },
      {
        type: 'p',
        text: 'Interest accrues by the block. Because Tidrel loans are short, it is usually a fraction of a cent. The done screen shows how long the loan stayed open and what it cost, and the same figures appear in your history.',
      },
      {
        type: 'p',
        text: 'While a loan is open and USDC arrives in your wallet, the desk offers to repay it. You stay in control: nothing is sent unless you confirm.',
      },
    ],
  },
  {
    id: 'collateral',
    title: 'Managing collateral',
    summary: 'Adding or withdrawing cirBTC.',
    blocks: [
      {
        type: 'p',
        text: 'Choose Collateral on the desk to add cirBTC or withdraw what is posted. With an open loan, Tidrel uses Circle Borrow Kit. With no loan, it moves cirBTC directly against the Morpho Blue market.',
      },
      {
        type: 'ul',
        items: [
          `A withdrawal that would take loan health below ${health} is refused.`,
          'If a withdrawal needs a repay first, Tidrel says how much and refuses when your wallet lacks the USDC.',
          'Adding collateral raises health and is never refused for health.',
        ],
      },
    ],
  },
  {
    id: 'history',
    title: 'History, receipts and export',
    summary: 'Every settlement is on-chain and readable.',
    blocks: [
      {
        type: 'p',
        text: 'Each desk page lists settlements with the draw, the payout and the repay, how long the loan was open and its cost. Every row links to the transaction on the Arc explorer.',
      },
      {
        type: 'p',
        text: 'A receipt is a page for one payout, at /receipt/ followed by the payout transaction hash. It is rebuilt from the contract’s Settled and Leg events, so it needs no database: the chain is the record. Share the link with a counterparty as proof of payment.',
      },
      {
        type: 'p',
        text: 'Export CSV downloads your settlements with these columns: reference, counterparties, drawn_usdc, open_seconds, interest_usdc, state, draw_tx, payout_tx, repay_tx.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety model',
    summary: 'What the code enforces, and what it cannot.',
    blocks: [
      {
        type: 'ul',
        items: [
          `Draws stop before they get risky. Any draw that would take health below ${health} is refused, and Tidrel checks again right before you sign.`,
          'A draw never exceeds the market’s available liquidity, which is read live.',
          'Payouts land together or not at all.',
          'A trade reference can be used once per wallet, enforced by the contract.',
          'Regular wallets only. Smart-contract accounts are refused up front.',
          'Your wallet signs every step. Tidrel has no custody and no server that can move money.',
        ],
      },
      {
        type: 'p',
        text: 'What Tidrel cannot do: it cannot make a market lend, it cannot stop a liquidation if the price of bitcoin falls and you leave a loan open, and it cannot undo a payment once it lands.',
      },
      {
        type: 'links',
        items: [{ label: 'Safety rules', href: '/safety' }],
      },
    ],
  },
  {
    id: 'architecture',
    title: 'How it works',
    summary: 'The pieces and how a settlement moves through them.',
    blocks: [
      {
        type: 'table',
        head: ['Piece', 'Role'],
        rows: [
          ['Your wallet', 'Holds the collateral and the USDC. Signs every transaction.'],
          ['Circle Borrow Kit', 'Quotes, opens and repays the loan against cirBTC.'],
          ['Morpho Blue', 'The cirBTC and USDC market the loan lives in.'],
          ['Multicall3From', 'Sends approve and settle as one batch that keeps your wallet as sender.'],
          ['TidrelSettler', 'Pays every counterparty and records the reference.'],
          ['Arc RPC', 'Reads. The browser reads through a same-site proxy, so a blocked node cannot stop a draw.'],
        ],
      },
      {
        type: 'ol',
        items: [
          'Tidrel reads your position and the market, and sizes the draw to the shortfall.',
          'Borrow Kit opens or tops up the loan on Morpho Blue. USDC arrives in your wallet.',
          'One batch from your wallet approves the exact total and calls settle on TidrelSettler.',
          'TidrelSettler pulls USDC from your wallet to each counterparty and emits Settled and Leg events.',
          'Later, one repay through Borrow Kit closes the loan. The collateral stays posted.',
        ],
      },
    ],
  },
  {
    id: 'contracts',
    title: 'Contract reference',
    summary: 'TidrelSettler and the addresses Tidrel touches.',
    blocks: [
      {
        type: 'p',
        text: 'TidrelSettler has no owner, no fee, no upgrade path and no admin function. It holds no funds. It moves USDC from the caller to each recipient using the caller’s allowance, so nothing stays in the contract. The source is public and verified on Sourcify as an exact match.',
      },
      { type: 'h3', text: 'Function' },
      {
        type: 'code',
        text: 'function settle(\n  bytes32 ref,\n  address[] calldata recipients,\n  uint256[] calldata amounts\n) external',
      },
      {
        type: 'ul',
        items: [
          'Pays amounts[i] of USDC to recipients[i] from the caller, all or nothing.',
          'ref cannot be zero and cannot repeat for the same caller.',
          'Between one and fifty payouts per call. Zero addresses and zero amounts are rejected.',
          'State is written before any transfer.',
          'Reads: usdc(), MAX_LEGS(), settled(payer, ref).',
        ],
      },
      { type: 'h3', text: 'Events' },
      {
        type: 'code',
        text: 'event Settled(address indexed payer, bytes32 indexed ref, uint256 total, uint256 legs)\nevent Leg(address indexed payer, bytes32 indexed ref, address indexed to, uint256 amount)',
      },
      { type: 'h3', text: 'Errors' },
      {
        type: 'table',
        head: ['Error', 'Raised when'],
        rows: [
          ['EmptyReference', 'ref is zero.'],
          ['ReferenceUsed(payer, ref)', 'The caller already settled this reference.'],
          ['LengthMismatch', 'Recipients and amounts differ in length.'],
          ['NoLegs', 'No recipients.'],
          ['TooManyLegs(legs)', 'More than fifty recipients.'],
          ['ZeroRecipient(index)', 'A recipient is the zero address.'],
          ['ZeroAmount(index)', 'An amount is zero.'],
          ['TransferFailed(index)', 'A USDC transfer failed or returned false.'],
        ],
      },
      { type: 'h3', text: `Addresses, Arc mainnet (chain ID ${ARC_CHAIN_ID})` },
      {
        type: 'table',
        head: ['Name', 'Address'],
        rows: [
          ['TidrelSettler', ADDRESSES.settler],
          ['USDC', ADDRESSES.usdc],
          ['cirBTC', ADDRESSES.cirBtc],
          ['Morpho Blue', ADDRESSES.morpho],
          ['Multicall3From', ADDRESSES.multicall3From],
          ['Memo', ADDRESSES.memo],
        ],
      },
      {
        type: 'links',
        items: [
          { label: 'TidrelSettler on the explorer', href: explorerAddress(ADDRESSES.settler) },
          { label: 'Verified source on Sourcify', href: `https://repo.sourcify.dev/${ARC_CHAIN_ID}/${ADDRESSES.settler}` },
          { label: 'Source on GitHub', href: `${REPO}/blob/main/contracts/src/TidrelSettler.sol` },
        ],
      },
    ],
  },
  {
    id: 'verify',
    title: 'Verify on-chain',
    summary: 'Check a settlement without trusting Tidrel.',
    blocks: [
      {
        type: 'p',
        text: 'Everything Tidrel shows is read from Arc mainnet. To check a settlement yourself:',
      },
      {
        type: 'ol',
        items: [
          'Open the payout transaction on the explorer from the proof page or a receipt.',
          'Find the Settled event from TidrelSettler. Its indexed fields are the payer and the reference, and its data holds the total and the number of payouts.',
          'Find one Leg event per payout, each with the recipient and the amount, and the USDC Transfer events that match them.',
          'For the loan, find the Borrow and Repay events from Morpho Blue for the same wallet. The time between them is how long the loan was open.',
        ],
      },
      {
        type: 'p',
        text: 'The proof page lists every demo cycle with its draw, payout and repay, so you can walk through a real one.',
      },
      {
        type: 'links',
        items: [{ label: 'Mainnet proof', href: '/proof' }],
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'What each message means and what to do.',
    blocks: [
      {
        type: 'table',
        head: ['What you see', 'What it means', 'What to do'],
        rows: [
          [
            'Your position did not load from Arc mainnet',
            'Tidrel could not read your position from the chain or from Circle.',
            'Wait a moment and retry. If it persists, reload the page.',
          ],
          [
            'Circle’s Borrow service is still holding your earlier attempt',
            'A cancelled or failed attempt to open a loan stays live at Circle for a while and blocks a second open.',
            'Wait until the time shown. Nothing was sent.',
          ],
          [
            'Could not check your wallet against the Arc network',
            'The page could not reach Arc, usually because of a blocker or the connection.',
            'Reload, turn off ad or tracker blockers for this site and retry.',
          ],
          [
            'This reference was already used',
            'You already settled that reference from this wallet.',
            'Choose a new reference.',
          ],
          [
            `Health would fall below ${health}`,
            'The draw would leave the loan too close to liquidation.',
            'Lower the amount, add collateral or repay first.',
          ],
          [
            'Smart accounts are not supported',
            'The connected wallet is a contract account.',
            'Use a regular wallet (EOA).',
          ],
          [
            'Not enough USDC for fees',
            'Gas on Arc is paid in USDC and the wallet has too little.',
            'Add a small amount of USDC and retry.',
          ],
          [
            'Drawn, not settled',
            'The draw landed but the payout did not.',
            'Use Retry payout, or Repay now to unwind.',
          ],
          [
            'You cancelled in your wallet',
            'The prompt was rejected. Nothing was sent.',
            'Try again. Circle may ask you to wait a few minutes first.',
          ],
        ],
      },
      {
        type: 'p',
        text: 'If something else goes wrong, open an issue on GitHub with the message you saw. Never share a seed phrase or private key with anyone.',
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    summary: 'Short answers.',
    blocks: [
      { type: 'h3', text: 'Who holds my collateral?' },
      { type: 'p', text: 'It is posted to the Morpho Blue market through Circle Borrow Kit, against your wallet. Tidrel never holds it, and you can withdraw it when no loan needs it.' },
      { type: 'h3', text: 'Can a loan be liquidated?' },
      { type: 'p', text: 'Yes. Like any collateralised loan, a fall in the price of bitcoin can push health to the liquidation level if a loan stays open. Tidrel is built for loans that last minutes, and refuses draws that start too close to the limit. Repay promptly.' },
      { type: 'h3', text: 'What does it cost?' },
      { type: 'p', text: 'Interest on the loan while it is open, and the network fee for each transaction, paid in USDC. Tidrel itself takes no fee today.' },
      { type: 'h3', text: 'Why a regular wallet only?' },
      { type: 'p', text: 'The settlement batch needs your wallet to be the sender. Smart-contract accounts cannot do that here, so Tidrel refuses them before you sign.' },
      { type: 'h3', text: 'Is it audited?' },
      { type: 'p', text: 'No. The contract is small, has no admin powers and its source is verified, but it has not been audited. Use amounts you are comfortable with.' },
      { type: 'h3', text: 'Is this live on mainnet?' },
      { type: 'p', text: 'Yes. It runs on Arc mainnet and moves real USDC. The demo run was small, so treat it as an early product.' },
      { type: 'h3', text: 'Where is the code?' },
      { type: 'p', text: 'It is open source under the MIT license.' },
      { type: 'links', items: [{ label: 'GitHub', href: REPO }] },
    ],
  },
  {
    id: 'limits',
    title: 'Limits and status',
    summary: 'Where Tidrel is today.',
    blocks: [
      {
        type: 'ul',
        items: [
          'The mainnet run is small, sized to a five USDC budget, and its counterparties are wallets controlled by the builder. The same code path runs at any size, but it has not run at size.',
          'Quotes, draws and repays go through Circle’s Borrow service. When it is unreachable, Tidrel shows chain data only and disables draws.',
          'A settlement is two transactions, the draw and then the payout. A failure in between is handled and shown, but it can happen.',
          'TidrelSettler is unaudited.',
        ],
      },
      {
        type: 'p',
        text: 'Next is a pilot with a few OTC desks, to learn real settlement sizes and timing before changing anything.',
      },
      {
        type: 'links',
        items: [
          { label: 'Terms of use', href: '/terms' },
          { label: 'Privacy policy', href: '/privacy' },
        ],
      },
    ],
  },
]
