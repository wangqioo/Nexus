// ============================================================
// 已废弃的类型定义
// 这些类型在 v2.0 重构后不再使用，保留用于向后兼容
// 实际使用的类型：KnowledgeEntry（替代 CodeSnippet、DebugExperience、ConfigTemplate）
//                  LocalProject（替代 Project）
// ============================================================

/**
 * @deprecated 使用 KnowledgeEntry 替代
 */
export interface Platform {
  id: string
  name: string
  chip: {
    name: string
    manufacturer: string
    core: string
    features: string[]
  }
  framework: {
    name: string
    version?: string
    buildSystem: string
    configFiles: string[]
  }
  toolchain: {
    compiler: string
    initScript?: string
    buildCommand?: string
    flashCommand?: string
  }
  pinout?: Array<{
    pin: string
    functions: string[]
    notes?: string
  }>
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * @deprecated 使用 KnowledgeEntry 替代
 */
export interface Peripheral {
  id: string
  name: string
  type: 'display' | 'sensor' | 'audio' | 'camera' | 'communication' | 'storage' | 'actuator' | 'input' | 'power' | 'other'
  manufacturer?: string
  interface: {
    type: string
    speed?: string
    config?: Record<string, any>
  }
  specs?: Record<string, string | number>
  defaultWiring: Array<{
    peripheralPin: string
    mcuPin: string
    required: boolean
    notes?: string
  }>
  snippetIds: string[]
  datasheet?: string
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * @deprecated 使用 KnowledgeEntry (category: 'snippet') 替代
 */
export interface CodeSnippet {
  id: string
  name: string
  category: 'driver' | 'init' | 'algorithm' | 'config' | 'protocol' | 'middleware' | 'utility' | 'template'
  platformIds: string[]
  peripheralIds: string[]
  language: string
  code: string
  description: string
  usage?: string
  dependencies?: string[]
  sourceProject?: string
  sourceFile?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * @deprecated 使用 KnowledgeEntry (category: 'debug') 替代
 */
export interface DebugExperience {
  id: string
  title: string
  environment: {
    platformId?: string
    peripheralIds?: string[]
    frameworkVersion?: string
    sdkVersion?: string
    customEnv?: Record<string, string>
  }
  symptom: string
  errorLog?: string
  rootCause: string
  solution: string
  solutionCode?: string
  relatedSnippetIds?: string[]
  severity: 'critical' | 'major' | 'minor' | 'trivial'
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * @deprecated 使用 KnowledgeEntry (category: 'config') 替代
 */
export interface ConfigTemplate {
  id: string
  name: string
  description: string
  platformId: string
  peripheralIds?: string[]
  files: Array<{
    filename: string
    path?: string
    content: string
    description?: string
  }>
  sourceProject?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/**
 * @deprecated 使用 LocalProject 替代
 */
export interface Project {
  id: string
  name: string
  description: string
  platformId: string
  peripheralIds: string[]
  configTemplateId?: string
  localPath?: string
  status: 'active' | 'completed' | 'archived'
  notes?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}
