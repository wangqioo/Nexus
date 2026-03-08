#!/usr/bin/env node
/**
 * 在 electron-builder 完成后：对 .app 做 ad-hoc 签名，并用 hdiutil 重新打 DMG。
 * 解决未签名应用在 Apple Silicon 上「已损坏、无法打开」的问题。
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.join(__dirname, '..')
const releaseDir = path.join(root, 'release')
const macDir = path.join(releaseDir, 'mac-arm64')
const appPath = path.join(macDir, 'Nexus.app')
const pkg = require(path.join(root, 'package.json'))
const version = pkg.version
const dmgName = `Nexus-${version}-arm64.dmg`
const dmgPath = path.join(releaseDir, dmgName)

if (!fs.existsSync(appPath)) {
  console.error('未找到 Nexus.app，请先执行 npm run electron:build:mac')
  process.exit(1)
}

console.log('  • 对 Nexus.app 进行 ad-hoc 签名...')
execSync(`codesign -s - --force --deep "${appPath}"`, { stdio: 'inherit' })

console.log('  • 重新打包 DMG...')
if (fs.existsSync(dmgPath)) fs.unlinkSync(dmgPath)
execSync(
  `hdiutil create -volname "Nexus" -srcfolder "${appPath}" -ov -format UDZO "${dmgPath}"`,
  { stdio: 'inherit' }
)
console.log('  • 完成:', dmgPath)
