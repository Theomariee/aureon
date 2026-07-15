// Rasterises build/icon.svg into PNGs and packs a multi-resolution build/icon.ico.
// Uses sharp (native SVG rasteriser) — no browser required.
// Run with:  node scripts/make-icons.cjs
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default || require('png-to-ico')

const BUILD = path.join(__dirname, '..', 'build')
const svg = fs.readFileSync(path.join(BUILD, 'icon.svg'))

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
const PNG_SIZES = [256, 512, 1024]

async function main() {
  const icoPaths = []
  for (const s of ICO_SIZES) {
    const p = path.join(BUILD, `icon-${s}.png`)
    await sharp(svg, { density: 384 }).resize(s, s).png().toFile(p)
    icoPaths.push(p)
  }
  for (const s of PNG_SIZES) {
    const p = path.join(BUILD, `icon-${s}.png`)
    await sharp(svg, { density: 384 }).resize(s, s).png().toFile(p)
    if (s === 512) fs.copyFileSync(p, path.join(BUILD, 'icon.png'))
  }
  const ico = await pngToIco(icoPaths)
  fs.writeFileSync(path.join(BUILD, 'icon.ico'), ico)
  console.log('OK — build/icon.ico + PNGs générés')
}

main().catch((err) => {
  console.error('ERREUR:', err)
  process.exit(1)
})
