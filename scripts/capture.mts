// Captures the real desk for the README: a 2x screenshot of the demo desk read from
// Arc mainnet by the built app. Nothing is drawn or edited by hand.
// Usage: next start -p 3000 &  then  CHROMIUM_PATH=/path/to/chromium npx tsx scripts/capture.mts [baseUrl]
import { chromium } from 'playwright-core'
import { DEMO_DESK_ADDRESS } from '../src/lib/chain'

const base = process.argv[2] ?? 'http://localhost:3000'
const WIDTH = 1280

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 })
await page.goto(`${base}/view/${DEMO_DESK_ADDRESS}`, { waitUntil: 'networkidle' })
await page.waitForSelector('figure')

// From the top of the page to just under the tide line card.
const bottom = await page.locator('figure').evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)
await page.screenshot({
  path: 'public/captures/desk.png',
  fullPage: true,
  clip: { x: 0, y: 0, width: WIDTH, height: Math.ceil(bottom) + 56 },
})
await browser.close()
console.log('saved public/captures/desk.png')
