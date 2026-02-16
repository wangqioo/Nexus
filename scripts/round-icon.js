#!/usr/bin/env node
/**
 * 给 PNG 图标加上圆角（macOS 风格，约 22% 圆角），用于生成 .icns 前的处理
 * 用法: node scripts/round-icon.js <输入.png> [输出.png]
 * 若不传输出路径则覆盖输入文件
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const inputPath = process.argv[2]
const outputPath = process.argv[3] || inputPath

if (!inputPath) {
  console.error('用法: node scripts/round-icon.js <输入.png> [输出.png]')
  process.exit(1)
}

async function main() {
  const meta = await sharp(inputPath).metadata()
  const w = meta.width || 512
  const h = meta.height || 512
  const r = Math.round(Math.min(w, h) * 0.22)

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="white"/>
</svg>
`.trim()

  const rounded = await sharp(inputPath)
    .ensureAlpha()
    .composite([{
      input: Buffer.from(svg),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer()

  fs.writeFileSync(outputPath, rounded)
  console.log('Rounded:', outputPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
