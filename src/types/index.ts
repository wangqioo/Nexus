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

// 知识分类体系 - 每种项目类型有自己的分类
export const KNOWLEDGE_CATEGORIES: Record<ProjectType, KnowledgeCategoryDef[]> = {
  mcu: [
    { id: 'debug', name: '调试经验', icon: '🐛', description: '硬件调试、烧录问题、外设驱动调试' },
    { id: 'snippet', name: '代码片段', icon: '📝', description: '可复用的驱动代码、初始化模板' },
    { id: 'peripheral', name: '外设驱动', icon: '🔌', description: '传感器、显示屏、通信模块配置' },
    { id: 'platform', name: '芯片平台', icon: '🎛️', description: '芯片+框架的组合配置' },
    { id: 'config', name: '配置模板', icon: '⚙️', description: 'sdkconfig、CMake、Kconfig 模板' },
  ],
  ai: [
    { id: 'model', name: '模型配置', icon: '🧠', description: '模型架构、超参数、训练配置' },
    { id: 'training', name: '训练经验', icon: '📊', description: '训练技巧、loss 调优、数据增强' },
    { id: 'inference', name: '推理部署', icon: '⚡', description: '模型转换、量化、边缘部署' },
    { id: 'dataset', name: '数据处理', icon: '📦', description: '数据集处理、标注、预处理流程' },
    { id: 'prompt', name: 'Prompt工程', icon: '💬', description: 'Prompt 模板、RAG 方案、API 封装' },
  ],
  software: [
    { id: 'architecture', name: '架构设计', icon: '🏗️', description: '系统架构、设计模式、技术选型' },
    { id: 'api', name: 'API设计', icon: '🔗', description: 'REST/GraphQL、接口规范、认证方案' },
    { id: 'database', name: '数据库', icon: '💾', description: '数据库设计、SQL 优化、迁移方案' },
    { id: 'deployment', name: '部署配置', icon: '🚀', description: 'Docker、CI/CD、环境配置' },
    { id: 'debug', name: '调试经验', icon: '🐛', description: 'Bug 修复经验、性能优化' },
  ],
  linux: [
    { id: 'system', name: '系统配置', icon: '🔧', description: '系统安装、内核编译、启动配置' },
    { id: 'driver', name: '驱动开发', icon: '💽', description: '内核模块、设备树、驱动移植' },
    { id: 'network', name: '网络配置', icon: '🌐', description: '网络调优、防火墙、VPN 配置' },
    { id: 'cross-compile', name: '交叉编译', icon: '🔨', description: '工具链配置、SDK 构建、镜像打包' },
    { id: 'debug', name: '调试经验', icon: '🐛', description: '系统故障排查、性能分析' },
  ],
  mobile: [
    { id: 'ui', name: 'UI组件', icon: '🎨', description: 'UI 框架、组件库、动画方案' },
    { id: 'native', name: '原生能力', icon: '📱', description: '相机、蓝牙、传感器、推送通知' },
    { id: 'network', name: '网络通信', icon: '📡', description: 'HTTP、WebSocket、数据同步' },
    { id: 'performance', name: '性能优化', icon: '⚡', description: '启动优化、内存管理、包体积' },
    { id: 'debug', name: '调试经验', icon: '🐛', description: 'Crash 分析、兼容性问题' },
  ],
  remote: [
    { id: 'connection', name: '连接配置', icon: '🔗', description: 'SSH、VNC、远程桌面配置' },
    { id: 'deployment', name: '部署脚本', icon: '📜', description: '自动化部署、环境搭建脚本' },
    { id: 'monitoring', name: '监控运维', icon: '📈', description: '系统监控、告警、日志管理' },
    { id: 'debug', name: '排障经验', icon: '🐛', description: '网络故障、服务异常排查' },
  ],
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
  readMarkdown: (filePath: string) => Promise<MarkdownParseResult | null>
  // 项目导入
  selectFolder: () => Promise<string | null>
  analyzeProject: (projectPath: string) => Promise<ProjectAnalysis | null>
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
  gitClone: (url: string, targetPath: string, branch?: string) => Promise<GitOperationResult>
  gitPull: (repoPath: string) => Promise<GitOperationResult>
  gitStatus: (repoPath: string) => Promise<GitStatusResult>
  openInFinder: (path: string) => Promise<boolean>
  openInTerminal: (path: string) => Promise<boolean>
  openInCursor: (path: string) => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>
  // 项目目录管理
  moveToTypeDir: (sourcePath: string, projectType: string, projectName: string) => Promise<MoveProjectResult>
  getTypeDir: (projectType: string) => Promise<string>
  deleteProjectDir: (projectPath: string) => Promise<{ success: boolean; message?: string; error?: string }>
  // AI 分析
  analyzeGitHubRepo: (url: string, apiKey: string) => Promise<GitHubRepoAnalysis | null>
  analyzeLocalProject: (projectPath: string, apiKey: string) => Promise<LocalProjectAnalysis | null>
  generateProjectDocs: (projectPath: string, apiKey: string) => Promise<{ success: boolean; generated?: { notes: number; snippets: number; configs: number }; error?: string }>
  scanDirectory: (dirPath: string) => Promise<{ success: boolean; projects: Array<{ path: string; name: string; hasNexus: boolean; hasReadme: boolean }>; error?: string }>
  // .nexus 项目管理
  initSilProject: (projectPath: string, config: SilProjectConfig) => Promise<boolean>
  scanSilProject: (projectPath: string) => Promise<SilProjectData | null>
  syncFromProject: (projectPath: string, apiKey?: string, projectType?: string) => Promise<SilSyncResult>
  syncToProject: (projectPath: string, data: Partial<SilProjectData>) => Promise<boolean>
  checkPendingSync: (projectPath: string, projectType?: string) => Promise<PendingSyncResult>
  reverseSyncToProjects: () => Promise<{ success: boolean; synced: number; skipped: number; errors: string[] }>
  clearKnowledgeBase: () => Promise<{ success: boolean; deleted: number; error?: string }>
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
}

// .nexus 目录中的文档
export interface SilDocument {
  id: string
  filename: string                // 文件名
  type: 'debug' | 'note' | 'snippet' | 'config'
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

// 同步结果
export interface SilSyncResult {
  success: boolean
  imported: number                // 导入的文档数
  updated: number                 // 更新的文档数
  errors: string[]
}

// 本地项目 (用于管理器显示)
export interface LocalProject {
  id: string
  name: string
  path: string
  description?: string
  summary?: string                // AI 生成的详细介绍
  features?: string[]             // 主要功能特性
  projectType: ProjectType        // 项目类型 (新增)
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
  githubUrl?: string
  status: 'active' | 'archived'
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
  projectType?: ProjectType       // 项目类型
  chip: string                    // 芯片型号
  framework: string               // 开发框架
  peripherals: string[]           // 使用的外设
  tags: string[]                  // 标签
  features: string[]              // 主要功能特性
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
// 核心实体：平台 (Platform)
// 包含框架和芯片的组合，如 "ESP-IDF + ESP32-S3"
// ============================================================

export interface Platform {
  id: string
  name: string                    // "ESP32-S3 (ESP-IDF)"
  
  // 芯片信息
  chip: {
    name: string                  // "ESP32-S3"
    manufacturer: string          // "Espressif"
    core: string                  // "Xtensa LX7 Dual-Core"
    features: string[]            // ["WiFi", "BLE5", "USB-OTG", "AI加速"]
  }
  
  // 框架信息
  framework: {
    name: string                  // "ESP-IDF"
    version?: string              // "5.3"
    buildSystem: string           // "CMake"
    configFiles: string[]         // ["sdkconfig", "CMakeLists.txt", "idf_component.yml"]
  }
  
  // 工具链
  toolchain: {
    compiler: string              // "xtensa-esp32s3-elf-gcc"
    initScript?: string           // ". $IDF_PATH/export.sh"
    buildCommand?: string         // "idf.py build"
    flashCommand?: string         // "idf.py -p /dev/ttyUSB0 flash"
  }
  
  // 引脚定义 (常用引脚)
  pinout?: PinDefinition[]
  
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface PinDefinition {
  pin: string                     // "GPIO11"
  functions: string[]             // ["I2C_SDA", "SPI_MOSI", "UART_TX"]
  notes?: string
}

// ============================================================
// 外设 (Peripheral)
// 传感器、显示屏、通信模块等
// ============================================================

export interface Peripheral {
  id: string
  name: string                    // "ST7789 LCD"
  type: PeripheralType
  manufacturer?: string           // "Sitronix"
  
  // 接口信息
  interface: {
    type: InterfaceType           // "spi"
    speed?: string                // "40MHz"
    config?: Record<string, any>  // 接口特定配置
  }
  
  // 规格
  specs?: {
    [key: string]: string | number // 如 resolution: "240x320", colorDepth: "16bit"
  }
  
  // 默认接线
  defaultWiring: WiringConfig[]
  
  // 关联的代码片段
  snippetIds: string[]
  
  // 数据手册链接
  datasheet?: string
  
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PeripheralType = 
  | 'display'       // LCD, OLED, 墨水屏, LED矩阵
  | 'sensor'        // IMU, 温湿度, 光照, 距离
  | 'audio'         // 麦克风, 扬声器, 编解码器
  | 'camera'        // 摄像头模块
  | 'communication' // WiFi模块, BLE模块, LoRa, RS485
  | 'storage'       // SD卡, Flash, EEPROM
  | 'actuator'      // 电机, 舵机, 继电器
  | 'input'         // 按键, 触摸, 编码器
  | 'power'         // 电源管理, 充电IC
  | 'other'

export type InterfaceType = 
  | 'spi' | 'i2c' | 'uart' | 'i2s' 
  | 'rmt' | 'mipi_dsi' | 'mipi_csi' 
  | 'sdmmc' | 'usb' | 'gpio' | 'pwm' | 'adc' | 'dac'
  | 'other'

export interface WiringConfig {
  peripheralPin: string           // "SCL"
  mcuPin: string                  // "GPIO11"
  required: boolean
  notes?: string
}

// ============================================================
// 代码片段 (CodeSnippet)
// 可复用的代码，关联到平台和外设
// ============================================================

export interface CodeSnippet {
  id: string
  name: string                    // "QMI8658 IMU 初始化"
  category: SnippetCategory
  
  // 关联信息
  platformIds: string[]           // 适用的平台
  peripheralIds: string[]         // 相关的外设
  
  // 代码内容
  language: string                // "c", "cpp", "python"
  code: string
  
  // 使用说明
  description: string
  usage?: string                  // 如何使用这段代码
  dependencies?: string[]         // 依赖的库或组件
  
  // 来源
  sourceProject?: string          // 来自哪个项目
  sourceFile?: string             // 原始文件路径
  
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type SnippetCategory = 
  | 'driver'        // 外设驱动代码
  | 'init'          // 初始化代码 (GPIO, 时钟, 外设)
  | 'algorithm'     // 算法代码 (滤波, 效果, 计算)
  | 'config'        // 配置代码 (WiFi, NVS, 休眠)
  | 'protocol'      // 通信协议 (I2C读写, SPI传输)
  | 'middleware'    // 中间件 (LVGL集成, 音频处理)
  | 'utility'       // 工具函数 (日志, 调试, 转换)
  | 'template'      // 模板代码 (main函数, 任务框架)

// ============================================================
// 调试经验 (DebugExperience)
// 问题-环境-根因-解决方案
// ============================================================

export interface DebugExperience {
  id: string
  title: string                   // 简短描述问题
  
  // 环境信息 (关键!)
  environment: {
    platformId?: string           // 关联的平台
    peripheralIds?: string[]      // 涉及的外设
    frameworkVersion?: string     // 框架版本
    sdkVersion?: string           // SDK版本
    customEnv?: Record<string, string>  // 其他环境信息
  }
  
  // 问题描述
  symptom: string                 // 现象：发生了什么
  errorLog?: string               // 错误日志/输出
  
  // 分析
  rootCause: string               // 根因：为什么会发生
  
  // 解决方案
  solution: string                // 如何解决
  solutionCode?: string           // 修复代码
  
  // 关联
  relatedSnippetIds?: string[]    // 相关的代码片段
  
  // 重要程度
  severity: 'critical' | 'major' | 'minor' | 'trivial'
  
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================
// 配置模板 (ConfigTemplate)
// sdkconfig, CMakeLists, Kconfig, platformio.ini 等
// ============================================================

export interface ConfigTemplate {
  id: string
  name: string                    // "ESP32-S3 + ST7789 SPI显示"
  description: string
  
  // 适用范围
  platformId: string              // 关联的平台
  peripheralIds?: string[]        // 配置针对哪些外设
  
  // 配置文件
  files: ConfigFile[]
  
  // 来源
  sourceProject?: string
  
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ConfigFile {
  filename: string                // "sdkconfig.defaults"
  path?: string                   // "相对路径，如 main/"
  content: string
  description?: string
}

// ============================================================
// 项目 (Project)
// 一个完整的 MCU 项目，关联所有资源
// ============================================================

export interface Project {
  id: string
  name: string
  description: string
  
  // 关联
  platformId: string
  peripheralIds: string[]
  configTemplateId?: string
  
  // 项目路径 (本地)
  localPath?: string
  
  // 状态
  status: 'active' | 'completed' | 'archived'
  
  // 笔记
  notes?: string
  
  tags: string[]
  createdAt: string
  updatedAt: string
}

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
  
  // 项目关联（双向索引）
  projectName?: string            // 关联的项目名称
  projectPath?: string            // 关联的项目路径
  sourceProject?: string          // 兼容旧字段
  
  tags: string[]
  createdAt: string
  updatedAt: string
  
  isNew?: boolean                 // 是否为新同步的文档（未读）
}

// ============================================================
// 搜索结果
// ============================================================

export interface SearchResult {
  type: 'platform' | 'peripheral' | 'snippet' | 'debug' | 'config' | 'project' | 'note'
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
