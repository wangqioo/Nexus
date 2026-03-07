// ============================================================
// Nexus - 全栈项目开发经验管理中枢
// 数据模型 v4.0 - 统一多类型项目 + 知识库
// ============================================================

// ============================================================
// .nexus 文档模板配置（全局）
// ============================================================

// 单个字段定义
export interface TemplateField {
  name: string           // 字段名（英文，用于 frontmatter）
  label: string          // 显示名（中文）
  type: 'text' | 'textarea' | 'tags' | 'select' | 'number' | 'date' | 'boolean'
  required: boolean
  placeholder?: string
  options?: string[]     // select 类型的选项
  default?: string | number | boolean | string[]
}

// 单个文档类型的模板配置
export interface DocumentTemplate {
  id: string             // 模板ID: debug, snippet, note, config
  name: string           // 显示名
  icon: string           // 图标
  description: string    // 描述
  fileExtension: string  // 文件扩展名 (.md)
  frontmatterFields: TemplateField[]  // YAML frontmatter 字段
  contentTemplate: string             // Markdown 内容模板
  aiPrompt: string                    // AI 生成时的 prompt 指导
}

// 模板版本历史记录
export interface TemplateVersionRecord {
  version: string           // 版本号，如 "1.0", "1.1"
  timestamp: string         // ISO 时间戳
  changes: string           // 变更说明
}

// 项目使用的模板版本记录
export interface ProjectTemplateUsage {
  projectPath: string       // 项目路径
  projectName: string       // 项目名称
  templateVersion: string   // 使用的模板版本
  initializedAt: string     // 初始化时间
}

// 全局模板配置
export interface NexusTemplateConfig {
  version: string
  templates: {
    debug: DocumentTemplate
    snippet: DocumentTemplate
    note: DocumentTemplate
    config: DocumentTemplate
    other: DocumentTemplate
  }
  // 通用设置
  settings: {
    autoAddTimestamp: boolean    // 自动添加时间戳
    defaultTags: string[]        // 默认标签
    aiAnalysisEnabled: boolean   // 启用 AI 分析
  }
  // 版本历史和项目使用记录
  versionHistory?: TemplateVersionRecord[]     // 版本修改历史
  projectUsages?: ProjectTemplateUsage[]       // 哪些项目使用了哪个版本
}

// 默认模板配置
export const DEFAULT_TEMPLATE_CONFIG: NexusTemplateConfig = {
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
}

// ============================================================
// 项目类型定义
// ============================================================

export type ProjectType = 
  | 'mcu'           // MCU/嵌入式项目
  | 'ai'            // AI/ML 项目
  | 'software'      // 软件/Web 项目
  | 'linux'         // Linux 平台项目
  | 'mobile'        // 移动端项目
  | 'remote'        // 远程设备/DevOps
  | 'fpga'          // FPGA/数字逻辑项目

export interface ProjectTypeConfig {
  id: ProjectType
  name: string
  icon: string
  color: string
  description: string
  specificFields: string[]
  knowledgeCategories: KnowledgeCategoryDef[]
}

export interface KnowledgeCategoryDef {
  id: string
  name: string
  icon: string
  description: string
}

/** 知识库固定 4 类（笔记仅保留在笔记面板/笔记库），.nexus 配置一致 */
export const FIXED_KNOWLEDGE_CATEGORIES: KnowledgeCategoryDef[] = [
  { id: 'debug', name: '调试经验', icon: '🐛', description: 'Bug 修复、问题排查经验' },
  { id: 'snippet', name: '代码片段', icon: '📝', description: '可复用代码与脚本' },
  { id: 'config', name: '配置模板', icon: '⚙️', description: '配置说明与模板' },
  { id: 'other', name: '其他', icon: '📁', description: '其他经验文档' },
]

/** 各类型均使用同一套知识分类（兼容旧代码引用） */
export const KNOWLEDGE_CATEGORIES: Record<ProjectType, KnowledgeCategoryDef[]> = {
  mcu: FIXED_KNOWLEDGE_CATEGORIES,
  ai: FIXED_KNOWLEDGE_CATEGORIES,
  software: FIXED_KNOWLEDGE_CATEGORIES,
  linux: FIXED_KNOWLEDGE_CATEGORIES,
  mobile: FIXED_KNOWLEDGE_CATEGORIES,
  remote: FIXED_KNOWLEDGE_CATEGORIES,
  fpga: FIXED_KNOWLEDGE_CATEGORIES,
}

export const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: 'mcu',
    name: 'MCU/嵌入式',
    icon: '🎛️',
    color: '#52c41a',
    description: '单片机和嵌入式系统开发',
    specificFields: ['chip', 'framework', 'peripherals', 'pinout'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.mcu,
  },
  {
    id: 'ai',
    name: 'AI/ML',
    icon: '🤖',
    color: '#722ed1',
    description: '人工智能和机器学习项目',
    specificFields: ['modelType', 'framework', 'dataset', 'metrics'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.ai,
  },
  {
    id: 'software',
    name: '软件/Web',
    icon: '💻',
    color: '#1677ff',
    description: '软件和Web应用开发',
    specificFields: ['techStack', 'database', 'api', 'deployment'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.software,
  },
  {
    id: 'linux',
    name: 'Linux平台',
    icon: '🐧',
    color: '#fa8c16',
    description: 'Linux系统和驱动开发',
    specificFields: ['distro', 'kernel', 'drivers', 'bootloader'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.linux,
  },
  {
    id: 'mobile',
    name: '移动端',
    icon: '📱',
    color: '#eb2f96',
    description: '移动应用开发 (iOS/Android/跨平台)',
    specificFields: ['platform', 'framework', 'nativeAPIs'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.mobile,
  },
  {
    id: 'remote',
    name: '远程设备',
    icon: '🌐',
    color: '#13c2c2',
    description: '远程设备管理和DevOps',
    specificFields: ['host', 'ssh', 'services', 'monitoring'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.remote,
  },
  {
    id: 'fpga',
    name: 'FPGA',
    icon: '🔷',
    color: '#9254de',
    description: 'FPGA 与数字逻辑开发',
    specificFields: ['vendor', 'toolchain', 'language', 'board'],
    knowledgeCategories: KNOWLEDGE_CATEGORIES.fpga,
  }
]

// ============================================================
// 知识库条目 (通用) - 核心数据单元
// ============================================================

export interface KnowledgeEntry {
  id: string
  title: string
  content: string                 // Markdown 内容
  projectType: ProjectType        // 所属项目类型
  category: string                // 分类 ID (对应 KNOWLEDGE_CATEGORIES)
  tags: string[]
  severity?: 'critical' | 'major' | 'minor' | 'trivial'
  // 来源项目关联（双向索引）
  projectId?: string              // 关联的项目 ID
  projectName?: string            // 关联的项目名称
  projectPath?: string            // 关联的项目路径
  sourceProject?: string          // 兼容旧字段
  sourceFile?: string
  // 元数据 (类型特定)
  metadata?: Record<string, any>
  // 未读标记
  isNew?: boolean
  // 时间
  createdAt: string
  updatedAt: string
}

// Electron API 类型声明
// Markdown 解析结果
export interface MarkdownParseResult {
  frontmatter: Record<string, any>
  content: string
  createdAt: string
  updatedAt: string
}

export interface ElectronAPI {
  readFile: (filePath: string) => Promise<string | null>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  deleteFile: (filePath: string) => Promise<boolean>
  listFiles: (dirPath: string) => Promise<string[]>
  exists: (filePath: string) => Promise<boolean>
  // 模板配置管理
  getTemplateConfig: () => Promise<NexusTemplateConfig>
  updateTemplateConfig: (config: Partial<NexusTemplateConfig>) => Promise<boolean>
  resetTemplateConfig: () => Promise<NexusTemplateConfig>
  getDataDir: () => Promise<string>
  /** 当前是否已配置 AI（智谱/OpenAI/Kimi/MiniMax/自定义），用于前端是否展示或允许 AI 功能 */
  getAiConfigured: () => Promise<boolean>
  readMarkdown: (filePath: string) => Promise<MarkdownParseResult | null>
  // 项目导入
  selectFolder: () => Promise<string | null>
  /** 选择配置文件并返回内容，用于「从文件加载配置」 */
  selectConfigFile: () => Promise<{ path: string; content: string } | null>
  /** 解析配置文件内容为 SilProjectConfig */
  parseProjectConfig: (content: string) => Promise<SilProjectConfig | null>
  analyzeProject: (projectPath: string) => Promise<ProjectAnalysis | null>
  getDefaultReposConfigPath: () => Promise<string>
  getDefaultReposBasePath: () => Promise<string>
  readProjectFile: (filePath: string) => Promise<string | null>
  writeProjectFile: (filePath: string, content: string) => Promise<boolean>
  deleteProjectFile: (filePath: string) => Promise<boolean>
  listProjectDir: (dirPath: string) => Promise<string[]>
  projectPathExists: (filePath: string) => Promise<boolean>
  getProjectLastModified: (projectPath: string) => Promise<string | null>
  createProjectDir: (dirPath: string) => Promise<boolean>
  verifyProjectPath: (project: { id: string, path: string, projectType?: string }) => 
    Promise<{ valid: boolean, newPath?: string, reason?: string }>
  verifyProjectPaths: (projects: Array<{ id: string, path: string, projectType?: string }>) => 
    Promise<Record<string, { valid: boolean, newPath?: string, reason?: string }>>
  // Git 操作
  /** 获取项目 git tags 版本列表（按创建时间降序），用于版本选择 */
  getVersionList: (projectPath: string) => Promise<Array<{ version: string; summary: string; createdAt: string }>>
  /** 在项目目录执行 git checkout ref（tag 或 commit），用于「在 Cursor 打开」时切到选中版本 */
  gitCheckout: (projectPath: string, ref: string) => Promise<{ success: boolean; error?: string }>
  gitClone: (url: string, targetPath: string, branch?: string) => Promise<GitOperationResult>
  onGitCloneProgress: (callback: (data: { percent: number; speedText: string }) => void) => () => void
  gitPull: (repoPath: string) => Promise<GitOperationResult>
  gitStatus: (repoPath: string) => Promise<GitStatusResult>
  openInFinder: (path: string) => Promise<boolean>
  openInTerminal: (path: string) => Promise<boolean>
  openInCursor: (path: string) => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>
  /** 应用窗口获得焦点时触发，返回取消订阅函数 */
  onAppFocus: (callback: () => void) => () => void
  // 项目目录管理
  moveToTypeDir: (sourcePath: string, projectType: string, projectName?: string) => Promise<MoveProjectResult>
  renameFolderToMatchName: (projectPath: string, projectDisplayName: string) => Promise<{ success: boolean; newPath: string; error?: string; skipped?: boolean }>
  getTypeDir: (projectType: string) => Promise<string>
  getCustomProjectTypes: () => Promise<CustomProjectType[]>
  addCustomProjectType: (payload: { id: string; name: string; icon?: string; color?: string }) =>
    Promise<{ success: boolean; type?: CustomProjectType; error?: string }>
  deleteProjectDir: (projectPath: string) => Promise<{ success: boolean; message?: string; error?: string }>
  // AI 分析
  analyzeGitHubRepo: (url: string, apiKey: string) => Promise<GitHubRepoAnalysis | null>
  /** 从文本中提取 GitHub 仓库链接（正则+AI），用于批量导入 */
  extractGitHubUrls: (text: string, apiKey: string) => Promise<{ urls: string[] }>
  analyzeLocalProject: (projectPath: string, apiKey: string) => Promise<LocalProjectAnalysis | null>
  generateProjectDocs: (projectPath: string, apiKey: string) => Promise<{ success: boolean; generated?: { notes: number; snippets: number; configs: number }; error?: string }>
  createProjectFromIdea: (apiKey: string, idea: string, projectType: string) => Promise<{ success: boolean; path?: string; nameEn?: string; introZh?: string; error?: string }>
  scanDirectory: (dirPath: string) => Promise<{ success: boolean; projects: Array<{ path: string; name: string; hasNexus: boolean; hasReadme: boolean }>; error?: string }>
  // .nexus 项目管理
  initSilProject: (projectPath: string, config: SilProjectConfig) => Promise<boolean>
  scanSilProject: (projectPath: string) => Promise<SilProjectData | null>
  syncFromProject: (projectPath: string, apiKey?: string, projectType?: string) => Promise<SilSyncResult>
  syncToProject: (projectPath: string, data: Partial<SilProjectData>) => Promise<boolean>
  checkPendingSync: (projectPath: string, projectType?: string) => Promise<PendingSyncResult>
  checkRemovedDocs: (projectPath: string, payload: { knowledge: Array<{ id: string; category: string; projectType: string }>; notes: string[] }) => Promise<{ removedKnowledgeIds: string[]; removedNoteIds: string[] }>
  reverseSyncToProjects: () => Promise<{ success: boolean; synced: number; skipped: number; errors: string[] }>
  clearKnowledgeBase: () => Promise<{ success: boolean; deleted: number; error?: string }>
  /** 清空中央笔记/知识库并删除所有项目内的 .nexus */
  resetAllSyncData: () => Promise<{ success: boolean; centralDeleted: number; removedNexusDirs: number; errors?: string[] }>
  removeNexusDir: (projectPath: string) => Promise<{ success: boolean; removed?: boolean; error?: string }>
  /** 获取知识库分类（固定 4 类，各项目类型返回相同） */
  getKnowledgeCategoriesForType: (projectType: string) => Promise<{ id: string; name: string; icon: string }[]>
  // 同步进度监听
  onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void
}

// 同步进度
export interface SyncProgress {
  step: string
  current: number
  total: number
  file?: string
}

// 待同步检测结果
export interface PendingSyncResult {
  hasPending: boolean
  pendingCount: number
  details: Record<string, number>  // { debug: 2, notes: 1, ... }
}

// ============================================================
// .nexus 本地项目管理
// ============================================================

// .nexus 项目配置 (project.yaml)
export interface SilProjectConfig {
  id?: string                     // 项目唯一标识（用于路径变化检测）
  name: string                    // 项目名称
  description?: string            // 项目描述
  chip?: string                   // 芯片型号
  framework?: string              // 开发框架
  peripherals?: string[]          // 使用的外设
  tags?: string[]                 // 标签
  githubUrl?: string              // 关联的 GitHub 仓库
  createdAt?: string
  projectType?: string            // 项目类型，写入 project.yaml，同步时决定 knowledge 目录与笔记面板筛选
}

// .nexus 目录中的文档
export interface SilDocument {
  id: string
  filename: string                // 文件名
  type: 'debug' | 'note' | 'snippet' | 'config' | 'other'
  title: string
  content: string                 // Markdown 内容
  tags: string[]
  createdAt: string
  updatedAt: string
}

// 扫描项目的完整数据
export interface SilProjectData {
  config: SilProjectConfig
  documents: SilDocument[]
  hasChanges: boolean             // 是否有未同步的变化
  lastSyncAt?: string
}

// 同步结果（成功时可能带最新版本信息，供项目管理展示）
export interface SilSyncResult {
  success: boolean
  imported: number
  updated: number
  errors: string[]
  latestVersion?: string
  latestVersionSummary?: string
  latestVersionDate?: string
}

// 本地项目 (用于管理器显示)
export interface LocalProject {
  id: string
  name: string
  path: string
  description?: string
  summary?: string                // AI 生成的详细介绍
  features?: string[]             // 主要功能特性
  projectType: ProjectType | string  // 项目类型（含自定义类型 id）
  // MCU 特有
  chip?: string
  framework?: string
  peripherals?: string[]
  // AI 特有
  modelType?: string              // 模型类型
  aiFramework?: string            // PyTorch, TensorFlow, etc.
  // 软件 特有
  techStack?: string[]            // 技术栈
  database?: string
  // Linux 特有
  distro?: string                 // 发行版
  kernel?: string
  // 移动端 特有
  mobilePlatform?: string         // iOS, Android, Flutter, RN
  // 远程设备 特有
  host?: string                   // 主机地址
  // 通用
  tags: string[]
  hasSil: boolean                 // 是否已初始化 .nexus
  documentCount: number           // 文档数量
  pendingCount?: number           // 待同步文档数量 (运行时计算)
  lastActivity?: string           // 最后活动时间
  lastOpenedInCursor?: string     // 最后在 Cursor 中打开的时间（ISO 字符串）
  addedAt?: string                // 加入列表的时间（ISO 字符串），用于排序：新导入的排最前
  githubUrl?: string
  status: 'active' | 'archived'
  // 项目版本（从 git tags 同步，用于展示与「在 Cursor 打开」时 checkout）
  latestVersion?: string
  latestVersionSummary?: string
  latestVersionDate?: string
}

// AI 分析结果 - GitHub 仓库
export interface GitHubRepoAnalysis {
  name: string
  description: string
  category: string
  tags: string[]
  branch: string
  starred: boolean
  summary?: string  // 基于 README 生成的详细介绍
}

// AI 分析结果 - 本地项目
export interface LocalProjectAnalysis {
  name: string                    // 项目名称
  description: string             // 简短描述
  summary: string                 // 详细介绍
  projectType?: ProjectType | string  // 项目类型（已知或 AI 建议的新类型 id）
  suggestedNewTypeName?: string   // 当为新类型时的中文显示名建议
  confidenceByType?: Record<string, number>  // 对六类归属的推荐占比（0-1）
  chip: string
  framework: string
  peripherals: string[]
  tags: string[]
  features: string[]
}

// 自定义项目类型（用户创建）
export interface CustomProjectType {
  id: string
  name: string
  icon: string
  color: string
  templateRef?: string
}

// 移动项目目录结果
export interface MoveProjectResult {
  success: boolean
  newPath: string
  moved?: boolean
  error?: string
}

// Git 操作结果
export interface GitOperationResult {
  success: boolean
  message: string
  error?: string
}

export interface GitStatusResult {
  exists: boolean
  isRepo: boolean
  branch?: string
  ahead?: number
  behind?: number
  modified?: number
  hasChanges?: boolean
  lastCommit?: string
  lastCommitDate?: string
}

// GitHub 仓库配置
export interface GitHubRepo {
  id: string
  name: string
  description: string
  url: string
  category: string
  localPath: string
  branch: string
  tags: string[]
  starred: boolean
  summary?: string  // 详细介绍（基于 README 生成）
}

export interface GitHubCategory {
  id: string
  name: string
  icon: string
  color: string
}

// 项目分析结果
export interface ProjectAnalysis {
  projectPath: string
  projectName: string
  detectedType: {
    name: string
    confidence: number
    indicators: string[]
  }
  chip?: {
    name: string
    manufacturer: string
  }
  framework?: {
    name: string
    version?: string
  }
  configFiles: {
    filename: string
    path: string
    type: string
    preview: string
  }[]
  codeFiles: {
    filename: string
    path: string
    language: string
    category: string
    linesOfCode: number
  }[]
  detectedPeripherals: string[]
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// ============================================================
// 已废弃的类型定义已移至 types/deprecated.ts
// 以下类型不再使用，实际使用：
// - KnowledgeEntry (替代 CodeSnippet、DebugExperience、ConfigTemplate)
// - LocalProject (替代 Project)
// ============================================================

// ============================================================
// 笔记 (Note)
// Markdown 格式的开发笔记
// ============================================================

export const NOTE_CATEGORIES = [
  { id: 'learning',  name: '学习笔记', icon: '📖', description: '技术学习、文档阅读、课程记录' },
  { id: 'summary',   name: '开发总结', icon: '📋', description: '项目复盘、阶段总结、功能开发记录' },
  { id: 'design',    name: '方案设计', icon: '🏗️', description: '架构设计、技术选型、方案对比' },
  { id: 'issue',     name: '问题记录', icon: '⚠️', description: '踩坑记录、升级迁移、兼容性问题' },
  { id: 'reference', name: '参考手册', icon: '📚', description: '速查表、API参考、配置说明' },
] as const

export interface Note {
  id: string
  title: string
  content: string                 // Markdown
  category?: string               // 笔记分类 (learning, summary, design, issue, reference)
  
  // 关联 (可选)
  platformId?: string
  peripheralIds?: string[]
  projectId?: string
  
  /** 所属项目类型，笔记面板按此分类 */
  projectType?: ProjectType | string
  projectName?: string
  projectPath?: string
  sourceProject?: string

  tags: string[]
  createdAt: string
  updatedAt: string
  isNew?: boolean
}

// ============================================================
// 搜索结果
// ============================================================

export interface SearchResult {
  type: 'knowledge' | 'note' | 'project'  // 简化类型：knowledge 包含所有知识库类型（debug/snippet/config等）
  id: string
  title: string
  subtitle?: string
  preview: string
  score?: number
}

// ============================================================
// 预设数据：常用芯片和框架
// ============================================================

export const CHIP_PRESETS = [
  // Espressif
  { name: 'ESP32', manufacturer: 'Espressif', core: 'Xtensa LX6 Dual-Core' },
  { name: 'ESP32-S2', manufacturer: 'Espressif', core: 'Xtensa LX7 Single-Core' },
  { name: 'ESP32-S3', manufacturer: 'Espressif', core: 'Xtensa LX7 Dual-Core' },
  { name: 'ESP32-C3', manufacturer: 'Espressif', core: 'RISC-V Single-Core' },
  { name: 'ESP32-C5', manufacturer: 'Espressif', core: 'RISC-V Single-Core' },
  { name: 'ESP32-C6', manufacturer: 'Espressif', core: 'RISC-V Single-Core' },
  { name: 'ESP32-P4', manufacturer: 'Espressif', core: 'RISC-V Dual-Core' },
  // 思澈
  { name: 'SF32LB52X', manufacturer: 'SiFli', core: 'ARM Cortex-M33' },
  { name: 'SF32LB55X', manufacturer: 'SiFli', core: 'ARM Cortex-M33' },
  { name: 'SF32LB56X', manufacturer: 'SiFli', core: 'ARM Cortex-M33' },
  { name: 'SF32LB58X', manufacturer: 'SiFli', core: 'ARM Cortex-M33' },
  // Rockchip
  { name: 'RK3576', manufacturer: 'Rockchip', core: 'ARM Cortex-A72/A53' },
  { name: 'RK3588', manufacturer: 'Rockchip', core: 'ARM Cortex-A76/A55' },
  // 嘉楠
  { name: 'K230', manufacturer: 'Canaan', core: 'RISC-V Dual-Core' },
  // STM32
  { name: 'STM32F103', manufacturer: 'STMicroelectronics', core: 'ARM Cortex-M3' },
  { name: 'STM32F407', manufacturer: 'STMicroelectronics', core: 'ARM Cortex-M4' },
  { name: 'STM32H750', manufacturer: 'STMicroelectronics', core: 'ARM Cortex-M7' },
] as const

export const FRAMEWORK_PRESETS = [
  { name: 'ESP-IDF', buildSystem: 'CMake', configFiles: ['sdkconfig', 'CMakeLists.txt', 'idf_component.yml'] },
  { name: 'Arduino', buildSystem: 'Arduino/PlatformIO', configFiles: ['platformio.ini'] },
  { name: 'RT-Thread', buildSystem: 'SCons', configFiles: ['Kconfig', 'SConscript', 'rtconfig.h'] },
  { name: 'PlatformIO', buildSystem: 'PlatformIO', configFiles: ['platformio.ini'] },
  { name: 'MicroPython', buildSystem: 'None', configFiles: [] },
  { name: 'Zephyr', buildSystem: 'CMake', configFiles: ['prj.conf', 'CMakeLists.txt'] },
  { name: 'FreeRTOS', buildSystem: 'CMake/Make', configFiles: ['FreeRTOSConfig.h'] },
  { name: 'Bare Metal', buildSystem: 'Make/CMake', configFiles: ['Makefile'] },
] as const

export const PERIPHERAL_PRESETS = [
  // 显示
  { name: 'ST7789', type: 'display', interface: 'spi', specs: { resolution: '240x320', color: 'RGB565' } },
  { name: 'ST7701', type: 'display', interface: 'mipi_dsi', specs: { resolution: '480x480', color: 'RGB888' } },
  { name: 'ST7703', type: 'display', interface: 'mipi_dsi', specs: { resolution: '720x720', color: 'RGB666' } },
  { name: 'SSD1306', type: 'display', interface: 'i2c', specs: { resolution: '128x64', color: 'Mono' } },
  { name: 'WS2812', type: 'display', interface: 'rmt', specs: { type: 'RGB LED' } },
  { name: 'E-Paper 7.3"', type: 'display', interface: 'spi', specs: { resolution: '800x480', color: '6-color' } },
  // 传感器
  { name: 'QMI8658', type: 'sensor', interface: 'i2c', specs: { type: '6-axis IMU' } },
  { name: 'MPU6050', type: 'sensor', interface: 'i2c', specs: { type: '6-axis IMU' } },
  { name: 'BME280', type: 'sensor', interface: 'i2c', specs: { type: '温湿度气压' } },
  { name: 'DHT11', type: 'sensor', interface: 'gpio', specs: { type: '温湿度' } },
  // 音频
  { name: 'ES8311', type: 'audio', interface: 'i2s', specs: { type: 'Audio Codec' } },
  { name: 'MAX98357', type: 'audio', interface: 'i2s', specs: { type: 'I2S Amplifier' } },
  { name: 'INMP441', type: 'audio', interface: 'i2s', specs: { type: 'MEMS Microphone' } },
  // 摄像头
  { name: 'OV5647', type: 'camera', interface: 'mipi_csi', specs: { resolution: '2592x1944' } },
  { name: 'OV2640', type: 'camera', interface: 'spi', specs: { resolution: '1600x1200' } },
  // 触摸
  { name: 'GT911', type: 'input', interface: 'i2c', specs: { type: 'Capacitive Touch' } },
  { name: 'FT6336', type: 'input', interface: 'i2c', specs: { type: 'Capacitive Touch' } },
] as const
