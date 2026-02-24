import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { logger } from './utils/logger'
import { callAIWithRetry } from './utils/ai-retry'

const execAsync = promisify(exec)

// 开发模式：未打包且未显式设为 production 时加载 Vite 开发服务器
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production'

// 数据存储目录
const DATA_DIR = path.join(os.homedir(), '.nexus')

// ============================================================
// 模板配置管理
// ============================================================

const TEMPLATE_CONFIG_FILE = path.join(DATA_DIR, 'templates.json')
/** 模板即唯一真相：~/.nexus/templates/<ref>/templates.json，首次运行由种子生成 */
const TEMPLATES_DIR = path.join(DATA_DIR, 'templates')
const TEMPLATE_REF_IDS = ['mcu', 'software', 'ai', 'remote', 'linux', 'mobile'] as const

// 默认模板配置（与 types/index.ts 中的 DEFAULT_TEMPLATE_CONFIG 保持一致）
const DEFAULT_TEMPLATE_CONFIG = {
  version: '1.0',
  templates: {
    debug: {
      id: 'debug',
      name: '调试经验',
      icon: 'BugOutlined',
      description: '记录 bug 修复过程和问题排查经验',
      fileExtension: '.md',
      frontmatterFields: [
        { name: 'title', label: '标题', type: 'text', required: true, placeholder: '问题简述' },
        { name: 'tags', label: '标签', type: 'tags', required: false, placeholder: '添加标签' },
        { name: 'severity', label: '严重程度', type: 'select', required: false, options: ['critical', 'major', 'minor', 'trivial'], default: 'minor' },
        { name: 'status', label: '状态', type: 'select', required: false, options: ['resolved', 'workaround', 'investigating'], default: 'resolved' },
        { name: 'platform', label: '平台', type: 'text', required: false, placeholder: '如 ESP32-S3' },
        { name: 'created', label: '创建时间', type: 'date', required: true },
      ],
      contentTemplate: `## 问题描述
<!-- 描述遇到的问题现象 -->

## 错误信息
\`\`\`
<!-- 粘贴错误日志 -->
\`\`\`

## 根因分析
<!-- 分析问题的根本原因 -->

## 解决方案
<!-- 详细描述解决步骤 -->

## 相关代码
\`\`\`c
// 修复后的代码
\`\`\`

## 经验总结
<!-- 这次问题带来的教训或经验 -->
`,
      aiPrompt: `请帮我记录这个调试经验。要求：
1. 标题简洁明了，概括问题本质
2. 问题描述要包含复现条件
3. 根因分析要深入，不只是表面现象
4. 解决方案要具体可操作
5. 如果有代码修改，请包含关键代码片段
6. 总结要提炼出可复用的经验`,
    },
    snippet: {
      id: 'snippet',
      name: '代码片段',
      icon: 'CodeOutlined',
      description: '保存可复用的代码模板',
      fileExtension: '.md',
      frontmatterFields: [
        { name: 'title', label: '标题', type: 'text', required: true, placeholder: '代码片段名称' },
        { name: 'tags', label: '标签', type: 'tags', required: false, placeholder: '添加标签' },
        { name: 'language', label: '编程语言', type: 'select', required: true, options: ['c', 'cpp', 'python', 'javascript', 'typescript', 'rust', 'go', 'shell', 'other'], default: 'c' },
        { name: 'category', label: '分类', type: 'select', required: false, options: ['driver', 'algorithm', 'utility', 'config', 'template', 'other'], default: 'utility' },
        { name: 'platform', label: '适用平台', type: 'text', required: false, placeholder: '如 ESP-IDF, Arduino' },
        { name: 'created', label: '创建时间', type: 'date', required: true },
      ],
      contentTemplate: `## 功能说明
<!-- 这段代码的作用 -->

## 代码
\`\`\`c
// 代码内容
\`\`\`

## 使用方法
<!-- 如何使用这段代码 -->

## 依赖说明
<!-- 需要的头文件、库等 -->

## 注意事项
<!-- 使用时需要注意的点 -->
`,
      aiPrompt: `请帮我保存这个代码片段。要求：
1. 标题要清晰表达代码功能
2. 功能说明简洁但完整
3. 代码要有适当的注释
4. 说明使用方法和参数
5. 列出依赖的库或头文件
6. 提醒使用时的注意事项`,
    },
    note: {
      id: 'note',
      name: '开发笔记',
      icon: 'FileTextOutlined',
      description: '记录学习心得和技术要点',
      fileExtension: '.md',
      frontmatterFields: [
        { name: 'title', label: '标题', type: 'text', required: true, placeholder: '笔记标题' },
        { name: 'tags', label: '标签', type: 'tags', required: false, placeholder: '添加标签' },
        { name: 'category', label: '分类', type: 'select', required: false, options: ['learning', 'design', 'issue', 'summary', 'reference'], default: 'learning' },
        { name: 'created', label: '创建时间', type: 'date', required: true },
      ],
      contentTemplate: `## 背景
<!-- 为什么要记录这个 -->

## 核心内容
<!-- 主要知识点 -->

## 示例
<!-- 代码示例或实际案例 -->

## 参考资料
<!-- 相关链接或文档 -->
`,
      aiPrompt: `请帮我记录这个开发笔记。要求：
1. 标题要能概括核心内容
2. 说明记录的背景和目的
3. 核心内容要条理清晰
4. 如果有代码，请包含示例
5. 附上相关的参考资料链接`,
    },
    config: {
      id: 'config',
      name: '配置模板',
      icon: 'SettingOutlined',
      description: '保存重要的配置文件',
      fileExtension: '.md',
      frontmatterFields: [
        { name: 'title', label: '标题', type: 'text', required: true, placeholder: '配置名称' },
        { name: 'tags', label: '标签', type: 'tags', required: false, placeholder: '添加标签' },
        { name: 'configType', label: '配置类型', type: 'select', required: false, options: ['build', 'env', 'device', 'network', 'other'], default: 'other' },
        { name: 'platform', label: '适用平台', type: 'text', required: false, placeholder: '如 ESP-IDF 5.x' },
        { name: 'created', label: '创建时间', type: 'date', required: true },
      ],
      contentTemplate: `## 配置说明
<!-- 这个配置的作用 -->

## 配置内容
\`\`\`
# 配置文件内容
\`\`\`

## 关键参数说明
<!-- 重要参数的含义 -->

## 使用场景
<!-- 什么情况下使用这个配置 -->
`,
      aiPrompt: `请帮我保存这个配置模板。要求：
1. 标题要清晰表达配置用途
2. 说明配置的作用和适用场景
3. 保留完整的配置内容
4. 解释关键参数的含义
5. 说明使用时需要修改的地方`,
    },
    other: {
      id: 'other',
      name: '其他',
      icon: 'FolderOutlined',
      description: '未归入调试/笔记/代码片段/配置时的经验文档',
      fileExtension: '.md',
      frontmatterFields: [
        { name: 'title', label: '标题', type: 'text', required: true, placeholder: '标题' },
        { name: 'tags', label: '标签', type: 'tags', required: false, placeholder: '添加标签' },
        { name: 'created', label: '创建时间', type: 'date', required: true },
      ],
      contentTemplate: `## 说明
<!-- 简要说明 -->

## 内容
<!-- 详细内容 -->
`,
      aiPrompt: `请帮我记录这条经验。要求：标题清晰，内容条理清楚，必要时包含示例或参考。`,
    },
  },
  settings: {
    autoAddTimestamp: true,
    defaultTags: [],
    aiAnalysisEnabled: true,
  },
  // 知识库固定 4 类（笔记仅保留在笔记库）
  knowledgeCategories: [
    { id: 'debug', name: '调试经验', icon: '🐛', silDir: 'debug' },
    { id: 'snippet', name: '代码片段', icon: '📝', silDir: 'snippets' },
    { id: 'config', name: '配置模板', icon: '⚙️', silDir: 'configs' },
    { id: 'other', name: '其他', icon: '📁', silDir: 'other' },
  ] as { id: string; name: string; icon: string; silDir: string }[],
}

type KnowledgeCategory = 'mcu' | 'software' | 'ai' | 'remote' | 'linux' | 'mobile'

/** 内嵌模板目录：开发时为 electron/templates-default，打包后可为 extraResources */
function getBundledTemplatesBase(): string {
  const fromDir = path.join(__dirname, 'templates-default')
  if (fs.existsSync(fromDir)) return fromDir
  const fromResources = path.join(process.resourcesPath || __dirname, 'templates-default')
  return fromResources
}

/** 仅用于种子与回退：从 electron/templates-default/<ref>/templates.json 读取，无则返回默认结构 */
function getBundledTemplateConfig(category: KnowledgeCategory): typeof DEFAULT_TEMPLATE_CONFIG {
  const baseDir = getBundledTemplatesBase()
  const filePath = path.join(baseDir, category, 'templates.json')
  if (fs.existsSync(filePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const merged = {
        ...DEFAULT_TEMPLATE_CONFIG,
        ...raw,
        templates: { ...(DEFAULT_TEMPLATE_CONFIG.templates as object), ...(raw.templates || {}) },
        settings: { ...DEFAULT_TEMPLATE_CONFIG.settings, ...(raw.settings || {}) },
        knowledgeCategories: Array.isArray(raw.knowledgeCategories) && raw.knowledgeCategories.length > 0
          ? raw.knowledgeCategories
          : (DEFAULT_TEMPLATE_CONFIG as any).knowledgeCategories,
      }
      return merged as typeof DEFAULT_TEMPLATE_CONFIG
    } catch (e) {
      logger.error('getBundledTemplateConfig 解析失败:', category, e)
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)) as typeof DEFAULT_TEMPLATE_CONFIG
}

/** 确保 ~/.nexus/templates 存在并已种子（缺则从 getBundledTemplateConfig 写入） */
function ensureTemplatesDir() {
  try {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    }
    for (const ref of TEMPLATE_REF_IDS) {
      const dir = path.join(TEMPLATES_DIR, ref)
      const file = path.join(dir, 'templates.json')
      if (!fs.existsSync(file)) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const config = getBundledTemplateConfig(ref)
        fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf-8')
        logger.info(`已种子模板: ${ref}`)
      }
    }
  } catch (e) {
    logger.error('ensureTemplatesDir:', e)
  }
}

/** 模板即唯一真相：优先读 ~/.nexus/templates/<ref>/templates.json，无则用内置种子 */
function getTemplateConfigForCategory(category: KnowledgeCategory): typeof DEFAULT_TEMPLATE_CONFIG {
  ensureTemplatesDir()
  const file = path.join(TEMPLATES_DIR, category, 'templates.json')
  if (fs.existsSync(file)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf-8'))
      const merged = {
        ...DEFAULT_TEMPLATE_CONFIG,
        ...raw,
        templates: { ...(DEFAULT_TEMPLATE_CONFIG.templates as object), ...(raw.templates || {}) },
        settings: { ...DEFAULT_TEMPLATE_CONFIG.settings, ...(raw.settings || {}) },
        knowledgeCategories: Array.isArray(raw.knowledgeCategories) && raw.knowledgeCategories.length > 0
          ? raw.knowledgeCategories
          : (DEFAULT_TEMPLATE_CONFIG as any).knowledgeCategories,
      }
      return merged as typeof DEFAULT_TEMPLATE_CONFIG
    } catch (e) {
      logger.error('读取模板失败，回退内置:', category, e)
    }
  }
  return getBundledTemplateConfig(category)
}

/** 从模板得到 .nexus 子目录列表（notes + 各笔记标签对应目录），用于创建目录与同步 */
function getSilSubdirs(templateConfig: typeof DEFAULT_TEMPLATE_CONFIG): string[] {
  const cats = (templateConfig as any).knowledgeCategories as { silDir: string }[] | undefined
  const dirs = cats ? [...new Set(cats.map(c => c.silDir))] : []
  if (!dirs.includes('notes')) dirs.unshift('notes')
  return dirs
}

// 项目类型定义表（id + dir；使用用户主目录下的 Workshop，无个人路径）
const PROJECT_TYPE_DEFS: { id: string; templateRef: KnowledgeCategory; dir: string }[] = [
  { id: 'mcu', templateRef: 'mcu', dir: path.join(os.homedir(), 'Workshop', 'MCU') },
  { id: 'ai', templateRef: 'ai', dir: path.join(os.homedir(), 'Workshop', 'AI') },
  { id: 'software', templateRef: 'software', dir: path.join(os.homedir(), 'Workshop', 'Software') },
  { id: 'linux', templateRef: 'linux', dir: path.join(os.homedir(), 'Workshop', 'Linux') },
  { id: 'mobile', templateRef: 'mobile', dir: path.join(os.homedir(), 'Workshop', 'Mobile') },
  { id: 'remote', templateRef: 'remote', dir: path.join(os.homedir(), 'Workshop', 'Remote') },
  { id: 'fpga', templateRef: 'software', dir: path.join(os.homedir(), 'Workshop', 'FPGA') },
]

// 自定义项目类型（用户通过「无法归类」流程创建）
const CUSTOM_PROJECT_TYPES_FILE = path.join(DATA_DIR, 'custom-project-types.json')
interface CustomProjectType { id: string; name: string; icon: string; color: string; templateRef?: string }
function loadCustomProjectTypes(): CustomProjectType[] {
  try {
    if (fs.existsSync(CUSTOM_PROJECT_TYPES_FILE)) {
      const data = JSON.parse(fs.readFileSync(CUSTOM_PROJECT_TYPES_FILE, 'utf-8'))
      return Array.isArray(data.types) ? data.types : []
    }
  } catch (e) { logger.error('loadCustomProjectTypes:', e) }
  return []
}
function saveCustomProjectTypes(types: CustomProjectType[]): boolean {
  try {
    fs.writeFileSync(CUSTOM_PROJECT_TYPES_FILE, JSON.stringify({ types }, null, 2), 'utf-8')
    return true
  } catch (e) { return false }
}

/** 合并内置 + 自定义类型（自定义统一放到 Workshop/Other） */
function getMergedProjectTypeDefs(): { id: string; templateRef: KnowledgeCategory; dir: string }[] {
  const otherDir = path.join(os.homedir(), 'Workshop', 'Other')
  const custom = loadCustomProjectTypes().map(t => ({
    id: t.id,
    templateRef: (t.templateRef as KnowledgeCategory) || 'software',
    dir: otherDir,
  }))
  return [...PROJECT_TYPE_DEFS, ...custom]
}

/** 从项目类型查模板集，用于选模板与 AI 提示 */
function getTemplateRef(projectType: string): KnowledgeCategory {
  const def = getMergedProjectTypeDefs().find(t => t.id === projectType)
  return def ? def.templateRef : 'software'
}

// 读取模板配置
function loadTemplateConfig(): typeof DEFAULT_TEMPLATE_CONFIG {
  try {
    if (fs.existsSync(TEMPLATE_CONFIG_FILE)) {
      const content = fs.readFileSync(TEMPLATE_CONFIG_FILE, 'utf-8')
      const config = JSON.parse(content)
      // 合并默认配置，确保新字段存在
      return {
        ...DEFAULT_TEMPLATE_CONFIG,
        ...config,
        templates: {
          ...DEFAULT_TEMPLATE_CONFIG.templates,
          ...(config.templates || {}),
        },
        settings: {
          ...DEFAULT_TEMPLATE_CONFIG.settings,
          ...(config.settings || {}),
        },
      }
    }
  } catch (e) {
    logger.error('读取模板配置失败:', e)
  }
  return { ...DEFAULT_TEMPLATE_CONFIG }
}

const AI_PRESETS: Record<string, { url: string; model: string }> = {
  zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  kimi: { url: 'https://api.moonshot.ai/v1/chat/completions', model: 'moonshot-v1-8k' },
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'abab6.5s-chat' },
}

/** 从 config.json 读取 AI 配置，返回请求 URL、API Key、模型。支持智谱/OpenAI/Kimi/MiniMax 预设与自定义。 */
function getAiRequestOptions(passedApiKey?: string): { url: string; apiKey: string; model: string } | null {
  const configPath = path.join(DATA_DIR, 'config.json')
  let config: Record<string, unknown> = {}
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch (_) {}
  const provider = (config.ai_provider as string) || 'zhipu'

  if (provider === 'custom') {
    const base = (config.ai_base_url as string)?.trim()
    const key = (config.ai_api_key as string)?.trim()
    const model = (config.ai_model as string)?.trim() || 'gpt-4o-mini'
    if (base && key) {
      const url = base.replace(/\/$/, '') + '/chat/completions'
      return { url, apiKey: key, model }
    }
    return null
  }

  if (AI_PRESETS[provider]) {
    const preset = AI_PRESETS[provider]
    const key = (passedApiKey || config.ai_api_key) as string
    if (!key?.trim()) return null
    const model = (config.ai_model as string)?.trim() || preset.model
    return { url: preset.url, apiKey: key.trim(), model }
  }

  // 智谱
  const key = (passedApiKey || config.zhipu_api_key) as string
  if (!key?.trim()) return null
  const preset = AI_PRESETS.zhipu
  return { url: preset.url, apiKey: key.trim(), model: preset.model }
}

// 递增版本号
function incrementVersion(version: string): string {
  const parts = version.split('.')
  const minor = parseInt(parts[1] || '0', 10) + 1
  return `${parts[0]}.${minor}`
}

// 检测模板内容是否有变化（忽略版本历史和项目使用记录）
function hasTemplateChanged(oldConfig: any, newConfig: any): boolean {
  const compareObj = (a: any, b: any, keys: string[]): boolean => {
    for (const key of keys) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        return true
      }
    }
    return false
  }
  return compareObj(oldConfig, newConfig, ['templates', 'settings'])
}

// 生成变更说明
function generateChangesSummary(oldConfig: any, newConfig: any): string {
  const changes: string[] = []
  
  // 检查每个模板的变化
  const templateNames: Record<string, string> = {
    debug: '调试经验',
    snippet: '代码片段',
    note: '开发笔记',
    config: '配置备份'
  }
  
  for (const [id, name] of Object.entries(templateNames)) {
    const oldT = oldConfig.templates?.[id]
    const newT = newConfig.templates?.[id]
    if (JSON.stringify(oldT) !== JSON.stringify(newT)) {
      changes.push(`修改了「${name}」模板`)
    }
  }
  
  // 检查通用设置
  if (JSON.stringify(oldConfig.settings) !== JSON.stringify(newConfig.settings)) {
    changes.push('修改了通用设置')
  }
  
  return changes.length > 0 ? changes.join('；') : '配置更新'
}

// 保存模板配置（带版本历史记录）
function saveTemplateConfig(config: Partial<typeof DEFAULT_TEMPLATE_CONFIG>): boolean {
  try {
    const current = loadTemplateConfig()
    
    // 合并配置
    let newConfig = {
      ...current,
      ...config,
      templates: config.templates ? { ...current.templates, ...config.templates } : current.templates,
      settings: config.settings ? { ...current.settings, ...config.settings } : current.settings,
      versionHistory: current.versionHistory || [],
      projectUsages: current.projectUsages || [],
    }
    
    // 检测是否有实质性变化
    if (hasTemplateChanged(current, newConfig)) {
      // 递增版本号
      const newVersion = incrementVersion(current.version || '1.0')
      const changesSummary = generateChangesSummary(current, newConfig)
      
      // 记录版本历史
      const versionRecord = {
        version: newVersion,
        timestamp: new Date().toISOString(),
        changes: changesSummary
      }
      
      newConfig.version = newVersion
      newConfig.versionHistory = [...(newConfig.versionHistory || []), versionRecord]
      
      logger.info(`模板配置版本升级: ${current.version} -> ${newVersion}`)
    }
    
    fs.writeFileSync(TEMPLATE_CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8')
    logger.info('模板配置已更新')
    return true
  } catch (e) {
    logger.error('保存模板配置失败:', e)
    return false
  }
}

// 记录项目使用的模板版本
function recordProjectTemplateUsage(projectPath: string, projectName: string, templateVersion: string): void {
  try {
    const config = loadTemplateConfig()
    const usages = config.projectUsages || []
    
    // 检查是否已存在该项目的记录
    const existingIndex = usages.findIndex((u: any) => u.projectPath === projectPath)
    
    const usage = {
      projectPath,
      projectName,
      templateVersion,
      initializedAt: new Date().toISOString()
    }
    
    if (existingIndex >= 0) {
      // 更新现有记录
      usages[existingIndex] = usage
    } else {
      // 添加新记录
      usages.push(usage)
    }
    
    // 直接写入文件（不触发版本递增）
    const newConfig = { ...config, projectUsages: usages }
    fs.writeFileSync(TEMPLATE_CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8')
    logger.info(`记录项目模板使用: ${projectName} -> v${templateVersion}`)
  } catch (e) {
    logger.error('记录项目模板使用失败:', e)
  }
}

// 确保数据目录存在 (v5 知识库目录结构)
function ensureDataDirs() {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, 'knowledge'),
    path.join(DATA_DIR, 'notes'),
    path.join(DATA_DIR, 'projects'),
  ]
  
  // 为所有项目类型创建知识库子目录
  const types = ['mcu', 'ai', 'software', 'linux', 'mobile', 'remote', 'fpga']
  for (const type of types) {
    dirs.push(path.join(DATA_DIR, 'knowledge', type))
  }
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

// ============================================================
// 数据迁移: 旧格式 -> 知识库格式
// 将 platforms/, peripherals/, snippets/, debug/, configs/
// 迁移到 knowledge/mcu/{category}/
// ============================================================

function migrateOldDataToKnowledge() {
  const migrationFlag = path.join(DATA_DIR, '.migration-v5-done')
  
  // 已迁移则跳过
  if (fs.existsSync(migrationFlag)) {
    return
  }
  
  logger.info('开始数据迁移: 旧格式 -> 知识库格式...')
  
  const categoryMap: Record<string, string> = {
    'platforms': 'platform',
    'peripherals': 'peripheral',
    'snippets': 'snippet',
    'debug': 'debug',
    'configs': 'config',
  }
  
  let totalMigrated = 0
  
  for (const [oldDir, category] of Object.entries(categoryMap)) {
    const sourceDir = path.join(DATA_DIR, oldDir)
    const targetDir = path.join(DATA_DIR, 'knowledge', 'mcu', category)
    
    if (!fs.existsSync(sourceDir)) continue
    
    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    
    let files: string[] = []
    try {
      files = fs.readdirSync(sourceDir)
    } catch { continue }
    
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file)
      
      let stats
      try {
        stats = fs.statSync(sourcePath)
      } catch { continue }
      if (!stats.isFile()) continue
      
      try {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(sourcePath, 'utf-8')
          const data = JSON.parse(content)
          
          // 转换为 KnowledgeEntry 格式
          const entry = convertToKnowledgeEntry(data, category, file)
          
          // 写入新位置
          const targetPath = path.join(targetDir, file)
          if (!fs.existsSync(targetPath)) {
            fs.writeFileSync(targetPath, JSON.stringify(entry, null, 2), 'utf-8')
            totalMigrated++
          }
          
          // 删除旧文件
          fs.unlinkSync(sourcePath)
          
        } else if (file.endsWith('.md')) {
          const content = fs.readFileSync(sourcePath, 'utf-8')
          const parsed = parseMarkdownWithFrontmatter(content)
          const id = file.replace('.md', '')
          
          const entry = {
            id: `mcu-${category}-${id}`,
            title: parsed.frontmatter.title || id.replace(/-/g, ' '),
            content: parsed.content || '',
            projectType: 'mcu',
            category,
            tags: parsed.frontmatter.tags || [],
            severity: parsed.frontmatter.severity,
            metadata: { ...parsed.frontmatter },
            createdAt: parsed.frontmatter.created || stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
          }
          
          const targetFile = `${id}.json`
          const targetPath = path.join(targetDir, targetFile)
          
          if (!fs.existsSync(targetPath)) {
            fs.writeFileSync(targetPath, JSON.stringify(entry, null, 2), 'utf-8')
            totalMigrated++
          }
          
          // 删除旧文件
          fs.unlinkSync(sourcePath)
        }
      } catch (e) {
        logger.error(`迁移文件失败 ${file}:`, e)
      }
    }
    
    // 删除空的旧目录
    try {
      const remaining = fs.readdirSync(sourceDir)
      if (remaining.length === 0) {
        fs.rmdirSync(sourceDir)
        logger.info(`已删除旧目录: ${oldDir}/`)
      }
    } catch {}
  }
  
  logger.info(`数据迁移完成: ${totalMigrated} 个文件已迁移`)
  
  // 写入迁移标记
  fs.writeFileSync(migrationFlag, JSON.stringify({
    migratedAt: new Date().toISOString(),
    count: totalMigrated,
  }), 'utf-8')
}

// 将旧格式 JSON 转换为 KnowledgeEntry
function convertToKnowledgeEntry(data: any, category: string, filename: string): any {
  const id = data.id || filename.replace('.json', '')
  
  switch (category) {
    case 'platform':
      return {
        id,
        title: data.name || '',
        content: `芯片: ${data.chip?.name || ''} (${data.chip?.manufacturer || ''})\n内核: ${data.chip?.core || ''}\n框架: ${data.framework?.name || ''} ${data.framework?.version || ''}\n构建: ${data.framework?.buildSystem || ''}`,
        projectType: 'mcu',
        category: 'platform',
        tags: [data.chip?.name, data.framework?.name, data.chip?.manufacturer, ...(data.chip?.features || [])].filter(Boolean),
        metadata: {
          chip: data.chip,
          framework: data.framework,
          toolchain: data.toolchain,
          pinout: data.pinout,
          notes: data.notes,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
      
    case 'peripheral':
      return {
        id,
        title: data.name || '',
        content: `**${data.type || ''}** | 接口: ${data.interface?.type?.toUpperCase() || ''} ${data.interface?.speed || ''}\n\n${data.notes || ''}`,
        projectType: 'mcu',
        category: 'peripheral',
        tags: data.tags || [],
        metadata: {
          type: data.type,
          manufacturer: data.manufacturer,
          interface: data.interface,
          specs: data.specs,
          defaultWiring: data.defaultWiring,
          snippetIds: data.snippetIds,
          datasheet: data.datasheet,
          notes: data.notes,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
    
    case 'snippet':
      return {
        id,
        title: data.name || '',
        content: data.code || data.description || '',
        projectType: 'mcu',
        category: 'snippet',
        tags: data.tags || [],
        metadata: {
          language: data.language,
          snippetCategory: data.category,
          description: data.description,
          code: data.code,
          usage: data.usage,
          dependencies: data.dependencies,
          platformIds: data.platformIds,
          peripheralIds: data.peripheralIds,
          sourceProject: data.sourceProject,
          sourceFile: data.sourceFile,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
    
    case 'debug':
      return {
        id,
        title: data.title || '',
        content: data.solution || data.symptom || '',
        projectType: 'mcu',
        category: 'debug',
        tags: data.tags || [],
        severity: data.severity,
        metadata: {
          symptom: data.symptom,
          errorLog: data.errorLog,
          rootCause: data.rootCause,
          solution: data.solution,
          solutionCode: data.solutionCode,
          environment: data.environment,
          relatedSnippetIds: data.relatedSnippetIds,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
      
    case 'config':
      return {
        id,
        title: data.name || '',
        content: data.description || '',
        projectType: 'mcu',
        category: 'config',
        tags: data.tags || [],
        metadata: {
          description: data.description,
          files: data.files,
          platformId: data.platformId,
          peripheralIds: data.peripheralIds,
          sourceProject: data.sourceProject,
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
    
    default:
      return {
        id,
        title: data.title || data.name || '',
        content: data.content || data.description || '',
        projectType: 'mcu',
        category,
        tags: data.tags || [],
        metadata: data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
  }
}

function createWindow() {
  // 应用图标：与面板内 Nexus 旁的图标一致，使用 public/icon.png
  const iconPath = isDev
    ? path.join(app.getAppPath(), 'public', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png')

  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 750,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0a0a0a'
  })

  // macOS Dock 图标：与窗口一致，使用 public/icon.png
  if (process.platform === 'darwin' && fs.existsSync(iconPath)) {
    app.dock.setIcon(iconPath)
  }

  // 阻止外部链接在 Electron 内打开新窗口，改为系统浏览器
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // 窗口获得焦点时通知渲染进程，便于项目管理等页面自动刷新
  mainWindow.on('focus', () => {
    mainWindow.webContents.send('app:focus')
  })

  if (isDev) {
    let port = 5173
    try {
      const portPath = path.join(__dirname, '..', '.vite-dev-port')
      if (fs.existsSync(portPath)) {
        const p = parseInt(fs.readFileSync(portPath, 'utf-8').trim(), 10)
        if (p > 0) port = p
      }
    } catch (_) {}
    const resetOnboarding = process.env.RESET_ONBOARDING === '1'
    mainWindow.loadURL(`http://localhost:${port}${resetOnboarding ? '?resetOnboarding=1' : ''}`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC 处理器 - 文件操作
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const fullPath = path.join(DATA_DIR, filePath)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8')
    }
    return null
  } catch (error) {
    logger.error('Error reading file:', error)
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  try {
    const fullPath = path.join(DATA_DIR, filePath)
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fullPath, content, 'utf-8')
    return true
  } catch (error) {
    logger.error('Error writing file:', error)
    return false
  }
})

ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  try {
    const fullPath = path.join(DATA_DIR, filePath)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
    return true
  } catch (error) {
    logger.error('Error deleting file:', error)
    return false
  }
})

ipcMain.handle('fs:listFiles', async (_, dirPath: string) => {
  try {
    const fullPath = path.join(DATA_DIR, dirPath)
    if (fs.existsSync(fullPath)) {
      return fs.readdirSync(fullPath)
    }
    return []
  } catch (error) {
    logger.error('Error listing files:', error)
    return []
  }
})

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  const fullPath = path.join(DATA_DIR, filePath)
  return fs.existsSync(fullPath)
})

ipcMain.handle('fs:getDataDir', async () => {
  return DATA_DIR
})

// ============================================================
// 模板配置 IPC
// ============================================================

ipcMain.handle('template:get', async () => {
  return loadTemplateConfig()
})

ipcMain.handle('template:update', async (_, config: any) => {
  return saveTemplateConfig(config)
})

ipcMain.handle('template:reset', async () => {
  // 删除配置文件，返回默认配置
  try {
    if (fs.existsSync(TEMPLATE_CONFIG_FILE)) {
      fs.unlinkSync(TEMPLATE_CONFIG_FILE)
    }
  } catch (e) {
    logger.error('删除模板配置失败:', e)
  }
  return { ...DEFAULT_TEMPLATE_CONFIG }
})


// 读取 Markdown 文件并解析 frontmatter
ipcMain.handle('fs:readMarkdown', async (_, filePath: string) => {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(DATA_DIR, filePath)
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8')
    const parsed = parseMarkdownWithFrontmatter(content)
    const stats = fs.statSync(fullPath)
    return {
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
    }
  } catch (error) {
    logger.error('Error reading markdown:', error)
    return null
  }
})

// 项目导入相关 IPC
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择项目文件夹'
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

/** 选择配置文件（project.yaml 等）并返回内容，用于「从文件加载配置」 */
ipcMain.handle('dialog:selectConfigFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: '选择配置文件 (project.yaml 或 .json)',
    filters: [
      { name: 'YAML / JSON', extensions: ['yaml', 'yml', 'json'] },
      { name: 'All', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8')
      return { path: result.filePaths[0], content }
    } catch (e) {
      logger.error('Read config file error:', e)
      return null
    }
  }
  return null
})

/** 解析配置文件内容为 SilProjectConfig，用于「从文件加载配置」 */
ipcMain.handle('config:parseProjectConfig', (_, content: string) => {
  try {
    const raw = content.trim().startsWith('{')
      ? JSON.parse(content)
      : parseSimpleYaml(content)
    const projectType = raw.projectType || raw.knowledgeCategory || 'mcu'
    return {
      id: raw.id,
      name: raw.name || '',
      description: raw.description || '',
      chip: raw.chip || '',
      framework: raw.framework || '',
      peripherals: Array.isArray(raw.peripherals) ? raw.peripherals : [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      githubUrl: raw.githubUrl || '',
      projectType,
    }
  } catch (e) {
    logger.error('Parse project config error:', e)
    return null
  }
})

ipcMain.handle('project:analyze', async (_, projectPath: string) => {
  try {
    const analysis = await analyzeProject(projectPath)
    return analysis
  } catch (error) {
    logger.error('Error analyzing project:', error)
    return null
  }
})

// 开发库默认配置路径（不写死用户名，便于开源）
ipcMain.handle('project:getDefaultReposConfigPath', async () => {
  return path.join(os.homedir(), 'Workshop', 'MCU', '_github', 'repos.json')
})
ipcMain.handle('project:getDefaultReposBasePath', async () => {
  return path.join(os.homedir(), 'Workshop', 'MCU', '_github')
})

ipcMain.handle('project:readFile', async (_, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8')
    }
    return null
  } catch (error) {
    return null
  }
})

ipcMain.handle('project:writeFile', async (_, filePath: string, content: string) => {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
    return true
  } catch (error) {
    logger.error('Error writing file:', error)
    return false
  }
})

ipcMain.handle('project:deleteFile', async (_, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return true
  } catch (error) {
    logger.error('Error deleting file:', error)
    return false
  }
})

ipcMain.handle('project:listDir', async (_, dirPath: string) => {
  try {
    if (fs.existsSync(dirPath)) {
      return fs.readdirSync(dirPath)
    }
    return []
  } catch (error) {
    logger.error('Error listing directory:', error)
    return []
  }
})

ipcMain.handle('project:exists', async (_, filePath: string) => {
  return fs.existsSync(filePath)
})

// 获取目录最后修改时间
ipcMain.handle('project:getLastModified', async (_, projectPath: string) => {
  try {
    if (!fs.existsSync(projectPath)) return null
    const stats = fs.statSync(projectPath)
    return stats.mtime.toISOString()
  } catch {
    return null
  }
})

// 验证项目路径并尝试修复路径变化
// 返回: { valid: true } 或 { valid: false, newPath?: string, reason: string }
ipcMain.handle('project:verifyPath', async (_, project: { id: string, path: string, projectType?: string }) => {
  try {
    // 1. 检查原路径是否存在
    if (fs.existsSync(project.path)) {
      return { valid: true }
    }
    
    // 2. 路径不存在，尝试通过 ID 在可能的目录中查找
    const searchDirs: string[] = []
    
    // 根据项目类型确定搜索目录（仅用用户主目录下的 Workshop，不写死用户名）
    const workshop = path.join(os.homedir(), 'Workshop')
    const typeBaseDirs: Record<string, string[]> = {
      mcu: [path.join(workshop, 'MCU')],
      ai: [path.join(workshop, 'AI')],
      software: [path.join(workshop, 'Software'), os.homedir()],
      linux: [path.join(workshop, 'Linux')],
      other: [workshop, os.homedir()],
    }
    
    // 添加项目类型对应的目录
    const baseDirs = typeBaseDirs[project.projectType || 'other'] || typeBaseDirs.other
    searchDirs.push(...baseDirs)
    
    // 也搜索原路径的父目录（可能只是重命名）
    const originalParent = path.dirname(project.path)
    if (fs.existsSync(originalParent) && !searchDirs.includes(originalParent)) {
      searchDirs.unshift(originalParent)
    }
    
    // 3. 在搜索目录中查找带有 .nexus/project.yaml 且 ID 匹配的项目
    for (const baseDir of searchDirs) {
      if (!fs.existsSync(baseDir)) continue
      
      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          
          const candidatePath = path.join(baseDir, entry.name)
          const projectYamlPath = path.join(candidatePath, '.nexus', 'project.yaml')
          
          if (fs.existsSync(projectYamlPath)) {
            try {
              const yamlContent = fs.readFileSync(projectYamlPath, 'utf-8')
              // 简单解析 YAML 中的 id 字段
              const idMatch = yamlContent.match(/^id:\s*["']?([^"'\n]+)["']?/m)
              if (idMatch && idMatch[1] === project.id) {
                logger.info(`项目路径变化检测: ${project.path} -> ${candidatePath}`)
                return {
                  valid: false,
                  newPath: candidatePath,
                  reason: '项目文件夹已重命名或移动'
                }
              }
            } catch {
              // 读取或解析失败，跳过
            }
          }
        }
      } catch {
        // 目录读取失败，跳过
      }
    }
    
    // 4. 没有找到匹配的项目
    return {
      valid: false,
      reason: '项目路径不存在，且未能在常用目录中找到'
    }
  } catch (error) {
    logger.error('验证项目路径失败:', error)
    return { valid: false, reason: '验证失败: ' + (error as Error).message }
  }
})

// 批量验证多个项目的路径
ipcMain.handle('project:verifyPaths', async (_, projects: Array<{ id: string, path: string, projectType?: string }>) => {
  const results: Record<string, { valid: boolean, newPath?: string, reason?: string }> = {}
  
  for (const project of projects) {
    try {
      if (fs.existsSync(project.path)) {
        results[project.id] = { valid: true }
      } else {
        // 调用单个验证
        const result = await new Promise<any>((resolve) => {
          // 复用上面的逻辑
          const searchDirs: string[] = []
          const workshop = path.join(os.homedir(), 'Workshop')
          const typeBaseDirs: Record<string, string[]> = {
            mcu: [path.join(workshop, 'MCU')],
            ai: [path.join(workshop, 'AI')],
            software: [path.join(workshop, 'Software'), os.homedir()],
            linux: [path.join(workshop, 'Linux')],
            other: [workshop, os.homedir()],
          }
          
          const baseDirs = typeBaseDirs[project.projectType || 'other'] || typeBaseDirs.other
          searchDirs.push(...baseDirs)
          
          const originalParent = path.dirname(project.path)
          if (fs.existsSync(originalParent) && !searchDirs.includes(originalParent)) {
            searchDirs.unshift(originalParent)
          }
          
          for (const baseDir of searchDirs) {
            if (!fs.existsSync(baseDir)) continue
            
            try {
              const entries = fs.readdirSync(baseDir, { withFileTypes: true })
              for (const entry of entries) {
                if (!entry.isDirectory()) continue
                
                const candidatePath = path.join(baseDir, entry.name)
                const projectYamlPath = path.join(candidatePath, '.nexus', 'project.yaml')
                
                if (fs.existsSync(projectYamlPath)) {
                  try {
                    const yamlContent = fs.readFileSync(projectYamlPath, 'utf-8')
                    const idMatch = yamlContent.match(/^id:\s*["']?([^"'\n]+)["']?/m)
                    if (idMatch && idMatch[1] === project.id) {
                      resolve({ valid: false, newPath: candidatePath, reason: '项目文件夹已重命名或移动' })
                      return
                    }
                  } catch {}
                }
              }
            } catch {}
          }
          
          resolve({ valid: false, reason: '项目路径不存在' })
        })
        
        results[project.id] = result
      }
    } catch {
      results[project.id] = { valid: false, reason: '验证出错' }
    }
  }
  
  return results
})

ipcMain.handle('project:createDir', async (_, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    return true
  } catch (error) {
    logger.error('Error creating directory:', error)
    return false
  }
})

// ============================================================
// Git 操作 IPC
// ============================================================

// 克隆时使用的环境：保证打包后也能找到 git（macOS 常见路径）
function getCloneEnv () {
  const env = { ...process.env }
  if (process.platform === 'darwin') {
    const extra = '/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'
    env.PATH = env.PATH ? `${extra}:${env.PATH}` : extra
  }
  return env
}

ipcMain.handle('git:clone', async (event, url: string, targetPath: string, branch?: string) => {
  const sender = event.sender
  const sendProgress = (data: { percent: number; speedText: string }) => {
    try { sender.send('git:clone:progress', data) } catch (_) { /* window closed */ }
  }

  try {
    const parentDir = path.dirname(targetPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    if (fs.existsSync(targetPath)) {
      const files = fs.readdirSync(targetPath)
      if (files.length > 0) {
        return { success: false, message: '目标目录不为空', error: 'Directory not empty' }
      }
    }

    const args = ['clone', '--progress', '--depth', '1']
    if (branch) args.push('-b', branch)
    args.push(url, targetPath)

    let stderrText = ''
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('git', args, {
        stdio: ['ignore', 'ignore', 'pipe'],
        env: getCloneEnv(),
      })
      let lastPercent = 0
      let lastSpeed = ''

      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        stderrText += text
        const lines = text.replace(/\r/g, '\n').split('\n')
        for (const line of lines) {
          const pct = line.match(/(\d+)%/)
          if (pct) lastPercent = Math.min(100, parseInt(pct[1], 10))
          const spd = line.match(/([\d.]+)\s*(MiB|KiB)\/s/i)
          if (spd) lastSpeed = `${spd[1]} ${spd[2]}/s`
        }
        if (lastPercent > 0 || lastSpeed) sendProgress({ percent: lastPercent, speedText: lastSpeed })
      })

      proc.on('error', (err: NodeJS.ErrnoException) => {
        reject(new Error(err.code === 'ENOENT' ? '未找到 Git，请先安装 Git' : err.message))
      })
      proc.on('close', (code, signal) => {
        if (code === 0) {
          sendProgress({ percent: 100, speedText: lastSpeed })
          resolve()
        } else {
          const firstLine = stderrText.trim().split('\n')[0]?.trim() || (signal ? `killed: ${signal}` : `exit ${code}`)
          reject(new Error(firstLine))
        }
      })
    })

    return { success: true, message: `克隆成功: ${path.basename(targetPath)}` }
  } catch (error: any) {
    logger.error('Git clone error:', error)
    const errMsg = error?.message || String(error)
    const short = errMsg.length > 200 ? errMsg.slice(0, 197) + '...' : errMsg
    return { success: false, message: '克隆失败', error: short }
  }
})

ipcMain.handle('git:pull', async (_, repoPath: string) => {
  try {
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: '目录不存在', error: 'Directory not found' }
    }
    
    // 检查是否是 git 仓库
    const gitDir = path.join(repoPath, '.git')
    if (!fs.existsSync(gitDir)) {
      return { success: false, message: '不是 Git 仓库', error: 'Not a git repository' }
    }
    
    const { stdout, stderr } = await execAsync('git pull', { 
      cwd: repoPath,
      timeout: 120000 // 2分钟超时
    })
    
    return { 
      success: true, 
      message: stdout.includes('Already up to date') ? '已是最新版本' : '更新成功'
    }
  } catch (error: any) {
    logger.error('Git pull error:', error)
    return { 
      success: false, 
      message: '拉取失败', 
      error: error.message || String(error) 
    }
  }
})

ipcMain.handle('git:status', async (_, repoPath: string) => {
  try {
    // 检查目录是否存在
    if (!fs.existsSync(repoPath)) {
      return { exists: false, isRepo: false }
    }
    
    // 检查是否是 git 仓库
    const gitDir = path.join(repoPath, '.git')
    if (!fs.existsSync(gitDir)) {
      return { exists: true, isRepo: false }
    }
    
    // 获取分支信息
    let branch = 'unknown'
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath })
      branch = stdout.trim() || 'HEAD detached'
    } catch {}
    
    // 获取最后提交信息
    let lastCommit = ''
    let lastCommitDate = ''
    try {
      const { stdout } = await execAsync('git log -1 --format="%s|%cr"', { cwd: repoPath })
      const parts = stdout.trim().split('|')
      lastCommit = parts[0] || ''
      lastCommitDate = parts[1] || ''
    } catch {}
    
    // 检查是否有未提交的更改
    let hasChanges = false
    let modified = 0
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath })
      const lines = stdout.trim().split('\n').filter(l => l.length > 0)
      modified = lines.length
      hasChanges = modified > 0
    } catch {}
    
    return {
      exists: true,
      isRepo: true,
      branch,
      hasChanges,
      modified,
      lastCommit,
      lastCommitDate
    }
  } catch (error) {
    logger.error('Git status error:', error)
    return { exists: true, isRepo: false }
  }
})

// ============================================================
// 系统操作 IPC
// ============================================================

ipcMain.handle('shell:openInFinder', async (_, targetPath: string) => {
  try {
    if (fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath)
      return true
    }
    return false
  } catch {
    return false
  }
})

ipcMain.handle('shell:openInTerminal', async (_, targetPath: string) => {
  try {
    if (!fs.existsSync(targetPath)) {
      return false
    }
    
    // macOS: 使用 Terminal.app 或 iTerm2
    if (process.platform === 'darwin') {
      // 尝试用默认终端打开
      await execAsync(`open -a Terminal "${targetPath}"`)
      return true
    }
    
    return false
  } catch {
    return false
  }
})

ipcMain.handle('shell:openInCursor', async (_, targetPath: string) => {
  try {
    if (!fs.existsSync(targetPath)) {
      return false
    }
    
    if (process.platform === 'darwin') {
      // macOS: 用 open -a 打开 Cursor 应用，不依赖 PATH 里的 cursor 命令（打包后 PATH 可能没有）
      await execAsync(`open -a "Cursor" "${targetPath}"`)
      return true
    }
    
    if (process.platform === 'win32') {
      // Windows: 尝试 cursor 命令（用户安装 Cursor 时可选加入 PATH）
      await execAsync(`cursor "${targetPath}"`)
      return true
    }
    
    // Linux
    await execAsync(`cursor "${targetPath}"`)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('shell:openExternal', async (_, url: string) => {
  try {
    await shell.openExternal(url)
    return true
  } catch {
    return false
  }
})

// 由类型表派生：项目类型 → 工作目录（含自定义类型）
function getProjectTypeDirs(): Record<string, string> {
  return Object.fromEntries(getMergedProjectTypeDefs().map(t => [t.id, t.dir]))
}

// 将 Nexus 项目名转为合法文件夹名（去掉非法字符）
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')  // 多个连字符合并为一个
    .replace(/^-|-$/g, '') // 去掉首尾的 -
    .trim() || 'project'
}

// 移动项目到对应类型目录，以 Nexus 项目管理中的名称为文件夹名
ipcMain.handle('project:moveToTypeDir', async (_, sourcePath: string, projectType: string, projectName?: string) => {
  try {
    const typeDir = getProjectTypeDirs()[projectType]
    if (!typeDir) {
      return { success: false, error: `未知的项目类型: ${projectType}`, newPath: sourcePath }
    }
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true })
    }
    
    // 传入 projectName 时用于克隆等场景（如 typeDir/repoName）；否则保持源路径文件夹名
    const folderName = (projectName && projectName.trim())
      ? sanitizeFolderName(projectName.trim())
      : path.basename(sourcePath)
    let targetPath = path.join(typeDir, folderName)
    
    if (path.resolve(sourcePath) === path.resolve(targetPath)) {
      return { success: true, newPath: targetPath, moved: false }
    }
    
    if (fs.existsSync(targetPath)) {
      let suffix = 1
      let newFolderName = `${folderName}-${suffix}`
      targetPath = path.join(typeDir, newFolderName)
      while (fs.existsSync(targetPath) && suffix < 100) {
        suffix++
        newFolderName = `${folderName}-${suffix}`
        targetPath = path.join(typeDir, newFolderName)
      }
      if (suffix >= 100) {
        return { success: false, error: '目标目录已存在太多同名项目', newPath: sourcePath }
      }
    }
    
    await execAsync(`mv "${sourcePath}" "${targetPath}"`)
    return { success: true, newPath: targetPath, moved: true }
  } catch (error: any) {
    logger.error('移动项目目录失败:', error)
    return { success: false, error: error.message, newPath: sourcePath }
  }
})

// 将 Workshop 中的项目文件夹重命名为 Nexus 中的项目名（同步文件夹名）
ipcMain.handle('project:renameFolderToMatchName', async (_, projectPath: string, projectDisplayName: string) => {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: '路径不存在', newPath: projectPath }
    }
    const parentDir = path.dirname(projectPath)
    const currentFolderName = path.basename(projectPath)
    const targetFolderName = sanitizeFolderName(projectDisplayName)
    if (currentFolderName === targetFolderName) {
      return { success: true, newPath: projectPath, skipped: true }
    }
    let targetPath = path.join(parentDir, targetFolderName)
    if (fs.existsSync(targetPath) && path.resolve(targetPath) !== path.resolve(projectPath)) {
      let suffix = 1
      while (fs.existsSync(path.join(parentDir, `${targetFolderName}-${suffix}`))) {
        suffix++
        if (suffix >= 100) {
          return { success: false, error: '目标名称已存在且无法生成新名称', newPath: projectPath }
        }
      }
      targetPath = path.join(parentDir, `${targetFolderName}-${suffix}`)
    }
    await execAsync(`mv "${projectPath}" "${targetPath}"`)
    return { success: true, newPath: targetPath, skipped: false }
  } catch (error: any) {
    logger.error('重命名项目文件夹失败:', error)
    return { success: false, error: error.message, newPath: projectPath }
  }
})

// 获取项目类型对应的目录
ipcMain.handle('project:getTypeDir', async (_, projectType: string) => {
  return getProjectTypeDirs()[projectType] || path.join(os.homedir(), 'Workshop', 'Other')
})

ipcMain.handle('project:getCustomTypes', () => loadCustomProjectTypes())
ipcMain.handle('project:addCustomType', (_, payload: { id: string; name: string; icon?: string; color?: string }) => {
  const list = loadCustomProjectTypes()
  const id = (payload.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'custom'
  if (list.some(t => t.id === id)) return { success: false, error: '该类型 ID 已存在' }
  list.push({
    id,
    name: (payload.name || id).trim(),
    icon: payload.icon ?? '📁',
    color: payload.color ?? '#8c8c8c',
    templateRef: 'software',
  })
  return saveCustomProjectTypes(list) ? { success: true, type: list[list.length - 1] } : { success: false, error: '保存失败' }
})

// 删除项目目录（移动到废纸篓）
ipcMain.handle('project:deleteDir', async (_, projectPath: string) => {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: true, message: '目录不存在' }
    }
    
    // 安全检查：只允许删除用户 Workshop 或 /tmp 下的目录
    const workshopDir = path.join(os.homedir(), 'Workshop') + path.sep
    const safePaths = [workshopDir, '/tmp/']
    const isSafe = safePaths.some(safe => projectPath.startsWith(safe))
    if (!isSafe) {
      return { success: false, error: '安全限制：只能删除 Workshop 目录下的项目' }
    }
    
    // 使用 trash 命令移动到废纸篓（macOS）
    if (process.platform === 'darwin') {
      await execAsync(`osascript -e 'tell application "Finder" to delete POSIX file "${projectPath}"'`)
      return { success: true, message: '已移动到废纸篓' }
    } else {
      // 其他平台直接删除
      fs.rmSync(projectPath, { recursive: true, force: true })
      return { success: true, message: '已删除' }
    }
  } catch (error: any) {
    logger.error('删除项目目录失败:', error)
    return { success: false, error: error.message }
  }
})

// ============================================================
// .nexus 项目管理 IPC
// ============================================================

const SIL_DIR = '.nexus'
const SIL_SUBDIRS = ['notes', 'debug', 'snippets', 'configs', 'other']

// 根据模板配置生成 Cursor Rules 内容
function generateCursorRulesFromTemplate(projectConfig: any, templateConfig: typeof DEFAULT_TEMPLATE_CONFIG): string {
  const { templates } = templateConfig
  
  // 为每种文档类型生成格式说明
  const generateTemplateGuide = (template: typeof templates.debug, dirName: string) => {
    const fields = template.frontmatterFields
      .map(f => {
        let example = ''
        if (f.type === 'tags') example = '[tag1, tag2]'
        else if (f.type === 'select' && f.options) example = f.options[0]
        else if (f.type === 'date') example = 'YYYY-MM-DD'
        else if (f.default) example = String(f.default)
        else example = f.placeholder || '...'
        return `${f.name}: ${example}  # ${f.label}${f.required ? ' (必填)' : ''}`
      })
      .join('\n')
    
    return `### ${template.name} (.nexus/${dirName}/)
${template.description}

**文档格式：**
\`\`\`markdown
---
${fields}
---

${template.contentTemplate}
\`\`\`

**AI 生成指导：**
${template.aiPrompt}
`
  }
  
  return `# Nexus 项目开发规则

## 项目信息

- **项目名称**: ${projectConfig.name}
- **芯片**: ${projectConfig.chip || '未指定'}
- **框架**: ${projectConfig.framework || '未指定'}
- **外设**: ${(projectConfig.peripherals || []).join(', ') || '无'}

## 开发经验记录

此项目由 Nexus 管理，开发过程中请注意记录有价值的经验。

当用户说 "帮我记录这个调试经验"、"保存这个代码片段"、"记个笔记" 等类似指令时，
AI 应该按照下面的模板格式生成文档并保存到对应目录。

---

${generateTemplateGuide(templates.debug, 'debug')}

---

${generateTemplateGuide(templates.snippet, 'snippets')}

---

${generateTemplateGuide(templates.note, 'notes')}

（\`notes/\` 同步到笔记库，按项目类型在笔记面板分类。）

---

${generateTemplateGuide(templates.config, 'configs')}

---

${(templates as any).other ? generateTemplateGuide((templates as any).other, 'other') : '### 其他 (.nexus/other/)\n未归入以上类型时放入此处，同步到知识库「其他」类。\n'}

---

## 知识库与笔记库

- **知识库**仅允许 4 类：调试经验(debug)、代码片段(snippets)、配置模板(configs)、其他(other)。
- **笔记库**：\`.nexus/notes/\` 的文档同步到笔记库，仅在笔记面板展示，按项目类型分类。

## 同步到知识库

开发完成后，回到 Nexus 应用点击「一键导入」，将经验同步到全局知识库。

## 通用设置

- 自动添加时间戳: ${templateConfig.settings.autoAddTimestamp ? '是' : '否'}
- 默认标签: ${templateConfig.settings.defaultTags.join(', ') || '无'}
- AI 分析启用: ${templateConfig.settings.aiAnalysisEnabled ? '是' : '否'}
`
}

// 初始化 .nexus 项目目录（统一使用一份模板配置，不按项目类型区分）
// 一键加载配置时强制使用固定 4 类知识分类，保证各项目 .nexus 配置一致
ipcMain.handle('sil:init', async (_, projectPath: string, config: any) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    
    const projectType = config.projectType ?? config.knowledgeCategory ?? 'mcu'
    const templateConfig = loadTemplateConfig()
    // 强制 .nexus 使用固定 4 类，与模板解耦，便于一键加载配置同步
    const nexusConfig = {
      ...templateConfig,
      knowledgeCategories: FIXED_KNOWLEDGE_CATEGORIES_FOR_NEXUS,
    }
    logger.info(`初始化 .nexus projectType: ${projectType}, 知识分类: 4 类统一（一份模板）`)
    
    if (!fs.existsSync(silPath)) {
      fs.mkdirSync(silPath, { recursive: true })
    }
    const subdirs = getSilSubdirs(nexusConfig)
    for (const subdir of subdirs) {
      const subdirPath = path.join(silPath, subdir)
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true })
      }
    }
    
    const projectConfig = {
      id: config.id || `proj_${Date.now()}`,
      projectType,
      name: config.name || path.basename(projectPath),
      description: config.description || '',
      chip: config.chip || '',
      framework: config.framework || '',
      peripherals: config.peripherals || [],
      tags: config.tags || [],
      githubUrl: config.githubUrl || '',
      createdAt: new Date().toISOString(),
    }
    
    const yamlContent = Object.entries(projectConfig)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length === 0) return `${key}: []`
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
        }
        return `${key}: "${value}"`
      })
      .join('\n')
    
    fs.writeFileSync(path.join(silPath, 'project.yaml'), yamlContent, 'utf-8')
    
    // 写入项目的 .nexus 配置（固定 4 类）
    fs.writeFileSync(
      path.join(silPath, 'templates.json'),
      JSON.stringify(nexusConfig, null, 2),
      'utf-8'
    )
    
    const { templates } = nexusConfig
    const readmeContent = `# ${projectConfig.name}

> 此目录由 Nexus 管理，存储项目开发经验和笔记。

## 目录结构

- \`notes/\` - 笔记（同步到笔记库，仅在笔记面板展示）
- \`debug/\` - 调试经验（知识库）
- \`snippets/\` - 代码片段（知识库）
- \`configs/\` - 配置模板（知识库）
- \`other/\` - 其他（知识库）

知识库 4 类 + 笔记库，详见 \`templates.json\`。

### 调试经验示例

\`\`\`markdown
${templates.debug.contentTemplate}
\`\`\`

### 代码片段示例

\`\`\`markdown
${templates.snippet.contentTemplate}
\`\`\`

## 模板配置

项目使用的模板配置保存在 \`templates.json\`，可在 Nexus 应用的「模板设置」中自定义。
`
    fs.writeFileSync(path.join(silPath, 'README.md'), readmeContent, 'utf-8')
    
    // 创建 .cursor/rules/nexus.mdc 项目规则（使用自定义模板配置）
    const cursorRulesDir = path.join(projectPath, '.cursor', 'rules')
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true })
    }
    
    const cursorRuleContent = generateCursorRulesFromTemplate(projectConfig, nexusConfig)
    fs.writeFileSync(path.join(cursorRulesDir, 'nexus.mdc'), cursorRuleContent, 'utf-8')
    
    // 记录项目使用的模板版本（统一一份模板）
    recordProjectTemplateUsage(projectPath, projectConfig.name, templateConfig.version)
    
    return true
  } catch (error) {
    logger.error('Error initializing .nexus:', error)
    return false
  }
})

// 扫描 .nexus 项目目录
ipcMain.handle('sil:scan', async (_, projectPath: string) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    
    if (!fs.existsSync(silPath)) {
      return null
    }
    
    // 读取 project.yaml
    const configPath = path.join(silPath, 'project.yaml')
    let config: any = {}
    
    if (fs.existsSync(configPath)) {
      const yamlContent = fs.readFileSync(configPath, 'utf-8')
      // 简单解析 YAML
      config = parseSimpleYaml(yamlContent)
    }
    
    // 扫描所有文档
    const documents: any[] = []
    
    for (const subdir of SIL_SUBDIRS) {
      const subdirPath = path.join(silPath, subdir)
      if (!fs.existsSync(subdirPath)) continue
      
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.md'))
      
      for (const file of files) {
        const filePath = path.join(subdirPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const parsed = parseMarkdownWithFrontmatter(content)
        
        const typeMap: Record<string, string> = { notes: 'note', debug: 'debug', note: 'note', snippets: 'snippet', configs: 'config', other: 'other' }
        documents.push({
          id: `${subdir}/${file.replace('.md', '')}`,
          filename: file,
          type: (typeMap[subdir] || 'other') as any,
          title: parsed.frontmatter.title || file.replace('.md', ''),
          content: parsed.content,
          tags: parsed.frontmatter.tags || [],
          createdAt: parsed.frontmatter.created || fs.statSync(filePath).birthtime.toISOString(),
          updatedAt: fs.statSync(filePath).mtime.toISOString(),
        })
      }
    }
    
    return {
      config,
      documents,
      hasChanges: false,
      lastSyncAt: config.lastSyncAt,
    }
  } catch (error) {
    logger.error('Error scanning .nexus:', error)
    return null
  }
})

// 用 AI 分析文档内容；按 projectCategory（mcu/software/ai）使用对应知识库的文档选项进行归类
async function analyzeDocWithAI(
  content: string,
  type: string,
  filename: string,
  apiKey: string,
  projectCategory: 'mcu' | 'software' | 'ai' | 'remote' = 'mcu'
): Promise<any> {
  const categoryHints = {
    mcu: {
      debug: 'platform 填芯片/开发板（如 ESP32-S3），framework 填开发框架（如 ESP-IDF 5.x）',
      snippets: 'language 填 c/cpp/python 等，category 填 driver/algorithm/utility/config/template/other 之一',
      configs: 'platform 填如 ESP-IDF 5.x，configType 可为 build/env/device/network/other',
    },
    software: {
      debug: 'platform 填运行环境（如 Node, Vue, React）',
      snippets: 'language 填 javascript/typescript/python 等，category 填 frontend/backend/utility/config/script/other 之一',
      configs: 'platform 填如 Vite, Docker，configType 可为 build/env/deploy/network/other',
    },
    ai: {
      debug: 'platform 填框架或平台（如 PyTorch, TensorFlow）',
      snippets: 'language 填 python 等，category 填 ml/pipeline/utility/config/script/other 之一',
      configs: 'platform 填如 Conda, Docker，configType 可为 build/env/deploy/network/other',
    },
    remote: {
      debug: 'platform 填远程/运维环境（如 SSH, VNC, 服务器）',
      snippets: 'language 填 shell/python 等，category 填 connection/deployment/monitoring/utility/config/script/other 之一',
      configs: 'platform 填如 SSH, systemd, Docker，configType 可为 build/env/deploy/network/other',
    },
  }
  const hints = categoryHints[projectCategory]
  const hintLine = type === 'debug' ? hints.debug : type === 'snippets' ? hints.snippets : type === 'configs' ? hints.configs : ''

  const prompts: Record<string, string> = {
    debug: `分析这篇调试经验文档，提取关键信息，返回 JSON 格式：
{
  "title": "简洁的问题标题（中文，10-20字）",
  "symptom": "问题现象描述",
  "rootCause": "根本原因分析",
  "solution": "解决方案",
  "solutionCode": "关键代码（如有）",
  "severity": "严重程度（critical/major/minor/trivial）",
  "tags": ["标签1", "标签2"],
  "platform": "涉及平台（见下方说明）",
  "framework": "开发框架或运行环境（见下方说明）"
}
说明（请按本项目知识库类别填写）：${hintLine}`,
    notes: `分析这篇笔记文档，提取关键信息，返回 JSON 格式：
{
  "title": "笔记标题（中文，简洁明了）",
  "summary": "内容摘要（50字以内）",
  "category": "分类（必须是以下之一）",
  "tags": ["标签1", "标签2", "标签3"]
}

笔记分类（任选其一）：learning / summary / design / issue / reference`,
    snippets: `分析这篇代码片段文档，提取关键信息，返回 JSON 格式：
{
  "name": "代码片段名称（中文）",
  "description": "功能描述（30字以内）",
  "language": "编程语言（见下方说明）",
  "code": "核心代码内容",
  "tags": ["标签1", "标签2"]
}
说明（请按本项目知识库类别填写）：${hintLine}`,
    configs: `分析这篇配置文档，提取关键信息，返回 JSON 格式：
{
  "name": "配置名称（中文）",
  "description": "配置说明",
  "platform": "适用平台（见下方说明）",
  "framework": "开发框架",
  "tags": ["标签1", "标签2"]
}
说明（请按本项目知识库类别填写）：${hintLine}`,
  }

  const opts = getAiRequestOptions(apiKey)
  if (!opts) return null
  try {
    const prompt = `${prompts[type]}\n\n文件名: ${filename}\n\n文档内容:\n${content.substring(0, 3000)}`
    const retryResult = await callAIWithRetry(opts, prompt, { maxRetries: 2 })
    
    if (!retryResult.success || !retryResult.data) {
      return null
    }
    
    const text = retryResult.data
    // 提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    logger.error('AI 分析失败:', e)
  }
  return null
}

// 检测项目是否有待同步的新文档
ipcMain.handle('sil:checkPending', async (_, projectPath: string, projectType?: string) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    if (!fs.existsSync(silPath)) {
      return { hasPending: false, pendingCount: 0, details: {} }
    }
    
    const projectName = path.basename(projectPath)
    // 与 syncFrom 一致：优先 .nexus/project.yaml 的 knowledgeCategory，再前端类型，再路径推断
    const resolvedType = getProjectKnowledgeCategory(projectPath) || projectType || detectProjectType(projectPath)
    let pendingCount = 0
    const details: Record<string, number> = {}
    
    // 检查每个子目录
    for (const subdir of SIL_SUBDIRS) {
      const sourceDir = path.join(silPath, subdir)
      if (!fs.existsSync(sourceDir)) continue
      
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'))
      let subdirPending = 0
      
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
      const targetDir = subdir === 'notes'
        ? path.join(DATA_DIR, 'notes')
        : path.join(DATA_DIR, 'knowledge', resolvedType)
      // 与 syncFrom 一致：笔记 notes/ProjectName-file.json，知识库扁平 knowledge/type/ProjectName-silDir-baseName.json
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file)
        const sourceStats = fs.statSync(sourcePath)
        const sourceModTime = sourceStats.mtime.getTime()
        const baseName = file.replace('.md', '')
        const targetFilename = subdir === 'notes'
          ? `${safeProjectName}-${file.replace('.md', '.json')}`
          : `${safeProjectName}-${subdir}-${baseName}.json`
        const targetPath = path.join(targetDir, targetFilename)
        if (!fs.existsSync(targetPath)) {
          subdirPending++
        } else {
          const targetStats = fs.statSync(targetPath)
          if (sourceStats.mtime.getTime() > targetStats.mtime.getTime()) subdirPending++
        }
      }
      
      if (subdirPending > 0) {
        details[subdir] = subdirPending
        pendingCount += subdirPending
      }
    }
    
    return {
      hasPending: pendingCount > 0,
      pendingCount,
      details // { debug: 2, notes: 1, ... }
    }
  } catch (error) {
    logger.error('检测待同步文档失败:', error)
    return { hasPending: false, pendingCount: 0, details: {} }
  }
})

// 检测项目中「已在 Nexus 同步、但项目内源 .md 已删除」的条目（供刷新后展示红色删除）
ipcMain.handle('sil:checkRemovedDocs', async (
  _,
  projectPath: string,
  payload: { knowledge: Array<{ id: string; category: string; projectType: string }>; notes: string[] }
) => {
  const silPath = path.join(projectPath, SIL_DIR)
  if (!fs.existsSync(silPath)) {
    return { removedKnowledgeIds: [] as string[], removedNoteIds: [] as string[] }
  }
  const projectName = path.basename(projectPath)
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
  const prefix = safeProjectName + '-'
  const removedKnowledgeIds: string[] = []
  const removedNoteIds: string[] = []
  // 笔记 id = ProjectName-baseName → .nexus/notes/baseName.md
  const toNoteSourceMd = (id: string) => {
    const base = id.startsWith(prefix) ? id.slice(prefix.length) : id
    return base + '.md'
  }
  // 知识库 id = ProjectName-silDir-baseName（扁平）→ .nexus/silDir/baseName.md
  const catToSilDir: Record<string, string> = { debug: 'debug', snippet: 'snippets', config: 'configs', other: 'other' }
  for (const id of payload.notes) {
    const sourceMd = toNoteSourceMd(id)
    const sourcePath = path.join(silPath, 'notes', sourceMd)
    if (!fs.existsSync(sourcePath)) removedNoteIds.push(id)
  }
  for (const { id, category } of payload.knowledge) {
    const silDir = catToSilDir[category] || 'other'
    const rest = id.startsWith(prefix) ? id.slice(prefix.length) : id
    const baseName = rest.startsWith(silDir + '-') ? rest.slice(silDir.length + 1) : rest
    const sourceMd = baseName + '.md'
    const sourcePath = path.join(silPath, silDir, sourceMd)
    if (!fs.existsSync(sourcePath)) removedKnowledgeIds.push(id)
  }
  return { removedKnowledgeIds, removedNoteIds }
})

// 发送同步进度到渲染进程
function sendSyncProgress(step: string, current: number, total: number, file?: string) {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    win.webContents.send('sync:progress', { step, current, total, file })
  }
}

// 根据项目路径推断项目类型
function detectProjectType(projectPath: string): string {
  const normalizedPath = projectPath.toLowerCase()
  for (const [type, dir] of Object.entries(getProjectTypeDirs())) {
    if (normalizedPath.includes(dir.toLowerCase())) {
      return type
    }
  }
  // 默认返回 mcu
  return 'mcu'
}

function getProjectTypeIds(): string[] {
  return getMergedProjectTypeDefs().map(t => t.id)
}

/** 从 .nexus/project.yaml 读取项目类型（优先 projectType，兼容旧字段 knowledgeCategory） */
function getProjectType(projectPath: string): string | null {
  const silPath = path.join(projectPath, SIL_DIR)
  const configPath = path.join(silPath, 'project.yaml')
  if (!fs.existsSync(configPath)) return null
  try {
    const config = parseSimpleYaml(fs.readFileSync(configPath, 'utf-8'))
    const id = config.projectType || config.knowledgeCategory
    if (typeof id === 'string' && getProjectTypeIds().includes(id)) return id
    return null
  } catch {
    return null
  }
}

/** @deprecated 改用 getProjectType；保留别名便于过渡 */
function getProjectKnowledgeCategory(projectPath: string): string | null {
  return getProjectType(projectPath)
}

/** 知识库固定 4 类（笔记仅保留在笔记面板），含 silDir 用于 .nexus 与一键加载配置 */
const FIXED_KNOWLEDGE_CATS = [
  { id: 'debug', name: '调试经验', icon: '🐛' },
  { id: 'snippet', name: '代码片段', icon: '📝' },
  { id: 'config', name: '配置模板', icon: '⚙️' },
  { id: 'other', name: '其他', icon: '📁' },
]
const FIXED_KNOWLEDGE_CATEGORIES_FOR_NEXUS = [
  { id: 'debug', name: '调试经验', icon: '🐛', silDir: 'debug' },
  { id: 'snippet', name: '代码片段', icon: '📝', silDir: 'snippets' },
  { id: 'config', name: '配置模板', icon: '⚙️', silDir: 'configs' },
  { id: 'other', name: '其他', icon: '📁', silDir: 'other' },
]
function getKnowledgeCategoriesForProjectType(_projectType: string): { id: string; name: string; icon: string }[] {
  return FIXED_KNOWLEDGE_CATS
}

// 清理知识库（保留目录结构，删除所有 JSON 文件）
ipcMain.handle('knowledge:getCategoriesForType', (_, projectType: string) =>
  getKnowledgeCategoriesForProjectType(projectType)
)

ipcMain.handle('knowledge:clear', async () => {
  try {
    const knowledgeDir = path.join(DATA_DIR, 'knowledge')
    if (!fs.existsSync(knowledgeDir)) {
      return { success: true, deleted: 0 }
    }
    
    let deleted = 0
    
    // 递归删除所有知识库数据文件（.json 和 .md）
    function clearDir(dir: string) {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)
        if (stat.isDirectory()) {
          clearDir(itemPath)
        } else if (item.endsWith('.json') || item.endsWith('.md')) {
          fs.unlinkSync(itemPath)
          deleted++
        }
      }
    }
    
    clearDir(knowledgeDir)
    
    // 同时清理 notes 目录
    const notesDir = path.join(DATA_DIR, 'notes')
    if (fs.existsSync(notesDir)) {
      const noteFiles = fs.readdirSync(notesDir).filter(f => f.endsWith('.json') || f.endsWith('.md'))
      for (const file of noteFiles) {
        fs.unlinkSync(path.join(notesDir, file))
        deleted++
      }
    }
    
    return { success: true, deleted }
  } catch (error) {
    logger.error('清理知识库失败:', error)
    return { success: false, deleted: 0, error: (error as Error).message }
  }
})

const LOCAL_PROJECTS_FILE = 'local-projects.json'

/** 删除单个项目内的 .nexus 目录 */
ipcMain.handle('sil:removeNexusDir', async (_, projectPath: string) => {
  try {
    const nexusPath = path.join(projectPath, '.nexus')
    if (!fs.existsSync(nexusPath)) return { success: true, removed: false }
    fs.rmSync(nexusPath, { recursive: true, force: true })
    return { success: true, removed: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

/** 清空所有笔记/知识库文档并删除所有项目内的 .nexus，便于重新配置 */
ipcMain.handle('sil:resetAllSyncData', async () => {
  const errors: string[] = []
  let centralDeleted = 0

  try {
    // 1. 清空中央知识库 + 笔记
    const knowledgeDir = path.join(DATA_DIR, 'knowledge')
    if (fs.existsSync(knowledgeDir)) {
      const clearDir = (dir: string) => {
        const items = fs.readdirSync(dir)
        for (const item of items) {
          const itemPath = path.join(dir, item)
          if (fs.statSync(itemPath).isDirectory()) clearDir(itemPath)
          else if (item.endsWith('.json') || item.endsWith('.md')) {
            fs.unlinkSync(itemPath)
            centralDeleted++
          }
        }
      }
      clearDir(knowledgeDir)
    }
    const notesDir = path.join(DATA_DIR, 'notes')
    if (fs.existsSync(notesDir)) {
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.json') || f.endsWith('.md'))
      for (const file of files) {
        fs.unlinkSync(path.join(notesDir, file))
        centralDeleted++
      }
    }

    // 2. 删除每个项目内的 .nexus 目录
    const localProjectsPath = path.join(DATA_DIR, LOCAL_PROJECTS_FILE)
    let removedDirs = 0
    if (fs.existsSync(localProjectsPath)) {
      const data = JSON.parse(fs.readFileSync(localProjectsPath, 'utf-8'))
      const projects: Array<{ path: string }> = data.projects || []
      for (const p of projects) {
        const projectPath = p.path
        if (!projectPath) continue
        const nexusPath = path.join(projectPath, '.nexus')
        if (fs.existsSync(nexusPath)) {
          try {
            fs.rmSync(nexusPath, { recursive: true, force: true })
            removedDirs++
          } catch (e: any) {
            errors.push(`${path.basename(projectPath)}: ${e.message}`)
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      centralDeleted,
      removedNexusDirs: removedDirs,
      errors: errors.length ? errors : undefined,
    }
  } catch (error: any) {
    logger.error('resetAllSyncData failed:', error)
    return {
      success: false,
      centralDeleted,
      removedNexusDirs: 0,
      errors: [error.message],
    }
  }
})

// 反向同步：将全局知识库内容同步回对应项目的 .nexus 目录（已弃用）
ipcMain.handle('sil:reverseSync', async () => {
  try {
    // 读取本地项目列表
    const localProjectsPath = path.join(DATA_DIR, LOCAL_PROJECTS_FILE)
    let projectMap: Map<string, string> = new Map() // projectName -> projectPath
    
    if (fs.existsSync(localProjectsPath)) {
      const data = JSON.parse(fs.readFileSync(localProjectsPath, 'utf-8'))
      for (const proj of data.projects || []) {
        // 用多种方式建立映射
        projectMap.set(proj.name, proj.path)
        projectMap.set(path.basename(proj.path), proj.path)
        // 处理带连字符的名称
        projectMap.set(proj.name.replace(/\s+/g, '-').toLowerCase(), proj.path)
      }
    }
    
    let synced = 0
    let skipped = 0
    const errors: string[] = []
    
    // 分类映射: knowledge category -> .nexus subdir（扁平 4 类 + 旧分类兼容）
    const categoryToSilDir: Record<string, string> = {
      'debug': 'debug',
      'snippet': 'snippets',
      'config': 'configs',
      'other': 'other',
      'platform': 'notes',
      'architecture': 'notes',
      'driver': 'notes',
      'protocol': 'notes',
      'model': 'notes',
      'inference': 'notes',
      'prompt': 'notes',
      'system': 'notes',
    }
    
    // 遍历所有知识库类型目录
    const knowledgeDir = path.join(DATA_DIR, 'knowledge')
    const types = fs.readdirSync(knowledgeDir).filter(f => 
      fs.statSync(path.join(knowledgeDir, f)).isDirectory()
    )
    
    for (const type of types) {
      const typeDir = path.join(knowledgeDir, type)
      const processFile = (filePath: string, file: string, category: string) => {
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          let sourceProject = content.sourceProject || content.projectPath || content.metadata?.sourceProject
          if (!sourceProject) {
            skipped++
            return
          }
          if (sourceProject.startsWith('/')) {
            sourceProject = path.basename(sourceProject)
          }
          let projectPath = projectMap.get(sourceProject)
          if (!projectPath) {
            for (const [name, pPath] of projectMap.entries()) {
              if (name.includes(sourceProject) || sourceProject.includes(name) || pPath.includes(sourceProject)) {
                projectPath = pPath
                break
              }
            }
          }
          if (!projectPath) {
            skipped++
            return
          }
          const silDir = categoryToSilDir[category] || 'other'
          const targetDir = path.join(projectPath, SIL_DIR, silDir)
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
          }
          const baseName = file.replace('.json', '')
          const mdFilename = baseName.includes('-') ? baseName.split('-').slice(2).join('-') + '.md' : baseName + '.md'
          const targetPath = path.join(targetDir, mdFilename)
          if (fs.existsSync(targetPath)) {
            skipped++
            return
          }
          const mdContent = jsonToMarkdown(content, category)
          fs.writeFileSync(targetPath, mdContent, 'utf-8')
          synced++
        } catch (e) {
          errors.push(`${file}: ${(e as Error).message}`)
        }
      }

      // 扁平：knowledge/type/*.json，category 从 content.category 取
      const flatFiles = fs.readdirSync(typeDir).filter(f => {
        const full = path.join(typeDir, f)
        return f.endsWith('.json') && fs.existsSync(full) && fs.statSync(full).isFile()
      })
      for (const file of flatFiles) {
        const filePath = path.join(typeDir, file)
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
          const category = content.category || 'other'
          processFile(filePath, file, category)
        } catch {
          skipped++
        }
      }
      // 旧结构：knowledge/type/category/*.json
      const categories = fs.readdirSync(typeDir).filter(f =>
        fs.statSync(path.join(typeDir, f)).isDirectory()
      )
      for (const category of categories) {
        const categoryDir = path.join(typeDir, category)
        const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))
        for (const file of files) {
          processFile(path.join(categoryDir, file), file, category)
        }
      }
    }
    
    return { success: true, synced, skipped, errors }
  } catch (error) {
    logger.error('反向同步失败:', error)
    return { success: false, synced: 0, skipped: 0, errors: [(error as Error).message] }
  }
})

// JSON 知识库条目转换为 Markdown
function jsonToMarkdown(entry: any, category: string): string {
  const lines: string[] = []
  
  // YAML frontmatter
  lines.push('---')
  lines.push(`title: "${entry.name || entry.title || 'Untitled'}"`)
  if (entry.tags?.length) {
    lines.push(`tags: [${entry.tags.map((t: string) => `"${t}"`).join(', ')}]`)
  }
  if (entry.createdAt) lines.push(`created: "${entry.createdAt}"`)
  if (entry.platformId) lines.push(`platform: "${entry.platformId}"`)
  if (entry.peripheralIds?.length) {
    lines.push(`peripherals: [${entry.peripheralIds.map((p: string) => `"${p}"`).join(', ')}]`)
  }
  lines.push('---')
  lines.push('')
  
  // 标题
  lines.push(`# ${entry.name || entry.title || 'Untitled'}`)
  lines.push('')
  
  // 描述
  if (entry.description) {
    lines.push(entry.description)
    lines.push('')
  }
  
  // 根据分类添加特定内容
  if (category === 'debug') {
    if (entry.symptom || entry.metadata?.symptom) {
      lines.push('## 问题症状')
      lines.push(entry.symptom || entry.metadata?.symptom)
      lines.push('')
    }
    if (entry.rootCause || entry.metadata?.rootCause) {
      lines.push('## 根本原因')
      lines.push(entry.rootCause || entry.metadata?.rootCause)
      lines.push('')
    }
    if (entry.solution || entry.metadata?.solution) {
      lines.push('## 解决方案')
      lines.push(entry.solution || entry.metadata?.solution)
      lines.push('')
    }
    if (entry.solutionCode || entry.metadata?.solutionCode) {
      lines.push('## 代码')
      lines.push('```')
      lines.push(entry.solutionCode || entry.metadata?.solutionCode)
      lines.push('```')
      lines.push('')
    }
  } else if (category === 'snippet') {
    const code = entry.code || entry.metadata?.code
    const language = entry.language || entry.metadata?.language || 'c'
    if (code) {
      lines.push('```' + language)
      lines.push(code)
      lines.push('```')
      lines.push('')
    }
  } else if (category === 'config') {
    // 配置文件
    if (entry.files?.length) {
      for (const file of entry.files) {
        lines.push(`## ${file.filename}`)
        if (file.description) lines.push(file.description)
        lines.push('')
        lines.push('```')
        lines.push(file.content || '')
        lines.push('```')
        lines.push('')
      }
    }
  } else {
    // 通用：添加 content
    if (entry.content) {
      lines.push(entry.content)
    }
  }
  
  return lines.join('\n')
}

// 从项目同步到管理器（带 AI 分析）
// 分类仅按项目类型：写入 knowledge/{projectType}/（扁平），笔记标签仅作条目元数据用于展示
ipcMain.handle('sil:syncFrom', async (_, projectPath: string, apiKey?: string, projectType?: string) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    if (!fs.existsSync(silPath)) {
      return { success: false, imported: 0, updated: 0, errors: ['项目未初始化 .nexus'] }
    }
    
    sendSyncProgress('准备同步', 0, 1)
    
    const fromProjectYaml = getProjectType(projectPath)
    const resolvedType = fromProjectYaml || projectType || detectProjectType(projectPath)
    const templateConfig = loadTemplateConfig()
    logger.info(`[Sync] 项目路径: ${projectPath}, 类型: ${resolvedType}${fromProjectYaml ? ' (project.yaml)' : projectType ? ' (前端指定)' : ' (路径推断)'}（一份模板）`)
    
    // 尝试从配置文件读取 API Key
    let actualApiKey = apiKey
    if (!actualApiKey) {
      const configPath = path.join(DATA_DIR, 'config.json')
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          actualApiKey = config.zhipu_api_key
        } catch {}
      }
    }
    
    let imported = 0
    let updated = 0
    const errors: string[] = []
    const projectName = path.basename(projectPath)
    const now = new Date().toISOString()
    
    // 知识库固定 4 类（笔记仅保留在笔记库）；.nexus 子目录与 category 映射
    const SIL_TO_CATEGORY: Record<string, string> = {
      debug: 'debug',
      snippets: 'snippet',
      configs: 'config',
      other: 'other',
    }
    const syncTypes: { silDir: string; name: string; category: string | null }[] = [{ silDir: 'notes', name: '笔记', category: null }]
    const allowedKnowledgeDirs = ['debug', 'snippets', 'configs', 'other']
    try {
      const entries = fs.readdirSync(silPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'notes' || entry.name === 'templates') continue
        const dirPath = path.join(silPath, entry.name)
        const count = fs.readdirSync(dirPath).filter(f => f.endsWith('.md')).length
        if (count === 0) continue
        const category = SIL_TO_CATEGORY[entry.name] ?? 'other'
        syncTypes.push({ silDir: entry.name, name: entry.name, category })
      }
    } catch {}
    
    // 先统计总文件数
    let totalFiles = 0
    for (const { silDir } of syncTypes) {
      const sourceDir = path.join(silPath, silDir)
      if (fs.existsSync(sourceDir)) {
        totalFiles += fs.readdirSync(sourceDir).filter(f => f.endsWith('.md')).length
      }
    }
    
    const knowledgeTargetDir = path.join(DATA_DIR, 'knowledge', resolvedType)
    if (!fs.existsSync(knowledgeTargetDir)) {
      fs.mkdirSync(knowledgeTargetDir, { recursive: true })
    }
    
    let processedFiles = 0
    
    for (const { silDir, name, category } of syncTypes) {
      const sourceDir = path.join(silPath, silDir)
      const targetDir = silDir === 'notes'
        ? path.join(DATA_DIR, 'notes')
        : knowledgeTargetDir
      
      if (!fs.existsSync(sourceDir)) continue
      if (silDir === 'notes' && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }
      
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'))
      
      for (const file of files) {
        try {
          processedFiles++
          sendSyncProgress(`正在处理${name}`, processedFiles, totalFiles, file)
          
          const sourcePath = path.join(sourceDir, file)
          const fileContent = fs.readFileSync(sourcePath, 'utf-8')
          
          const parsed = parseMarkdownWithFrontmatter(fileContent)
          const meta = parsed.frontmatter
          const content = parsed.content
          
          let aiData: any = null
          if (actualApiKey) {
            sendSyncProgress(`AI 分析${name}`, processedFiles, totalFiles, file)
            aiData = await analyzeDocWithAI(fileContent, silDir, file, actualApiKey, undefined)
          }
          
          const safeProjectNameForId = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
          const baseName = file.replace('.md', '')
          const baseId = silDir === 'notes' ? `${safeProjectNameForId}-${baseName}` : `${safeProjectNameForId}-${silDir}-${baseName}`
          let jsonData: any
          
          if (silDir === 'notes') {
            jsonData = {
              id: meta.id || baseId,
              title: aiData?.title || meta.title || file.replace('.md', '').replace(/-/g, ' '),
              content: content,
              category: aiData?.category || meta.category || 'learning',
              tags: [...new Set([...(aiData?.tags || []), ...(meta.tags || []), projectName])],
              createdAt: meta.createdAt || now,
              updatedAt: now,
              projectType: resolvedType,
              projectName: projectName,
              projectPath: projectPath,
              sourceProject: projectPath
            }
          } else {
            const knowledgeCategory = category || 'other'
            const title = aiData?.title || aiData?.name || meta.title || meta.name || file.replace('.md', '').replace(/-/g, ' ')
            const tags = [...new Set([...(aiData?.tags || []), ...(meta.tags || []), projectName])]
            const metadata: Record<string, any> = { sourceProject: projectPath }
            if (knowledgeCategory === 'debug') {
              metadata.symptom = aiData?.symptom || meta.symptom || content.substring(0, 200)
              metadata.errorLog = meta.errorLog || ''
              metadata.rootCause = aiData?.rootCause || meta.rootCause || ''
              metadata.solution = aiData?.solution || meta.solution || content
              metadata.solutionCode = aiData?.solutionCode || meta.code || ''
              metadata.environment = { platformId: aiData?.platform || meta.platform || '', peripheralIds: meta.peripherals || [], frameworkVersion: aiData?.framework || meta.framework || '' }
            } else if (knowledgeCategory === 'snippet') {
              const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
              metadata.language = aiData?.language || meta.language || 'c'
              metadata.snippetCategory = meta.category || 'utility'
              metadata.description = aiData?.description || meta.description || ''
              metadata.code = aiData?.code || meta.code || codeMatch?.[1] || content
              metadata.platformIds = meta.platforms || []
              metadata.peripheralIds = meta.peripherals || []
            } else if (knowledgeCategory === 'config') {
              metadata.description = aiData?.description || meta.description || ''
              metadata.platformId = aiData?.platform || meta.platform || ''
              metadata.files = []
            }
            jsonData = {
              id: meta.id || baseId,
              title,
              content: content,
              projectType: resolvedType,
              category: knowledgeCategory,  // 固定 4 类之一
              tags,
              severity: aiData?.severity || meta.severity,
              projectName: projectName,
              projectPath: projectPath,
              sourceProject: projectPath,
              metadata,
              createdAt: meta.createdAt || now,
              updatedAt: now,
            }
          }
          
          const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
          const jsonFilename = silDir === 'notes' ? `${safeProjectName}-${file.replace('.md', '.json')}` : `${safeProjectName}-${silDir}-${baseName}.json`
          const targetPath = path.join(targetDir, jsonFilename)
          
          const isUpdate = fs.existsSync(targetPath)
          
          // 新导入的标记为未读
          if (!isUpdate) {
            jsonData.isNew = true
          }
          
          fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 2), 'utf-8')
          
          if (isUpdate) {
            updated++
          } else {
            imported++
          }
        } catch (e: any) {
          errors.push(`${file}: ${e.message}`)
        }
      }
    }
    
    sendSyncProgress('同步完成', totalFiles, totalFiles)
    return { success: true, imported, updated, errors }
  } catch (error: any) {
    sendSyncProgress('同步失败', 0, 0)
    return { success: false, imported: 0, updated: 0, errors: [error.message] }
  }
})

// 从管理器同步到项目
ipcMain.handle('sil:syncTo', async (_, projectPath: string, data: any) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    
    if (!fs.existsSync(silPath)) {
      return false
    }
    
    // 如果提供了文档数据，写入到项目
    if (data.documents) {
      for (const doc of data.documents) {
        const subdirPath = path.join(silPath, doc.type + 's')
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true })
        }
        
        // 生成 Markdown 内容
        const mdContent = generateMarkdownWithFrontmatter(doc)
        const filename = doc.filename || `${doc.id}.md`
        fs.writeFileSync(path.join(subdirPath, filename), mdContent, 'utf-8')
      }
    }
    
    return true
  } catch (error) {
    logger.error('Error syncing to project:', error)
    return false
  }
})

// 辅助函数：简单 YAML 解析
function parseSimpleYaml(content: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = content.split('\n')
  let currentKey = ''
  let currentArray: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    if (trimmed.startsWith('- ')) {
      // 数组项（多行格式）
      currentArray.push(trimmed.substring(2).replace(/^["']|["']$/g, ''))
    } else if (trimmed.includes(':')) {
      // 保存之前的数组
      if (currentKey && currentArray.length > 0) {
        result[currentKey] = currentArray
        currentArray = []
      }
      
      const colonIndex = trimmed.indexOf(':')
      const key = trimmed.substring(0, colonIndex).trim()
      let value = trimmed.substring(colonIndex + 1).trim()
      
      if (value === '[]') {
        result[key] = []
        currentKey = ''
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 内联数组格式: [item1, item2, ...]
        const arrayContent = value.slice(1, -1)
        if (arrayContent.trim()) {
          result[key] = arrayContent.split(',').map(item => 
            item.trim().replace(/^["']|["']$/g, '')
          )
        } else {
          result[key] = []
        }
        currentKey = ''
      } else if (value === '' || value === undefined) {
        currentKey = key
      } else {
        result[key] = value.replace(/^["']|["']$/g, '')
        currentKey = ''
      }
    }
  }
  
  // 保存最后的数组
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray
  }
  
  return result
}

// 辅助函数：解析带 frontmatter 的 Markdown
function parseMarkdownWithFrontmatter(content: string): { frontmatter: Record<string, any>, content: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  
  if (match) {
    return {
      frontmatter: parseSimpleYaml(match[1]),
      content: match[2].trim(),
    }
  }
  
  return { frontmatter: {}, content: content.trim() }
}

// 辅助函数：生成带 frontmatter 的 Markdown
function generateMarkdownWithFrontmatter(doc: any): string {
  const frontmatter = [
    '---',
    `title: "${doc.title}"`,
    `tags: [${(doc.tags || []).map((t: string) => `"${t}"`).join(', ')}]`,
    `created: ${doc.createdAt || new Date().toISOString()}`,
    `updated: ${doc.updatedAt || new Date().toISOString()}`,
    '---',
    '',
  ].join('\n')
  
  return frontmatter + doc.content
}

// 内部扫描函数
async function scanSilProject(projectPath: string): Promise<any> {
  const silPath = path.join(projectPath, SIL_DIR)
  
  if (!fs.existsSync(silPath)) {
    return null
  }
  
  const configPath = path.join(silPath, 'project.yaml')
  let config: any = {}
  
  if (fs.existsSync(configPath)) {
    const yamlContent = fs.readFileSync(configPath, 'utf-8')
    config = parseSimpleYaml(yamlContent)
  }
  
  const documents: any[] = []
  
  for (const subdir of SIL_SUBDIRS) {
    const subdirPath = path.join(silPath, subdir)
    if (!fs.existsSync(subdirPath)) continue
    
    const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.md'))
    
    for (const file of files) {
      const filePath = path.join(subdirPath, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = parseMarkdownWithFrontmatter(content)
      
      documents.push({
        id: `${subdir}/${file.replace('.md', '')}`,
        filename: file,
        type: subdir.replace(/s$/, ''),
        title: parsed.frontmatter.title || file.replace('.md', ''),
        content: parsed.content,
        tags: parsed.frontmatter.tags || [],
        createdAt: parsed.frontmatter.created || fs.statSync(filePath).birthtime.toISOString(),
        updatedAt: fs.statSync(filePath).mtime.toISOString(),
      })
    }
  }
  
  return { config, documents, hasChanges: false }
}

// ============================================================
// AI 分析 IPC (智谱 API)
// ============================================================

ipcMain.handle('ai:analyzeGitHubRepo', async (_, url: string, apiKey: string) => {
  try {
    // 从 URL 提取仓库信息
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/)
    if (!match) {
      return null
    }
    
    const owner = match[1]
    const repoName = match[2]
    
    // 先尝试从 GitHub API 获取基本信息
    let githubInfo: any = null
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`)
      if (response.ok) {
        githubInfo = await response.json()
      }
    } catch {}
    
    // 获取 README 内容
    let readmeContent = ''
    try {
      // 尝试获取 README
      const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, {
        headers: { 'Accept': 'application/vnd.github.raw' }
      })
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text()
        // 截取前 6000 字符，避免内容过长
        if (readmeContent.length > 6000) {
          readmeContent = readmeContent.substring(0, 6000) + '\n\n... (README 内容已截断)'
        }
      }
    } catch (e) {
      logger.warn('无法获取 README:', e)
    }
    
    // 构建 prompt
    const prompt = `分析这个 GitHub 仓库并返回 JSON 格式的信息:

仓库: ${owner}/${repoName}
URL: ${url}
${githubInfo ? `GitHub 描述: ${githubInfo.description || '无'}
语言: ${githubInfo.language || '未知'}
Stars: ${githubInfo.stargazers_count || 0}
Topics: ${(githubInfo.topics || []).join(', ') || '无'}` : ''}

${readmeContent ? `=== README 内容 ===
${readmeContent}
=== README 结束 ===` : ''}

请仔细阅读 README 内容，分析这个仓库是什么类型的项目，返回以下 JSON 格式（只返回 JSON，不要其他内容）:
{
  "name": "仓库显示名称（简短中文名，如 ESP-IDF、小智语音助手）",
  "description": "一句话中文描述这个仓库的用途（不超过30字）",
  "category": "分类，只能是以下之一: espressif/sifli/lvgl/arduino/tools",
  "tags": ["标签1", "标签2", "标签3", "标签4"],
  "branch": "默认分支，通常是 main 或 master",
  "starred": false,
  "summary": "基于 README 的详细介绍（2-4段中文，包含：项目功能、主要特性、支持的硬件/芯片、使用场景等，约200-400字）"
}

分类说明:
- espressif: Espressif 官方或 ESP32 相关项目
- sifli: SiFli 芯片相关项目
- lvgl: LVGL GUI 或显示相关项目
- arduino: Arduino 相关项目
- tools: 其他工具、库、框架

标签说明: 应包含芯片型号(如 ESP32、ESP32-S3)、功能关键词(如 音频、显示、AI、语音)、项目类型(如 SDK、框架、示例)等

summary 要求:
- 用中文撰写，专业但易懂
- 介绍项目的核心功能和亮点
- 说明支持的硬件平台或芯片型号
- 提及主要的技术特性或使用场景
- 如果有依赖关系或配套项目，也简要说明`

    const opts = getAiRequestOptions(apiKey)
    if (!opts) {
      logger.error('未配置 AI API（请在设置中填写智谱或自定义大模型）')
      return null
    }
    
    // 使用重试机制调用 AI API
    const retryResult = await callAIWithRetry(opts, prompt)
    if (!retryResult.success) {
      logger.error('AI API 调用失败:', retryResult.error)
      return null
    }
    
    const content = retryResult.data
    if (!content) {
      return null
    }
    
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      // 确保分支有默认值
      result.branch = result.branch || (githubInfo?.default_branch) || 'main'
      return result
    }
    
    return null
  } catch (error) {
    logger.error('AI 分析错误:', error)
    return null
  }
})

// 扫描目录发现项目
ipcMain.handle('project:scanDirectory', async (_, dirPath: string) => {
  try {
    const projects: Array<{ path: string; name: string; hasNexus: boolean; hasReadme: boolean }> = []
    
    if (!fs.existsSync(dirPath)) {
      return { success: false, projects: [], error: '目录不存在' }
    }
    
    // 检测是否是项目目录的函数
    function isProjectDir(dir: string): boolean {
      const indicators = [
        'CMakeLists.txt', 'Makefile', 'package.json', 'Cargo.toml',
        'setup.py', 'pyproject.toml', 'go.mod', 'pom.xml', 'build.gradle',
        'platformio.ini', 'idf_component.yml', 'sdkconfig', 'SConstruct',
        '.git', 'README.md', 'readme.md'
      ]
      try {
        const files = fs.readdirSync(dir)
        return indicators.some(ind => files.includes(ind))
      } catch {
        return false
      }
    }
    
    // 递归扫描（最多 2 层深度）
    function scanDir(dir: string, depth: number) {
      if (depth > 2) return
      
      try {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'build' || item === 'dist') {
            continue
          }
          
          const itemPath = path.join(dir, item)
          try {
            const stat = fs.statSync(itemPath)
            if (!stat.isDirectory()) continue
            
            if (isProjectDir(itemPath)) {
              const hasNexus = fs.existsSync(path.join(itemPath, '.nexus'))
              const hasReadme = fs.existsSync(path.join(itemPath, 'README.md')) || 
                               fs.existsSync(path.join(itemPath, 'readme.md'))
              projects.push({
                path: itemPath,
                name: item,
                hasNexus,
                hasReadme
              })
            } else {
              // 继续向下搜索
              scanDir(itemPath, depth + 1)
            }
          } catch {}
        }
      } catch {}
    }
    
    scanDir(dirPath, 0)
    
    return { success: true, projects }
  } catch (error) {
    return { success: false, projects: [], error: (error as Error).message }
  }
})

// AI 生成项目的知识库和笔记（写入 .nexus 目录）；按项目知识库类别使用对应模板（与一键同步一致）
ipcMain.handle('ai:generateProjectDocs', async (_, projectPath: string, apiKey: string) => {
  try {
    const projectName = path.basename(projectPath)
    const silPath = path.join(projectPath, SIL_DIR)
    
    const templateConfig = loadTemplateConfig()
    const { templates } = templateConfig
    
    // 确保 .nexus 目录存在
    if (!fs.existsSync(silPath)) {
      fs.mkdirSync(silPath, { recursive: true })
      for (const subdir of SIL_SUBDIRS) {
        fs.mkdirSync(path.join(silPath, subdir), { recursive: true })
      }
    }
    
    // 收集项目信息用于 AI 分析
    let projectInfo = `项目名称: ${projectName}\n项目路径: ${projectPath}\n\n`
    
    // 读取 README
    let readmeContent = ''
    const readmePaths = ['README.md', 'readme.md', 'README.rst']
    for (const readme of readmePaths) {
      const readmePath = path.join(projectPath, readme)
      if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf-8')
        if (readmeContent.length > 3000) {
          readmeContent = readmeContent.substring(0, 3000) + '\n... (截断)'
        }
        break
      }
    }
    
    // 分析项目结构
    const files = listFilesRecursive(projectPath, 3)
    const fileList = files
      .map(f => path.relative(projectPath, f))
      .filter(f => !f.includes('build/') && !f.includes('.git/') && !f.includes('node_modules/'))
      .slice(0, 40)
      .join('\n')
    
    // 读取关键代码文件
    let codeSnippets = ''
    const codeFiles = files.filter(f => 
      f.endsWith('.c') || f.endsWith('.cpp') || f.endsWith('.h') ||
      f.endsWith('.py') || f.endsWith('.js') || f.endsWith('.ts')
    ).slice(0, 5)
    
    for (const codeFile of codeFiles) {
      try {
        const content = fs.readFileSync(codeFile, 'utf-8')
        if (content.length < 2000) {
          codeSnippets += `\n=== ${path.relative(projectPath, codeFile)} ===\n${content.substring(0, 1500)}\n`
        }
      } catch {}
    }
    
    // 构建 prompt 让 AI 生成知识库文档（使用自定义模板）
    const noteTemplate = templates.note
    const snippetTemplate = templates.snippet
    const configTemplate = templates.config
    
    const prompt = `分析这个项目并生成知识库文档。

${projectInfo}

=== 项目结构 ===
${fileList}

${readmeContent ? `=== README ===\n${readmeContent}\n` : ''}

${codeSnippets ? `=== 代码片段 ===\n${codeSnippets}` : ''}

=== 文档生成指导 ===

笔记文档指导：
${noteTemplate.aiPrompt}

代码片段指导：
${snippetTemplate.aiPrompt}

配置模板指导：
${configTemplate.aiPrompt}

请根据项目内容生成以下 JSON 格式的知识文档（只返回 JSON）:
{
  "notes": [
    {
      "filename": "project-overview.md",
      "title": "项目概述",
      "content": "按照笔记模板格式生成的 Markdown 内容（200-500字）",
      "tags": ["标签1", "标签2"],
      "category": "${noteTemplate.frontmatterFields.find(f => f.name === 'category')?.default || 'learning'}"
    }
  ],
  "snippets": [
    {
      "filename": "example-snippet.md",
      "title": "代码片段标题",
      "description": "简短描述",
      "language": "c/python/javascript等",
      "code": "关键代码片段",
      "tags": ["标签"],
      "category": "${snippetTemplate.frontmatterFields.find(f => f.name === 'category')?.default || 'utility'}"
    }
  ],
  "configs": [
    {
      "filename": "config-name.md",
      "title": "配置说明",
      "content": "按照配置模板格式生成的 Markdown 内容",
      "tags": ["标签"],
      "configType": "${configTemplate.frontmatterFields.find(f => f.name === 'configType')?.default || 'other'}"
    }
  ]
}

要求:
- notes: 1-2 个笔记，介绍项目架构、设计思路
- snippets: 1-3 个代码片段，提取项目中有价值的代码
- configs: 0-2 个配置模板（如果有关键配置）
- 内容要有实际价值，不要泛泛而谈
- 如果项目信息不足，可以返回空数组`

    const opts = getAiRequestOptions(apiKey)
    if (!opts) {
      return { success: false, error: '未配置 AI API（请在设置中填写智谱或自定义大模型）' }
    }
    
    const retryResult = await callAIWithRetry(opts, prompt, { maxRetries: 2, max_tokens: 3000 })
    if (!retryResult.success) {
      return { success: false, error: retryResult.error || 'AI API 调用失败' }
    }
    
    const content = retryResult.data || ''
    
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: '无法解析 AI 返回内容' }
    }
    
    const docs = JSON.parse(jsonMatch[0])
    let generated = { notes: 0, snippets: 0, configs: 0 }
    
    // 写入 notes
    for (const note of (docs.notes || [])) {
      const mdContent = `---
title: "${note.title}"
tags: [${(note.tags || []).map((t: string) => `"${t}"`).join(', ')}]
created: "${new Date().toISOString()}"
---

# ${note.title}

${note.content}
`
      const filePath = path.join(silPath, 'notes', note.filename)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, mdContent, 'utf-8')
        generated.notes++
      }
    }
    
    // 写入 snippets
    for (const snippet of (docs.snippets || [])) {
      const mdContent = `---
title: "${snippet.title}"
language: "${snippet.language || 'text'}"
tags: [${(snippet.tags || []).map((t: string) => `"${t}"`).join(', ')}]
created: "${new Date().toISOString()}"
---

# ${snippet.title}

${snippet.description || ''}

\`\`\`${snippet.language || ''}
${snippet.code || ''}
\`\`\`
`
      const filePath = path.join(silPath, 'snippets', snippet.filename)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, mdContent, 'utf-8')
        generated.snippets++
      }
    }
    
    // 写入 configs
    for (const config of (docs.configs || [])) {
      const mdContent = `---
title: "${config.title}"
tags: [${(config.tags || []).map((t: string) => `"${t}"`).join(', ')}]
created: "${new Date().toISOString()}"
---

# ${config.title}

${config.content}
`
      const filePath = path.join(silPath, 'configs', config.filename)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, mdContent, 'utf-8')
        generated.configs++
      }
    }
    
    return { success: true, generated }
  } catch (error) {
    logger.error('生成项目文档失败:', error)
    return { success: false, error: (error as Error).message }
  }
})

// 根据一句话想法新建项目：AI 生成英文项目名 + 中文简介，创建空文件夹并返回路径
ipcMain.handle('ai:createProjectFromIdea', async (_, apiKey: string, idea: string, projectType: string) => {
  try {
    const trimmed = (idea || '').trim()
    if (!trimmed) {
      return { success: false, error: '请填写一句话描述' }
    }
    const opts = getAiRequestOptions(apiKey)
    if (!opts) {
      return { success: false, error: '未配置 AI API（请在设置中填写智谱或自定义大模型）' }
    }
    const prompt = `用户有一个项目想法，请根据下面这一句话生成：
1. nameEn：英文项目名，用于文件夹名，仅使用小写字母、数字、连字符，简短（例如 my-awesome-app、tiny-tool）。
2. introZh：中文项目简介，一两句话概括项目是做什么的。

用户的想法：「${trimmed}」

严格只返回一个 JSON 对象，不要其他文字，格式：{"nameEn":"xxx","introZh":"xxx"}`
    const retryResult = await callAIWithRetry(opts, prompt, { maxRetries: 2, max_tokens: 500 })
    if (!retryResult.success) {
      return { success: false, error: retryResult.error || 'AI 调用失败' }
    }
    const content = retryResult.data || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: '无法解析 AI 返回的 JSON' }
    }
    const parsed = JSON.parse(jsonMatch[0])
    let nameEn = (parsed.nameEn || parsed.name_en || 'new-project').toString()
    const introZh = (parsed.introZh || parsed.intro_zh || '').toString().trim() || nameEn
    nameEn = nameEn.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'new-project'
    const dirs = getProjectTypeDirs()
    const typeDir = dirs[projectType] || path.join(os.homedir(), 'Workshop', 'Other')
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true })
    }
    let targetPath = path.join(typeDir, nameEn)
    let suffix = 1
    while (fs.existsSync(targetPath)) {
      suffix++
      targetPath = path.join(typeDir, `${nameEn}-${suffix}`)
    }
    fs.mkdirSync(targetPath, { recursive: true })
    return { success: true, path: targetPath, nameEn: path.basename(targetPath), introZh }
  } catch (error) {
    logger.error('新建项目失败:', error)
    return { success: false, error: (error as Error).message }
  }
})

// AI 分析本地项目
ipcMain.handle('ai:analyzeLocalProject', async (_, projectPath: string, apiKey: string) => {
  try {
    const projectName = path.basename(projectPath)
    
    // 收集项目信息
    let projectInfo = `项目名称: ${projectName}\n项目路径: ${projectPath}\n\n`
    
    // 1. 读取 README.md（如果有）
    let readmeContent = ''
    const readmePaths = ['README.md', 'readme.md', 'README.rst', 'README.txt']
    for (const readme of readmePaths) {
      const readmePath = path.join(projectPath, readme)
      if (fs.existsSync(readmePath)) {
        readmeContent = fs.readFileSync(readmePath, 'utf-8')
        if (readmeContent.length > 4000) {
          readmeContent = readmeContent.substring(0, 4000) + '\n\n... (内容已截断)'
        }
        break
      }
    }
    
    // 2. 分析项目结构
    const files = listFilesRecursive(projectPath, 3)
    const fileList = files
      .map(f => path.relative(projectPath, f))
      .filter(f => !f.includes('build/') && !f.includes('.git/'))
      .slice(0, 50)
      .join('\n')
    
    // 3. 读取关键配置文件
    let configContent = ''
    
    // sdkconfig (ESP-IDF)
    const sdkconfig = files.find(f => f.endsWith('sdkconfig') || f.endsWith('sdkconfig.defaults'))
    if (sdkconfig) {
      const content = fs.readFileSync(sdkconfig, 'utf-8')
      // 提取关键配置
      const keyConfigs = content.split('\n')
        .filter(line => 
          line.includes('CONFIG_IDF_TARGET') ||
          line.includes('CONFIG_ESP_') ||
          line.includes('CONFIG_FREERTOS') ||
          line.includes('CONFIG_LWIP') ||
          line.includes('CONFIG_BT_') ||
          line.includes('CONFIG_WIFI_')
        )
        .slice(0, 30)
        .join('\n')
      configContent += `\n=== sdkconfig 关键配置 ===\n${keyConfigs}\n`
    }
    
    // CMakeLists.txt
    const cmake = files.find(f => f.endsWith('CMakeLists.txt') && !f.includes('build/'))
    if (cmake) {
      const content = fs.readFileSync(cmake, 'utf-8')
      if (content.length < 2000) {
        configContent += `\n=== CMakeLists.txt ===\n${content}\n`
      }
    }
    
    // platformio.ini
    const platformio = files.find(f => f.endsWith('platformio.ini'))
    if (platformio) {
      const content = fs.readFileSync(platformio, 'utf-8')
      configContent += `\n=== platformio.ini ===\n${content}\n`
    }
    
    // 4. 读取主程序文件
    let mainCode = ''
    const mainFiles = files.filter(f => 
      f.endsWith('main.c') || 
      f.endsWith('main.cpp') || 
      f.endsWith('app_main.c') ||
      f.includes('/main/') && (f.endsWith('.c') || f.endsWith('.cpp'))
    ).slice(0, 3)
    
    for (const mainFile of mainFiles) {
      const content = fs.readFileSync(mainFile, 'utf-8')
      const preview = content.substring(0, 1500)
      mainCode += `\n=== ${path.relative(projectPath, mainFile)} ===\n${preview}\n`
    }
    
    // 构建 prompt
    const prompt = `分析这个项目并返回 JSON 格式的信息:

${projectInfo}

=== 项目文件结构 ===
${fileList}

${readmeContent ? `=== README 内容 ===\n${readmeContent}\n` : ''}

${configContent}

${mainCode ? `=== 主程序代码 ===\n${mainCode}` : ''}

请仔细分析以上项目信息，返回以下 JSON 格式（只返回 JSON，不要其他内容）:
{
  "name": "项目名称（中文，简短易懂）",
  "description": "一句话中文描述（不超过30字）",
  "summary": "详细介绍（2-4段中文，约200-400字）",
  "projectType": "项目类型：若能明确归入以下之一则填 mcu/ai/software/linux/mobile/remote/fpga；若无法归入任何一类则填建议的新类型英文标识，如 game、iot、tool",
  "suggestedNewTypeName": "当 projectType 为新类型时必填，为该类型的简短中文名，如 游戏、IoT、工具；否则可省略",
  "confidenceByType": "对象，键为 mcu/ai/software/linux/mobile/remote/fpga，值为 0-1 的占比，表示归属到该类型的推荐度，总和为 1。例如 {\"mcu\":0.1,\"ai\":0,\"software\":0.6,\"linux\":0.1,\"mobile\":0.1,\"remote\":0.1,\"fpga\":0}",
  "chip": "芯片型号，如无则留空",
  "framework": "开发框架",
  "peripherals": ["外设1", "外设2"],
  "tags": ["标签1", "标签2"],
  "features": ["功能特性1", "功能特性2"]
}

项目类型说明:
- mcu: MCU/嵌入式（ESP32、STM32、单片机等）
- ai: AI/机器学习（模型训练、推理、LLM 等）
- software: 软件/Web（前端、后端、桌面应用等）
- linux: Linux 平台（驱动、系统移植、RK3588 等）
- mobile: 移动端（iOS、Android、Flutter、RN 等）
- remote: 远程设备/DevOps（部署、运维脚本等）
- fpga: FPGA/数字逻辑（Verilog、VHDL、Xilinx、Intel FPGA、综合与时序等）

分析要点:
- 若项目明显属于上述某一类，projectType 填该类，confidenceByType 中该类最高。
- 若项目不属于任何一类（如纯游戏、IoT 产品、独立工具），projectType 填新类型英文标识（小写），suggestedNewTypeName 填中文名，confidenceByType 仍给出对七类的推荐占比供用户参考。
- confidenceByType 必须包含全部七个键（mcu/ai/software/linux/mobile/remote/fpga），值均为数字且总和为 1。`

    const opts = getAiRequestOptions(apiKey)
    if (!opts) {
      logger.error('未配置 AI API（请在设置中填写智谱或自定义大模型）')
      return null
    }
    
    const retryResult = await callAIWithRetry(opts, prompt)
    if (!retryResult.success || !retryResult.data) {
      logger.error('AI API 调用失败:', retryResult.error)
      return null
    }
    
    const content = retryResult.data
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      const known = ['mcu', 'ai', 'software', 'linux', 'mobile', 'remote', 'fpga']
      if (typeof result.confidenceByType !== 'object') {
        result.confidenceByType = known.reduce((acc, k) => ({ ...acc, [k]: result.projectType === k ? 1 : 0 }), {} as Record<string, number>)
      }
      if (!result.suggestedNewTypeName && known.indexOf(result.projectType) === -1) {
        result.suggestedNewTypeName = result.projectType || '未分类'
      }
      return result
    }
    
    return null
  } catch (error) {
    logger.error('AI 本地项目分析错误:', error)
    return null
  }
})

// 项目分析函数
async function analyzeProject(projectPath: string): Promise<any> {
  const projectName = path.basename(projectPath)
  const analysis: any = {
    projectPath,
    projectName,
    detectedType: { name: 'Unknown', confidence: 0, indicators: [] },
    configFiles: [],
    codeFiles: [],
    detectedPeripherals: []
  }

  // 检测项目类型
  const files = listFilesRecursive(projectPath, 3) // 最多3层深度
  
  // 检测 ESP-IDF
  if (files.some(f => f.endsWith('sdkconfig') || f.endsWith('sdkconfig.defaults'))) {
    analysis.detectedType = { name: 'ESP-IDF', confidence: 0.9, indicators: ['sdkconfig'] }
    analysis.framework = { name: 'ESP-IDF' }
    
    // 读取 sdkconfig 获取芯片信息
    const sdkconfig = files.find(f => f.endsWith('sdkconfig'))
    if (sdkconfig) {
      const content = fs.readFileSync(sdkconfig, 'utf-8')
      const chipMatch = content.match(/CONFIG_IDF_TARGET="?(\w+)"?/)
      if (chipMatch) {
        const chipName = chipMatch[1].toUpperCase().replace('ESP32', 'ESP32-').replace('--', '-')
        analysis.chip = { name: chipName, manufacturer: 'Espressif' }
      }
    }
  }
  
  // 检测 RT-Thread
  if (files.some(f => f.includes('rtconfig.h') || f.includes('SConscript'))) {
    analysis.detectedType = { name: 'RT-Thread', confidence: 0.9, indicators: ['rtconfig.h', 'SConscript'] }
    analysis.framework = { name: 'RT-Thread' }
  }
  
  // 检测 PlatformIO
  if (files.some(f => f.endsWith('platformio.ini'))) {
    analysis.detectedType = { name: 'PlatformIO', confidence: 0.9, indicators: ['platformio.ini'] }
    analysis.framework = { name: 'PlatformIO' }
  }

  // 收集配置文件
  const configPatterns = [
    { pattern: /sdkconfig(\.defaults)?$/, type: 'sdkconfig' },
    { pattern: /CMakeLists\.txt$/, type: 'cmake' },
    { pattern: /Kconfig$/, type: 'kconfig' },
    { pattern: /platformio\.ini$/, type: 'platformio' },
    { pattern: /idf_component\.yml$/, type: 'cmake' },
    { pattern: /rtconfig\.h$/, type: 'kconfig' },
  ]

  for (const file of files) {
    for (const { pattern, type } of configPatterns) {
      if (pattern.test(file)) {
        const relPath = path.relative(projectPath, file)
        let preview = ''
        try {
          const content = fs.readFileSync(file, 'utf-8')
          preview = content.split('\n').slice(0, 5).join('\n')
        } catch {}
        
        analysis.configFiles.push({
          filename: path.basename(file),
          path: relPath,
          type,
          preview
        })
        break
      }
    }
  }

  // 收集代码文件
  const codePatterns = [
    { pattern: /main\.(c|cpp)$/, category: 'main', lang: 'c' },
    { pattern: /app_main\.(c|cpp)$/, category: 'main', lang: 'c' },
    { pattern: /\.c$/, category: 'component', lang: 'c' },
    { pattern: /\.cpp$/, category: 'component', lang: 'cpp' },
    { pattern: /\.h$/, category: 'include', lang: 'c' },
    { pattern: /\.py$/, category: 'other', lang: 'python' },
  ]

  for (const file of files) {
    if (file.includes('build') || file.includes('node_modules') || file.includes('.git')) {
      continue
    }
    
    for (const { pattern, category, lang } of codePatterns) {
      if (pattern.test(file)) {
        const relPath = path.relative(projectPath, file)
        let linesOfCode = 0
        try {
          const content = fs.readFileSync(file, 'utf-8')
          linesOfCode = content.split('\n').length
          
          // 检测外设
          detectPeripherals(content, analysis.detectedPeripherals)
        } catch {}
        
        analysis.codeFiles.push({
          filename: path.basename(file),
          path: relPath,
          language: lang,
          category,
          linesOfCode
        })
        break
      }
    }
  }

  // 去重外设
  analysis.detectedPeripherals = [...new Set(analysis.detectedPeripherals)]

  return analysis
}

function listFilesRecursive(dir: string, maxDepth: number, currentDepth = 0): string[] {
  if (currentDepth >= maxDepth) return []
  
  const results: string[] = []
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      // 跳过隐藏目录和 build 目录
      if (entry.name.startsWith('.') || entry.name === 'build' || entry.name === 'node_modules') {
        continue
      }
      
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(fullPath, maxDepth, currentDepth + 1))
      } else {
        results.push(fullPath)
      }
    }
  } catch {}
  
  return results
}

const PERIPHERAL_KEYWORDS: Record<string, string[]> = {
  display: ['lcd', 'oled', 'display', 'st7789', 'st7701', 'st7703', 'ssd1306', 'tft', 'screen', 'lvgl'],
  sensor: ['imu', 'accel', 'gyro', 'qmi8658', 'mpu6050', 'bme280', 'dht', 'temperature'],
  audio: ['i2s_', 'audio', 'codec', 'es8311', 'speaker', 'microphone'],
  camera: ['camera', 'ov2640', 'ov5647', 'mipi_csi', 'capture'],
  touch: ['touch', 'gt911', 'ft6336', 'capacitive'],
  led: ['ws2812', 'neopixel', 'led_strip', 'rmt'],
  wifi: ['wifi', 'esp_wifi', 'esp_http'],
  bluetooth: ['bluetooth', 'ble', 'nimble'],
}

function detectPeripherals(content: string, peripherals: string[]) {
  const lowerContent = content.toLowerCase()
  
  for (const [category, keywords] of Object.entries(PERIPHERAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        if (!peripherals.includes(category)) {
          peripherals.push(category)
        }
        break
      }
    }
  }
}

app.whenReady().then(() => {
  ensureDataDirs()
  ensureTemplatesDir()
  migrateOldDataToKnowledge()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
