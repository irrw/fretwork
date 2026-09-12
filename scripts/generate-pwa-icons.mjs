import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BG = '#100E0B' // ebony, matches THEMES.dark.bg
const FG = '#C9973B' // brass, matches THEMES.dark.root

const rawMark = readFileSync(
  new URL('../src/assets/icons/fretwork-icon/fretwork-mark.svg', import.meta.url),
  'utf8'
)
const recoloredMark = rawMark.replace(/fill="black"/g, `fill="${FG}"`)

// Render the mark alone (transparent bg) at high resolution, then trim to its
// actual painted bounding box — the source viewBox is not centered on the
// mark's own geometry, so centering by viewBox alone leaves it lopsided.
const RENDER_SIZE = 1024
const markOnlySvg = recoloredMark.replace(
  /^<svg[^>]*>/,
  `<svg width="${RENDER_SIZE}" height="${RENDER_SIZE}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">`
)
const trimmedMark = await sharp(Buffer.from(markOnlySvg)).trim().png().toBuffer()

async function buildIcon({ size, contentScale, outFile }) {
  const box = Math.round(size * contentScale)
  const fitted = await sharp(trimmedMark)
    .resize(box, box, { fit: 'inside' })
    .toBuffer({ resolveWithObject: true })

  const left = Math.round((size - fitted.info.width) / 2)
  const top = Math.round((size - fitted.info.height) / 2)

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: fitted.data, left, top }])
    .png()
    .toFile(outFile)
}

const outDir = fileURLToPath(new URL('../public/icons/', import.meta.url))
mkdirSync(outDir, { recursive: true })

await buildIcon({ size: 192, contentScale: 0.7, outFile: `${outDir}icon-192.png` })
await buildIcon({ size: 512, contentScale: 0.7, outFile: `${outDir}icon-512.png` })
await buildIcon({ size: 512, contentScale: 0.55, outFile: `${outDir}icon-512-maskable.png` }) // Android adaptive-icon safe zone
await buildIcon({ size: 180, contentScale: 0.7, outFile: `${outDir}apple-touch-icon.png` })

console.log('Generated PWA icons in public/icons/')
