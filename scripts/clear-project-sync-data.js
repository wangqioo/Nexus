#!/usr/bin/env node
/**
 * 清除指定项目在 Nexus 中的同步数据（笔记 + 知识库）。
 * 用法: node scripts/clear-project-sync-data.js <项目路径>
 * 例: node scripts/clear-project-sync-data.js /path/to/your/project
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const DATA_DIR = path.join(os.homedir(), '.nexus')

function isProjectMatch(obj, projectPath, projectName) {
  const p = (obj.projectPath || obj.sourceProject || obj.metadata?.sourceProject || '').toString()
  const n = (obj.projectName || '').toString()
  if (!p && !n) return false
  const pathNorm = path.normalize(projectPath)
  const nameNorm = projectName.replace(/[^a-zA-Z0-9_-]/g, '')
  if (p && (pathNorm === path.normalize(p) || path.basename(p) === projectName)) return true
  if (n && (n === projectName || n.replace(/[^a-zA-Z0-9_-]/g, '') === nameNorm)) return true
  return false
}

function main() {
  const projectPath = process.argv[2]
  if (!projectPath || !fs.existsSync(projectPath)) {
    console.error('用法: node scripts/clear-project-sync-data.js <项目路径>')
    process.exit(1)
  }
  const resolvedPath = path.resolve(projectPath)
  const projectName = path.basename(resolvedPath)
  let deletedNotes = 0
  let deletedKnowledge = 0

  // 笔记: ~/.nexus/notes/*.json
  const notesDir = path.join(DATA_DIR, 'notes')
  if (fs.existsSync(notesDir)) {
    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const fp = path.join(notesDir, file)
      try {
        const obj = JSON.parse(fs.readFileSync(fp, 'utf-8'))
        if (isProjectMatch(obj, resolvedPath, projectName)) {
          fs.unlinkSync(fp)
          deletedNotes++
          console.log('删除笔记:', file)
        }
      } catch (e) {
        // skip invalid json
      }
    }
  }

  // 知识库: 扁平 ~/.nexus/knowledge/<type>/*.json，兼容旧 ~/.nexus/knowledge/<type>/<category>/*.json
  const knowledgeDir = path.join(DATA_DIR, 'knowledge')
  if (fs.existsSync(knowledgeDir)) {
    const types = fs.readdirSync(knowledgeDir).filter(f => {
      const p = path.join(knowledgeDir, f)
      return fs.statSync(p).isDirectory()
    })
    for (const type of types) {
      const typeDir = path.join(knowledgeDir, type)
      const flatFiles = fs.readdirSync(typeDir).filter(f => {
        const p = path.join(typeDir, f)
        return f.endsWith('.json') && fs.statSync(p).isFile()
      })
      for (const file of flatFiles) {
        const fp = path.join(typeDir, file)
        try {
          const obj = JSON.parse(fs.readFileSync(fp, 'utf-8'))
          if (isProjectMatch(obj, resolvedPath, projectName)) {
            fs.unlinkSync(fp)
            deletedKnowledge++
            console.log('删除知识库(扁平):', type + '/' + file)
          }
        } catch (e) {}
      }
      const cats = fs.readdirSync(typeDir).filter(f => {
        const p = path.join(typeDir, f)
        return fs.statSync(p).isDirectory()
      })
      for (const cat of cats) {
        const catDir = path.join(typeDir, cat)
        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.json'))
        for (const file of files) {
          const fp = path.join(catDir, file)
          try {
            const obj = JSON.parse(fs.readFileSync(fp, 'utf-8'))
            if (isProjectMatch(obj, resolvedPath, projectName)) {
              fs.unlinkSync(fp)
              deletedKnowledge++
              console.log('删除知识库:', type + '/' + cat + '/' + file)
            }
          } catch (e) {}
        }
      }
    }
  }

  console.log('完成: 删除笔记', deletedNotes, '条, 知识库', deletedKnowledge, '条 (项目:', projectName, ')')
}

main()
