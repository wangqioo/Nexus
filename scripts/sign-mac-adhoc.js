#!/usr/bin/env node
/**
 * electron-builder afterPack：在 Mac 打包后对 .app 做 ad-hoc 签名，
 * 避免在 Apple Silicon 上出现「已损坏、无法打开」且无法在系统设置里放行的问题。
 */
const { execSync } = require('child_process')
exports.default = function (context) {
  if (context.electronPlatformName !== 'darwin') return
  const appPath = context.appDir
  if (!appPath) return
  try {
    execSync(`codesign -s - --force --deep "${appPath}"`, { stdio: 'inherit' })
    console.log('  • ad-hoc 签名已应用:', appPath)
  } catch (e) {
    console.warn('  • ad-hoc 签名跳过（可能不影响安装）:', e.message)
  }
}
