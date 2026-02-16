#!/usr/bin/env node
/**
 * 与 Nexus 层级一致：类型目录下仅一层，项目文件夹直接在类型目录下
 * 例如 MCU/ESP32-S3/xxx -> MCU/xxx，不再保留 ESP32-S3 等中间层
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.nexus')
const PROJECTS_FILE = path.join(DATA_DIR, 'local-projects.json')

const TYPE_DIRS = {
  mcu: '/Users/wq/Workshop/MCU',
  ai: '/Users/wq/Workshop/AI',
  software: '/Users/wq/Workshop/Software',
  linux: '/Users/wq/Workshop/Linux',
  mobile: '/Users/wq/Workshop/Mobile',
  remote: '/Users/wq/Workshop/Remote',
}

function main() {
  const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
  const projects = data.projects || []
  const usedPaths = new Set() // 已占用的 typeDir/folderName，避免重名冲突
  let moved = 0

  for (const p of projects) {
    const typeDir = TYPE_DIRS[p.projectType]
    if (!typeDir) continue
    const currentPath = p.path
    if (!currentPath || !fs.existsSync(currentPath)) continue

    const folderName = path.basename(currentPath)
    let targetPath = path.join(typeDir, folderName)
    const currentNorm = path.resolve(currentPath)
    const targetNorm = path.resolve(targetPath)

    if (currentNorm === targetNorm) continue

    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true })

    let skip = false
    if (fs.existsSync(targetPath) && targetNorm !== currentNorm) {
      let suffix = 1
      while (suffix < 100) {
        targetPath = path.join(typeDir, `${folderName}-${suffix}`)
        if (!fs.existsSync(targetPath) && !usedPaths.has(path.resolve(targetPath))) break
        suffix++
      }
      if (suffix >= 100) {
        console.error('SKIP (too many conflicts):', currentPath)
        skip = true
      }
    }
    if (skip) continue
    usedPaths.add(path.resolve(targetPath))

    try {
      fs.renameSync(currentPath, targetPath)
      p.path = targetPath
      moved++
      console.log('OK:', path.relative(typeDir, currentPath), '->', path.basename(targetPath))
    } catch (err) {
      console.error('FAIL:', currentPath, err.message)
    }
  }

  if (moved > 0) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n已扁平化', moved, '个项目到类型目录下一层，已更新', PROJECTS_FILE)
  } else {
    console.log('路径已与 Nexus 层级一致，无需移动')
  }
}

main()
