#!/usr/bin/env node
/**
 * 磁盘已扁平化，但 JSON 仍是旧路径。根据类型目录下实际存在的文件夹，把 JSON 里的 path 改对。
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

  // 按类型分组，同类型内按「当前 path 的 basename」分组，保持 JSON 顺序
  const byType = {}
  projects.forEach((p, index) => {
    const t = p.projectType
    if (!TYPE_DIRS[t]) return
    if (!byType[t]) byType[t] = []
    byType[t].push({ project: p, base: path.basename(p.path), index })
  })

  const assigned = new Set() // path.resolve 已分配出去的路径
  let updated = 0

  Object.entries(byType).forEach(([type, list]) => {
    const typeDir = TYPE_DIRS[type]
    if (!fs.existsSync(typeDir)) return
    const dirs = fs.readdirSync(typeDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    list.forEach(({ project, base }) => {
      const candidates = [base]
      for (let i = 1; i < 100; i++) candidates.push(`${base}-${i}`)
      for (const name of candidates) {
        const targetPath = path.join(typeDir, name)
        const targetNorm = path.resolve(targetPath)
        if (!dirs.includes(name)) continue
        if (assigned.has(targetNorm)) continue
        assigned.add(targetNorm)
        if (project.path !== targetPath) {
          project.path = targetPath
          updated++
          console.log('OK:', project.name || base, '->', targetPath)
        }
        break
      }
    })
  })

  if (updated > 0) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n已更新', updated, '条 path，已保存', PROJECTS_FILE)
  } else {
    console.log('path 已正确，无需更新')
  }
}

main()
