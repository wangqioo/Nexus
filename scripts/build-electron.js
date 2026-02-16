const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 编译 TypeScript
console.log('Compiling Electron TypeScript...')

const electronDir = path.join(__dirname, '../electron')
const outDir = path.join(__dirname, '../dist-electron')

// 确保输出目录存在
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

// 复制模板目录（模板即唯一真相，供种子与回退使用）
const templatesDefault = path.join(electronDir, 'templates-default')
const templatesOut = path.join(outDir, 'templates-default')
if (fs.existsSync(templatesDefault)) {
  fs.cpSync(templatesDefault, templatesOut, { recursive: true })
  console.log('Copied electron/templates-default -> dist-electron/templates-default')
}

// 使用 esbuild 编译 Electron 代码 (更快)
try {
  execSync('npx esbuild electron/main.ts electron/preload.ts --outdir=dist-electron --platform=node --format=cjs --bundle --external:electron', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  })
  console.log('Electron build complete!')
} catch (error) {
  console.error('Build failed:', error)
  process.exit(1)
}
