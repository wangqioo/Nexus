// ============================================================
// Nexus 存储服务 v5.0
// 统一知识库格式 - 所有数据存储在 knowledge/{type}/{category}/
// 旧格式 API 通过转换层使用知识库后端
// ============================================================

import type { 
  Platform, Peripheral, CodeSnippet, DebugExperience,
  ConfigTemplate, Project, Note, KnowledgeEntry, ProjectType
} from '../types'
import { KNOWLEDGE_CATEGORIES } from '../types'

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
// 知识库 (KnowledgeEntry) - 唯一存储格式
// 目录结构: knowledge/{projectType}/{category}/{id}.json|.md
// ============================================================

// Markdown -> KnowledgeEntry
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
      metadata: {
        ...fm,
        _source: `md-${filePath}`,
      },
      createdAt: fm.created || parsed.createdAt,
      updatedAt: parsed.updatedAt,
    }
  } catch (e) {
    console.error('Error reading markdown as knowledge:', e)
    return null
  }
}

// 统一获取所有知识条目 (仅从 knowledge/ 目录读取)
async function listAllKnowledge(type?: ProjectType, category?: string): Promise<KnowledgeEntry[]> {
  const entries: KnowledgeEntry[] = []
  const types: ProjectType[] = type 
    ? [type] 
    : ['mcu', 'ai', 'software', 'linux', 'mobile', 'remote']
  
  console.log('[Storage] listAllKnowledge - types:', types)
  
  for (const t of types) {
    const cats = category ? [category] : KNOWLEDGE_CATEGORIES[t]?.map(c => c.id) || []
    console.log(`[Storage] Type ${t} categories:`, cats)
    
    for (const cat of cats) {
      const dirPath = `knowledge/${t}/${cat}`
      let files: string[] = []
      try {
        files = await listDir(dirPath)
        if (files.length > 0) {
          console.log(`[Storage] ${dirPath}: ${files.length} files`)
        }
      } catch { continue }
      
      const readPromises = files.map(async (file) => {
        if (file.endsWith('.json')) {
          const data = await readJSON<KnowledgeEntry>(`${dirPath}/${file}`)
          if (!data) return null
          // 确保必要字段
          return {
            ...data,
            projectType: data.projectType || t,
            category: data.category || cat,
          } as KnowledgeEntry
        } else if (file.endsWith('.md') && isElectron()) {
          return readMarkdownAsKnowledge(`${dirPath}/${file}`, file, t, cat)
        }
        return null
      })
      
      const results = await Promise.all(readPromises)
      for (const item of results) {
        if (item) entries.push(item)
      }
    }
  }
  
  return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// 保存知识条目
async function saveKnowledgeEntry(entry: KnowledgeEntry): Promise<boolean> {
  const dirPath = `knowledge/${entry.projectType}/${entry.category}`
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return writeJSON(`${dirPath}/${safeId}.json`, entry)
}

// 删除知识条目
async function deleteKnowledgeEntry(entry: KnowledgeEntry): Promise<boolean> {
  const safeId = entry.id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const jsonResult = await deleteFilePath(`knowledge/${entry.projectType}/${entry.category}/${safeId}.json`)
  if (jsonResult) return true
  return deleteFilePath(`knowledge/${entry.projectType}/${entry.category}/${safeId}.md`)
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
// 类型转换工具 (KnowledgeEntry <-> 专用类型)
// 保持旧页面的 API 不变，内部使用知识库后端
// ============================================================

// --- Platform ---

function platformToKnowledge(p: Platform): KnowledgeEntry {
  return {
    id: p.id,
    title: p.name,
    content: `芯片: ${p.chip.name} (${p.chip.manufacturer})\n内核: ${p.chip.core}\n框架: ${p.framework.name} ${p.framework.version || ''}\n构建: ${p.framework.buildSystem}`,
    projectType: 'mcu',
    category: 'platform',
    tags: [p.chip.name, p.framework.name, p.chip.manufacturer, ...(p.chip.features || [])].filter(Boolean),
    metadata: {
      chip: p.chip,
      framework: p.framework,
      toolchain: p.toolchain,
      pinout: p.pinout,
      notes: p.notes,
    },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function knowledgeToPlatform(e: KnowledgeEntry): Platform {
  const m = e.metadata || {}
  return {
    id: e.id,
    name: e.title,
    chip: m.chip || { name: '', manufacturer: '', core: '', features: [] },
    framework: m.framework || { name: '', buildSystem: '', configFiles: [] },
    toolchain: m.toolchain || { compiler: '' },
    pinout: m.pinout,
    notes: m.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// --- Peripheral ---

function peripheralToKnowledge(p: Peripheral): KnowledgeEntry {
  return {
    id: p.id,
    title: p.name,
    content: `**${p.type}** | 接口: ${p.interface?.type?.toUpperCase() || ''} ${p.interface?.speed || ''}\n\n${p.notes || ''}`,
    projectType: 'mcu',
    category: 'peripheral',
    tags: p.tags || [],
    metadata: {
      type: p.type,
      manufacturer: p.manufacturer,
      interface: p.interface,
      specs: p.specs,
      defaultWiring: p.defaultWiring,
      snippetIds: p.snippetIds,
      datasheet: p.datasheet,
      notes: p.notes,
    },
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

function knowledgeToPeripheral(e: KnowledgeEntry): Peripheral {
  const m = e.metadata || {}
  return {
    id: e.id,
    name: e.title,
    type: m.type || 'other',
    manufacturer: m.manufacturer,
    interface: m.interface || { type: 'other' },
    specs: m.specs,
    defaultWiring: m.defaultWiring || [],
    snippetIds: m.snippetIds || [],
    datasheet: m.datasheet,
    tags: e.tags || [],
    notes: m.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// --- CodeSnippet ---

function snippetToKnowledge(s: CodeSnippet): KnowledgeEntry {
  return {
    id: s.id,
    title: s.name,
    content: s.code || s.description || '',
    projectType: 'mcu',
    category: 'snippet',
    tags: s.tags || [],
    metadata: {
      language: s.language,
      snippetCategory: s.category,
      description: s.description,
      code: s.code,
      usage: s.usage,
      dependencies: s.dependencies,
      platformIds: s.platformIds,
      peripheralIds: s.peripheralIds,
      sourceProject: s.sourceProject,
      sourceFile: s.sourceFile,
    },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function knowledgeToSnippet(e: KnowledgeEntry): CodeSnippet {
  const m = e.metadata || {}
  return {
    id: e.id,
    name: e.title,
    category: m.snippetCategory || m.category || 'utility',
    platformIds: m.platformIds || [],
    peripheralIds: m.peripheralIds || [],
    language: m.language || 'c',
    code: m.code || e.content || '',
    description: m.description || '',
    usage: m.usage,
    dependencies: m.dependencies,
    sourceProject: m.sourceProject,
    sourceFile: m.sourceFile,
    tags: e.tags || [],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// --- DebugExperience ---

function debugToKnowledge(d: DebugExperience): KnowledgeEntry {
  return {
    id: d.id,
    title: d.title,
    content: d.solution || d.symptom || '',
    projectType: 'mcu',
    category: 'debug',
    tags: d.tags || [],
    severity: d.severity,
    metadata: {
      symptom: d.symptom,
      errorLog: d.errorLog,
      rootCause: d.rootCause,
      solution: d.solution,
      solutionCode: d.solutionCode,
      environment: d.environment,
      relatedSnippetIds: d.relatedSnippetIds,
    },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function knowledgeToDebug(e: KnowledgeEntry): DebugExperience {
  const m = e.metadata || {}
  return {
    id: e.id,
    title: e.title,
    environment: m.environment || {},
    symptom: m.symptom || '',
    errorLog: m.errorLog,
    rootCause: m.rootCause || '',
    solution: m.solution || e.content || '',
    solutionCode: m.solutionCode,
    relatedSnippetIds: m.relatedSnippetIds,
    severity: e.severity || 'minor',
    tags: e.tags || [],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// --- ConfigTemplate ---

function configToKnowledge(c: ConfigTemplate): KnowledgeEntry {
  return {
    id: c.id,
    title: c.name,
    content: c.description || '',
    projectType: 'mcu',
    category: 'config',
    tags: c.tags || [],
    metadata: {
      description: c.description,
      files: c.files,
      platformId: c.platformId,
      peripheralIds: c.peripheralIds,
      sourceProject: c.sourceProject,
    },
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function knowledgeToConfig(e: KnowledgeEntry): ConfigTemplate {
  const m = e.metadata || {}
  return {
    id: e.id,
    name: e.title,
    description: m.description || e.content || '',
    platformId: m.platformId || '',
    peripheralIds: m.peripheralIds,
    files: m.files || [],
    sourceProject: m.sourceProject,
    tags: e.tags || [],
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }
}

// ============================================================
// 旧 API (内部使用知识库后端)
// 保持函数签名不变，旧页面无需修改
// ============================================================

// --- Platform ---

async function listPlatforms(): Promise<Platform[]> {
  const entries = await listAllKnowledge('mcu', 'platform')
  return entries.map(knowledgeToPlatform)
}

async function getPlatform(id: string): Promise<Platform | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const entry = await readJSON<KnowledgeEntry>(`knowledge/mcu/platform/${safeId}.json`)
  if (!entry) return null
  return knowledgeToPlatform(entry)
}

async function savePlatform(platform: Platform): Promise<boolean> {
  return saveKnowledgeEntry(platformToKnowledge(platform))
}

async function deletePlatform(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return deleteFilePath(`knowledge/mcu/platform/${safeId}.json`)
}

// --- Peripheral ---

async function listPeripherals(): Promise<Peripheral[]> {
  const entries = await listAllKnowledge('mcu', 'peripheral')
  return entries.map(knowledgeToPeripheral)
}

async function getPeripheral(id: string): Promise<Peripheral | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const entry = await readJSON<KnowledgeEntry>(`knowledge/mcu/peripheral/${safeId}.json`)
  if (!entry) return null
  return knowledgeToPeripheral(entry)
}

async function savePeripheral(peripheral: Peripheral): Promise<boolean> {
  return saveKnowledgeEntry(peripheralToKnowledge(peripheral))
}

async function deletePeripheral(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return deleteFilePath(`knowledge/mcu/peripheral/${safeId}.json`)
}

async function getPeripheralsByType(type: string): Promise<Peripheral[]> {
  const all = await listPeripherals()
  return all.filter(p => p.type === type)
}

// --- CodeSnippet ---

async function listSnippets(): Promise<CodeSnippet[]> {
  const entries = await listAllKnowledge('mcu', 'snippet')
  return entries.map(knowledgeToSnippet)
}

async function getSnippet(id: string): Promise<CodeSnippet | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const entry = await readJSON<KnowledgeEntry>(`knowledge/mcu/snippet/${safeId}.json`)
  if (!entry) return null
  return knowledgeToSnippet(entry)
}

async function saveSnippet(snippet: CodeSnippet): Promise<boolean> {
  return saveKnowledgeEntry(snippetToKnowledge(snippet))
}

async function deleteSnippet(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return deleteFilePath(`knowledge/mcu/snippet/${safeId}.json`)
}

async function getSnippetsByCategory(category: string): Promise<CodeSnippet[]> {
  const all = await listSnippets()
  return all.filter(s => s.category === category)
}

async function getSnippetsForPeripheral(peripheralId: string): Promise<CodeSnippet[]> {
  const all = await listSnippets()
  return all.filter(s => s.peripheralIds.includes(peripheralId))
}

async function getSnippetsForPlatform(platformId: string): Promise<CodeSnippet[]> {
  const all = await listSnippets()
  return all.filter(s => s.platformIds.includes(platformId))
}

// --- DebugExperience ---

async function listDebugExperiences(): Promise<DebugExperience[]> {
  const entries = await listAllKnowledge('mcu', 'debug')
  return entries.map(knowledgeToDebug)
}

async function getDebugExperience(id: string): Promise<DebugExperience | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const entry = await readJSON<KnowledgeEntry>(`knowledge/mcu/debug/${safeId}.json`)
  if (!entry) return null
  return knowledgeToDebug(entry)
}

async function saveDebugExperience(exp: DebugExperience): Promise<boolean> {
  return saveKnowledgeEntry(debugToKnowledge(exp))
}

async function deleteDebugExperience(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return deleteFilePath(`knowledge/mcu/debug/${safeId}.json`)
}

async function getDebugExperiencesForPlatform(platformId: string): Promise<DebugExperience[]> {
  const all = await listDebugExperiences()
  return all.filter(e => e.environment.platformId === platformId)
}

// --- ConfigTemplate ---

async function listConfigTemplates(): Promise<ConfigTemplate[]> {
  const entries = await listAllKnowledge('mcu', 'config')
  return entries.map(knowledgeToConfig)
}

async function getConfigTemplate(id: string): Promise<ConfigTemplate | null> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  const entry = await readJSON<KnowledgeEntry>(`knowledge/mcu/config/${safeId}.json`)
  if (!entry) return null
  return knowledgeToConfig(entry)
}

async function saveConfigTemplate(template: ConfigTemplate): Promise<boolean> {
  return saveKnowledgeEntry(configToKnowledge(template))
}

async function deleteConfigTemplate(id: string): Promise<boolean> {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-')
  return deleteFilePath(`knowledge/mcu/config/${safeId}.json`)
}

// ============================================================
// Note (独立格式，不变)
// ============================================================

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
    console.error('Error reading markdown as note:', e)
    return null
  }
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
// Project (独立格式，不变)
// ============================================================

async function listProjects(): Promise<Project[]> {
  const files = await listDir('projects')
  const items: Project[] = []
  for (const file of files) {
    if (file.endsWith('.json')) {
      const item = await readJSON<Project>(`projects/${file}`)
      if (item) items.push(item)
    }
  }
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

async function getProject(id: string): Promise<Project | null> {
  return readJSON<Project>(`projects/${id}.json`)
}

async function saveProject(project: Project): Promise<boolean> {
  return writeJSON(`projects/${project.id}.json`, project)
}

async function deleteProject(id: string): Promise<boolean> {
  return deleteFilePath(`projects/${id}.json`)
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
    platforms: byCategory['mcu/platform'] || 0,
    peripherals: byCategory['mcu/peripheral'] || 0,
    snippets: byCategory['mcu/snippet'] || 0,
    debug: byCategory['mcu/debug'] || 0,
    configs: byCategory['mcu/config'] || 0,
    projects: 0,
  }
}

// ============================================================
// 导出
// ============================================================

export const storage = {
  // 统一知识库 (核心 API)
  listAllKnowledge,
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeStats,
  
  // 旧接口 (内部使用知识库后端)
  listPlatforms,
  getPlatform,
  savePlatform,
  deletePlatform,
  
  listPeripherals,
  getPeripheral,
  savePeripheral,
  deletePeripheral,
  getPeripheralsByType,
  
  listSnippets,
  getSnippet,
  saveSnippet,
  deleteSnippet,
  getSnippetsByCategory,
  getSnippetsForPeripheral,
  getSnippetsForPlatform,
  
  listDebugExperiences,
  getDebugExperience,
  saveDebugExperience,
  deleteDebugExperience,
  getDebugExperiencesForPlatform,
  
  listConfigTemplates,
  getConfigTemplate,
  saveConfigTemplate,
  deleteConfigTemplate,
  
  listProjects,
  getProject,
  saveProject,
  deleteProject,
  
  listNotes,
  getNote,
  saveNote,
  deleteNote,
  
  getStats,
}
