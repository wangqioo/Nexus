// ============================================================
// Nexus 存储服务 v6.0
// 统一知识库格式 - 简化版（移除不再使用的旧 API）
// ============================================================

import type { Note, KnowledgeEntry, ProjectType } from '../types'
import { KNOWLEDGE_CATEGORIES } from '../types'
import { logger } from '../utils/logger'

// 检查是否在 Electron 环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}

// 本地存储回退 (用于开发环境)
const localStorageFallback = {
  async readFile(path: string): Promise<string | null> {
    return localStorage.getItem(`nexus:${path}`)
  },
  async writeFile(path: string, content: string): Promise<boolean> {
    localStorage.setItem(`nexus:${path}`, content)
    return true
  },
  async deleteFile(path: string): Promise<boolean> {
    localStorage.removeItem(`nexus:${path}`)
    return true
  },
  async listFiles(dir: string): Promise<string[]> {
    const prefix = `nexus:${dir}/`
    const files: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        files.push(key.replace(prefix, ''))
      }
    }
    return files
  }
}

// 获取文件系统 API
const getFS = () => {
  if (isElectron()) {
    return window.electronAPI
  }
  return localStorageFallback
}

// ============================================================
// 通用 CRUD 操作
// ============================================================

async function readJSON<T>(path: string): Promise<T | null> {
  const fs = getFS()
  const content = await fs.readFile(path)
  if (content) {
    try {
      return JSON.parse(content) as T
    } catch {
      return null
    }
  }
  return null
}

async function writeJSON<T>(path: string, data: T): Promise<boolean> {
  const fs = getFS()
  return fs.writeFile(path, JSON.stringify(data, null, 2))
}

async function listDir(dir: string): Promise<string[]> {
  const fs = getFS()
  return fs.listFiles(dir)
}

async function deleteFilePath(path: string): Promise<boolean> {
  const fs = getFS()
  return fs.deleteFile(path)
}

// ============================================================
// 知识库 (KnowledgeEntry) - 核心 API
// 分类仅按项目类型：knowledge/{projectType}/*.json（扁平），category 仅作笔记标签展示
// 兼容旧结构 knowledge/{projectType}/{category}/*.json
// ============================================================

// Markdown -> KnowledgeEntry (用于读取 .md 文件，仅旧数据兼容)
async function readMarkdownAsKnowledge(
  filePath: string, 
  filename: string, 
  projectType: ProjectType, 
  category: string
): Promise<KnowledgeEntry | null> {
  try {
    const parsed = await window.electronAPI.readMarkdown(filePath)
    if (!parsed) return null
    const fm = parsed.frontmatter || {}
    const id = filename.replace('.md', '')
    return {
      id: `${projectType}-${category}-${id}`,
      title: fm.title || id.replace(/-/g, ' '),
      content: parsed.content || '',
      projectType,
      category,
      tags: fm.tags || [],
      severity: fm.severity,
      sourceProject: fm.project || fm.sourceProject,
      metadata: { ...fm, _source: `md-${filePath}` },
      createdAt: fm.created || parsed.createdAt,
      updatedAt: parsed.updatedAt,
    }
  } catch (e) {
    logger.error('Error reading markdown as knowledge:', e)
    return null
  }
}

/** 知识分类按项目类型键缓存（固定 4 类，仅用于展示名称） */
export type CategoriesByType = Record<string, { id: string }[]>

// 统一获取所有知识条目（扁平 + 兼容旧子目录）
// 类型目录动态从 knowledge/ 下列出，以支持自定义项目类型（如 game、iot）
async function listAllKnowledge(
  type?: ProjectType,
  _category?: string,
  _categoriesByType?: CategoriesByType
): Promise<KnowledgeEntry[]> {
  const entries: KnowledgeEntry[] = []
  let types: string[]
  if (type) {
    types = [type]
  } else {
    try {
      const topDirs = await listDir('knowledge')
      types = topDirs.filter(d => !d.includes('.')) // 只取子目录名（如 mcu、software、game）
    } catch {
      types = ['mcu', 'ai', 'software', 'linux', 'mobile', 'remote', 'fpga']
    }
  }
  
  for (const t of types) {
    let items: string[] = []
    try {
      items = await listDir(`knowledge/${t}`)
    } catch { continue }
    
    for (const item of items) {
      if (item.endsWith('.json')) {
        const data = await readJSON<KnowledgeEntry>(`knowledge/${t}/${item}`)
        if (!data) continue
        entries.push({
          ...data,
          projectType: data.projectType || t,
          category: data.category || 'other',
        } as KnowledgeEntry)
      } else if (!item.includes('.')) {
        // 旧结构：子目录
        let files: string[] = []
        try {
          files = await listDir(`knowledge/${t}/${item}`)
        } catch { continue }
        for (const file of files) {
          if (file.endsWith('.json')) {
            const data = await readJSON<KnowledgeEntry>(`knowledge/${t}/${item}/${file}`)
            if (!data) continue
            entries.push({ ...data, projectType: data.projectType || t, category: data.category || item } as KnowledgeEntry)
          } else if (file.endsWith('.md') && isElectron()) {
            const e = await readMarkdownAsKnowledge(`knowledge/${t}/${item}/${file}`, file, t as ProjectType, item)
            if (e) entries.push(e)
          }
        }
      }
    }
  }
  
  return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// 保存知识条目（扁平路径）
async function saveKnowledgeEntry(entry: KnowledgeEntry): Promise<boolean> {
  const dirPath = `knowledge/${entry.projectType}`
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return writeJSON(`${dirPath}/${safeId}.json`, entry)
}

// 删除知识条目（先试扁平路径，再试旧路径）
async function deleteKnowledgeEntry(entry: KnowledgeEntry): Promise<boolean> {
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const flatPath = `knowledge/${entry.projectType}/${safeId}.json`
  const jsonResult = await deleteFilePath(flatPath)
  if (jsonResult) return true
  const legacyPath = `knowledge/${entry.projectType}/${entry.category || 'other'}/${safeId}.json`
  if (await deleteFilePath(legacyPath)) return true
  return deleteFilePath(`knowledge/${entry.projectType}/${entry.category || 'other'}/${safeId}.md`)
}

// 知识库统计
async function getKnowledgeStats(): Promise<{
  total: number
  byType: Record<ProjectType, number>
  byCategory: Record<string, number>
}> {
  const all = await listAllKnowledge()
  const byType: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  
  for (const entry of all) {
    byType[entry.projectType] = (byType[entry.projectType] || 0) + 1
    const catKey = `${entry.projectType}/${entry.category}`
    byCategory[catKey] = (byCategory[catKey] || 0) + 1
  }
  
  return {
    total: all.length,
    byType: byType as Record<ProjectType, number>,
    byCategory,
  }
}

// ============================================================
// Note - 独立存储
// 目录结构: notes/{id}.json
// ============================================================

// 根据文件名和内容智能推断笔记分类
function inferNoteCategory(filename: string, content: string): string {
  const lower = (filename + ' ' + content.slice(0, 500)).toLowerCase()
  
  if (/问题|踩坑|bug|error|fix|排查|兼容|故障|异常|失败|crash/.test(lower)) return 'issue'
  if (/架构|设计|方案|选型|对比|规划|migration|重构|refactor/.test(lower)) return 'design'
  if (/总结|复盘|完成|进度|交付|readme|overview|summary/.test(lower)) return 'summary'
  if (/参考|手册|速查|reference|guide|quick|api|配置说明|cheatsheet/.test(lower)) return 'reference'
  return 'learning'
}

async function readMarkdownAsNote(filePath: string, filename: string): Promise<Note | null> {
  try {
    const parsed = await window.electronAPI.readMarkdown(filePath)
    if (!parsed) return null
    
    const fm = parsed.frontmatter || {}
    const id = filename.replace('.md', '')
    const content = parsed.content || ''
    const category = fm.category || inferNoteCategory(filename, content)
    
    return {
      id: fm.id || id,
      title: fm.title || id.replace(/-/g, ' '),
      content,
      category,
      tags: fm.tags || [],
      createdAt: fm.created || parsed.createdAt,
      updatedAt: parsed.updatedAt,
    } as Note
  } catch (e) {
    logger.error('Error reading markdown as note:', e)
    return null
  }
}

async function listNotes(): Promise<Note[]> {
  const files = await listDir('notes')
  const items: Note[] = []
  
  const readPromises = files.map(async (file) => {
    if (file.endsWith('.json')) {
      return readJSON<Note>(`notes/${file}`)
    } else if (file.endsWith('.md') && isElectron()) {
      return readMarkdownAsNote(`notes/${file}`, file)
    }
    return null
  })
  
  const results = await Promise.all(readPromises)
  for (const item of results) {
    if (item) items.push(item)
  }
  
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

async function getNote(id: string): Promise<Note | null> {
  return readJSON<Note>(`notes/${id}.json`)
}

async function saveNote(note: Note): Promise<boolean> {
  return writeJSON(`notes/${note.id}.json`, note)
}

async function deleteNote(id: string): Promise<boolean> {
  return deleteFilePath(`notes/${id}.json`)
}

// ============================================================
// 按项目获取关联文档（双向索引）
// ============================================================

async function getDocumentsByProject(projectPath: string): Promise<{
  knowledge: KnowledgeEntry[]
  notes: Note[]
  removedKnowledge: KnowledgeEntry[]
  removedNotes: Note[]
}> {
  const [allKnowledge, allNotes] = await Promise.all([
    listAllKnowledge(),
    listNotes(),
  ])
  
  const projectName = projectPath.split('/').pop() || ''
  
  const knowledge = allKnowledge.filter(entry => {
    const source = entry.sourceProject || entry.projectPath || entry.metadata?.sourceProject
    if (!source) return false
    return source === projectPath || 
           source.endsWith(`/${projectName}`) ||
           source === projectName
  })
  
  const notes = allNotes.filter(note => {
    const source = note.sourceProject || note.projectPath
    if (!source) return false
    return source === projectPath || 
           source.endsWith(`/${projectName}`) ||
           source === projectName
  })
  
  let removedKnowledge: KnowledgeEntry[] = []
  let removedNotes: Note[] = []
  if (isElectron() && typeof window.electronAPI.checkRemovedDocs === 'function') {
    try {
      const { removedKnowledgeIds, removedNoteIds } = await window.electronAPI.checkRemovedDocs(projectPath, {
        knowledge: knowledge.map(e => ({ id: e.id, category: e.category, projectType: e.projectType })),
        notes: notes.map(n => n.id),
      })
      removedKnowledge = knowledge.filter(e => removedKnowledgeIds.includes(e.id))
      removedNotes = notes.filter(n => removedNoteIds.includes(n.id))
    } catch (_) {}
  }
  const linkedKnowledge = removedKnowledge.length || removedNotes.length
    ? knowledge.filter(e => !removedKnowledge.some(r => r.id === e.id))
    : knowledge
  const linkedNotes = removedKnowledge.length || removedNotes.length
    ? notes.filter(n => !removedNotes.some(r => r.id === n.id))
    : notes
  return {
    knowledge: linkedKnowledge,
    notes: linkedNotes,
    removedKnowledge,
    removedNotes,
  }
}

// ============================================================
// 统计信息
// ============================================================

async function getStats() {
  const [knowledge, notes] = await Promise.all([
    listAllKnowledge(),
    listNotes(),
  ])
  
  const byType: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  
  for (const entry of knowledge) {
    byType[entry.projectType] = (byType[entry.projectType] || 0) + 1
    byCategory[`${entry.projectType}/${entry.category}`] = (byCategory[`${entry.projectType}/${entry.category}`] || 0) + 1
  }
  
  return {
    knowledge: knowledge.length,
    notes: notes.length,
    byType,
    byCategory,
  }
}

// ============================================================
// 导出
// ============================================================

export const storage = {
  // 知识库 (核心 API)
  listAllKnowledge,
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeStats,
  
  // 笔记
  listNotes,
  getNote,
  saveNote,
  deleteNote,
  
  // 双向索引
  getDocumentsByProject,
  
  // 统计
  getStats,
}
