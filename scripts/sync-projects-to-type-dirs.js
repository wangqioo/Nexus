#!/usr/bin/env node
/**
 * 按 Nexus 中的项目类型，将本地文件夹移动到对应类型目录
 * 类型目录与 electron/main.ts 中 PROJECT_TYPE_DIRS 一致
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.nexus')
const PROJECTS_FILE = path.join(DATA_DIR, 'local-projects.json')

const workshop = path.join(os.homedir(), 'Workshop')
const TYPE_DIRS = {
  mcu: path.join(workshop, 'MCU'),
  ai: path.join(workshop, 'AI'),
  software: path.join(workshop, 'Software'),
  linux: path.join(workshop, 'Linux'),
  mobile: path.join(workshop, 'Mobile'),
  remote: path.join(workshop, 'Remote'),
}

function main() {
  const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
  const projects = data.projects || []
  let moved = 0
  for (const p of projects) {
    const typeDir = TYPE_DIRS[p.projectType]
    if (!typeDir) continue
    const currentPath = p.path
    if (!currentPath || !fs.existsSync(currentPath)) continue
    const currentNorm = path.resolve(currentPath)
    const typeDirNorm = path.resolve(typeDir)
    if (currentNorm.startsWith(typeDirNorm + path.sep) || currentNorm === typeDirNorm) continue
    const folderName = path.basename(currentPath)
    if (!folderName) continue
    if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true })
    let targetPath = path.join(typeDir, folderName)
    if (fs.existsSync(targetPath) && path.resolve(targetPath) !== currentNorm) {
      let suffix = 1
      while (fs.existsSync(path.join(typeDir, `${folderName}-${suffix}`))) {
        suffix++
        if (suffix >= 100) break
      }
      targetPath = path.join(typeDir, `${folderName}-${suffix}`)
    }
    try {
      fs.renameSync(currentPath, targetPath)
      p.path = targetPath
      moved++
      console.log('OK:', folderName, '->', p.projectType.toUpperCase(), path.relative(typeDir, targetPath))
    } catch (err) {
      console.error('FAIL:', currentPath, err.message)
    }
  }
  if (moved > 0) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n已移动', moved, '个项目到对应类型目录，已更新', PROJECTS_FILE)
  } else {
    console.log('所有项目已在对应类型目录下，无需移动')
  }
}

main()
