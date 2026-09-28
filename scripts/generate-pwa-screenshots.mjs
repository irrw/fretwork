import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const targetUrl = process.env.SCREENSHOT_URL ?? 'http://localhost:4173/'
const outDir = fileURLToPath(new URL('../public/screenshots/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const shots = [
  { file: 'wide.png', width: 1280, height: 800, formFactor: 'wide' },
  { file: 'narrow.png', width: 390, height: 844, formFactor: 'narrow' },
]

const browser = await chromium.launch()
for (const { file, width, height, formFactor } of shots) {
  const page = await browser.newPage({ viewport: { width, height } })
  // Suppress the first-run "tap a fret" onboarding tooltip so it doesn't appear in store screenshots.
  await page.addInitScript(() => {
    localStorage.setItem('fretwork.prefs.v1', JSON.stringify({ dontShowFretTip: true }))
  })
  await page.goto(targetUrl, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${outDir}${file}` })
  await page.close()
  console.log(`Captured ${formFactor} screenshot (${width}x${height}) -> public/screenshots/${file}`)
}
await browser.close()
