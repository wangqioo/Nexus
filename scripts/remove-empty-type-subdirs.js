#!/usr/bin/env node
/**
 * 只删除类型目录下「整棵为空」的一层子目录（扁平化后遗留的 ESP32-S3、Go、Node 等）
 * 不删项目内的 build/ 等
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const workshop = path.join(os.homedir(), 'Workshop')
const TYPE_DIRS = [
  path.join(workshop, 'MCU'),
  path.join(workshop, 'AI'),
  path.join(workshop, 'Software'),
  path.join(workshop, 'Linux'),
  path.join(workshop, 'Mobile'),
  path.join(workshop, 'Remote'),
]

function isEmptyDir(dir) {
  if (!fs.existsSync(dir)) return true
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!isEmptyDir(path.join(dir, e.name))) return false
    } else {
      return false
    }
  }
  return true
}

function removeEmptyTree(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      removeEmptyTree(path.join(dir, e.name))
    }
  }
  fs.rmdirSync(dir)
}

function main() {
  let removed = 0
  TYPE_DIRS.forEach(typeDir => {
    if (!fs.existsSync(typeDir)) return
    const children = fs.readdirSync(typeDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    children.forEach(d => {
      const full = path.join(typeDir, d.name)
      if (isEmptyDir(full)) {
        console.log('Remove:', full)
        removeEmptyTree(full)
        removed++
      }
    })
  })
  console.log('\n已删除', removed, '个空目录')
}

main()
