// Captures real screens of the built app, read from Arc mainnet. Nothing is drawn or
// edited by hand.
//   public/captures/desk.png    the demo desk, for the README
//   public/screens/draw.png     the desk's "Available to draw" panel
//   public/screens/settle.png   the newest payout's receipt
//   public/screens/repay.png    the tide line of every draw and repay
//   public/screens/proof.png    the mainnet proof headline and its four figures
// Usage: next start -p 3000 &  then  CHROMIUM_PATH=/path/to/chromium npx tsx scripts/capture.mts [baseUrl]
import { mkdirSync } from 'node:fs'
import { chromium, type Page } from 'playwright-core'
import { DEMO_DESK_ADDRESS } from '../src/lib/chain'

const base = process.argv[2] ?? 'http://localhost:3000'
const WIDTH = 1280

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 })
mkdirSync('public/screens', { recursive: true })

/** Screenshots the box around one or more elements, on a transparent background. */
async function shoot(p: Page, selectors: string[], path: string, pad = 2) {
  const boxes = await Promise.all(
    selectors.map((s) =>
      p.locator(s).first().evaluate((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, r: r.right + window.scrollX, b: r.bottom + window.scrollY }
      }),
    ),
  )
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad)
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad)
  const r = Math.max(...boxes.map((b) => b.r)) + pad
  const b = Math.max(...boxes.map((b) => b.b)) + pad
  // The page behind the panel is made transparent, so rounded corners sit cleanly on
  // whatever surface shows the screen.
  const style = await p.addStyleTag({ content: 'html, body, main, main > * { background: transparent !important; }' })
  await p.screenshot({ path, fullPage: true, omitBackground: true, clip: { x, y, width: r - x, height: b - y } })
  await style.evaluate((el) => (el as Element).remove())
  console.log('saved', path)
}

await page.goto(`${base}/view/${DEMO_DESK_ADDRESS}`, { waitUntil: 'networkidle' })
await page.waitForSelector('figure')

// From the top of the page to just under the tide line card.
const bottom = await page.locator('figure').evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)
await page.screenshot({
  path: 'public/captures/desk.png',
  fullPage: true,
  clip: { x: 0, y: 0, width: WIDTH, height: Math.ceil(bottom) + 56 },
})
console.log('saved public/captures/desk.png')

// The landing page shows these at about 640px wide, so they are taken at a tablet
// width where the panels stack and the text stays readable once scaled.
const screens = await browser.newPage({ viewport: { width: 820, height: 1000 }, deviceScaleFactor: 2 })
await screens.goto(`${base}/view/${DEMO_DESK_ADDRESS}`, { waitUntil: 'networkidle' })
await screens.waitForSelector('figure')
await shoot(screens, ['main section.card'], 'public/screens/draw.png')
await shoot(screens, ['main section.card:has(figure)'], 'public/screens/repay.png')

// The newest settlement with a payout has the first receipt link in the table.
const receipt = await screens.locator('a[href^="/receipt/"]').first().getAttribute('href')
if (!receipt) throw new Error('No receipt link on the demo desk.')
await screens.goto(`${base}${receipt}`, { waitUntil: 'networkidle' })
await shoot(screens, ['main p.eyebrow', 'main .card'], 'public/screens/settle.png', 12)

// The proof page's headline loan and its figures, once the entrance has played.
await screens.goto(`${base}/proof`, { waitUntil: 'networkidle' })
await screens.waitForTimeout(1500)
// Its explorer buttons would read as clickable inside a still image, so they are left out.
await screens.addStyleTag({ content: 'main h1 + p + div { display: none !important; }' })
await shoot(screens, ['main h1', 'main dl'], 'public/screens/proof.png', 12)

await browser.close()
