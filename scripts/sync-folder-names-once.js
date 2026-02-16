#!/usr/bin/env node
/**
 * 一次性同步：将 Workshop 中的项目文件夹重命名为 Nexus 中的项目名称
 * 读取 ~/.nexus/local-projects.json，按项目名重命名文件夹并写回
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.nexus')
const PROJECTS_FILE = path.join(DATA_DIR, 'local-projects.json')

function sanitizeFolderName(name) {
  return (name || '')
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'project'
}

function main() {
  if (!fs.existsSync(PROJECTS_FILE)) {
    console.error('未找到', PROJECTS_FILE)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'))
  const projects = data.projects || []
  let updated = 0
  for (const p of projects) {
    const currentPath = p.path
    if (!currentPath || !fs.existsSync(currentPath)) continue
    const parentDir = path.dirname(currentPath)
    const currentFolderName = path.basename(currentPath)
    const targetFolderName = sanitizeFolderName(p.name || '')
    if (currentFolderName === targetFolderName) continue
    let targetPath = path.join(parentDir, targetFolderName)
    if (fs.existsSync(targetPath) && path.resolve(targetPath) !== path.resolve(currentPath)) {
      let suffix = 1
      while (fs.existsSync(path.join(parentDir, `${targetFolderName}-${suffix}`))) {
        suffix++
        if (suffix >= 100) break
      }
      targetPath = path.join(parentDir, `${targetFolderName}-${suffix}`)
    }
    try {
      fs.renameSync(currentPath, targetPath)
      p.path = targetPath
      updated++
      console.log('OK:', currentFolderName, '->', path.basename(targetPath))
    } catch (err) {
      console.error('FAIL:', currentPath, err.message)
    }
  }
  if (updated > 0) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf-8')
    console.log('\n已同步', updated, '个文件夹名，已更新', PROJECTS_FILE)
  } else {
    console.log('无需同步，文件夹名已与项目管理一致')
  }
}

main()
