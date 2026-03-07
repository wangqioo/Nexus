import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作 (相对于 ~/.nexus/)
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path),
  listFiles: (dir: string) => ipcRenderer.invoke('fs:listFiles', dir),
  readMarkdown: (path: string) => ipcRenderer.invoke('fs:readMarkdown', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  getDataDir: () => ipcRenderer.invoke('fs:getDataDir'),
  getAiConfigured: () => ipcRenderer.invoke('config:getAiConfigured'),

  // 模板配置管理
  getTemplateConfig: () => ipcRenderer.invoke('template:get'),
  updateTemplateConfig: (config: any) => ipcRenderer.invoke('template:update', config),
  resetTemplateConfig: () => ipcRenderer.invoke('template:reset'),
  
  // 项目导入 (绝对路径)
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectConfigFile: () => ipcRenderer.invoke('dialog:selectConfigFile'),
  parseProjectConfig: (content: string) => ipcRenderer.invoke('config:parseProjectConfig', content),
  analyzeProject: (path: string) => ipcRenderer.invoke('project:analyze', path),
  getDefaultReposConfigPath: () => ipcRenderer.invoke('project:getDefaultReposConfigPath'),
  getDefaultReposBasePath: () => ipcRenderer.invoke('project:getDefaultReposBasePath'),
  readProjectFile: (path: string) => ipcRenderer.invoke('project:readFile', path),
  writeProjectFile: (path: string, content: string) => ipcRenderer.invoke('project:writeFile', path, content),
  deleteProjectFile: (path: string) => ipcRenderer.invoke('project:deleteFile', path),
  listProjectDir: (path: string) => ipcRenderer.invoke('project:listDir', path),
  projectPathExists: (path: string) => ipcRenderer.invoke('project:exists', path),
  getProjectLastModified: (path: string) => ipcRenderer.invoke('project:getLastModified', path),
  createProjectDir: (path: string) => ipcRenderer.invoke('project:createDir', path),
  verifyProjectPath: (project: { id: string, path: string, projectType?: string }) => 
    ipcRenderer.invoke('project:verifyPath', project),
  verifyProjectPaths: (projects: Array<{ id: string, path: string, projectType?: string }>) => 
    ipcRenderer.invoke('project:verifyPaths', projects),
  
  // Git 操作
  gitClone: (url: string, targetPath: string, branch?: string) =>
    ipcRenderer.invoke('git:clone', url, targetPath, branch),
  onGitCloneProgress: (callback: (data: { percent: number; speedText: string }) => void) => {
    const fn = (_: unknown, data: { percent: number; speedText: string }) => callback(data)
    ipcRenderer.on('git:clone:progress', fn)
    return () => ipcRenderer.removeListener('git:clone:progress', fn)
  },
  gitPull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  getVersionList: (projectPath: string) => ipcRenderer.invoke('project:getVersionList', projectPath),
  gitCheckout: (projectPath: string, ref: string) => ipcRenderer.invoke('project:gitCheckout', projectPath, ref),
  
  // AI 分析
  analyzeGitHubRepo: (url: string, apiKey: string) =>
    ipcRenderer.invoke('ai:analyzeGitHubRepo', url, apiKey),
  extractGitHubUrls: (text: string, apiKey: string) =>
    ipcRenderer.invoke('ai:extractGitHubUrls', text, apiKey),
  analyzeLocalProject: (projectPath: string, apiKey: string) =>
    ipcRenderer.invoke('ai:analyzeLocalProject', projectPath, apiKey),
  generateProjectDocs: (projectPath: string, apiKey: string) =>
    ipcRenderer.invoke('ai:generateProjectDocs', projectPath, apiKey),
  createProjectFromIdea: (apiKey: string, idea: string, projectType: string) =>
    ipcRenderer.invoke('ai:createProjectFromIdea', apiKey, idea, projectType),
  scanDirectory: (dirPath: string) =>
    ipcRenderer.invoke('project:scanDirectory', dirPath),
  
  // 系统操作
  openInFinder: (path: string) => ipcRenderer.invoke('shell:openInFinder', path),
  openInTerminal: (path: string) => ipcRenderer.invoke('shell:openInTerminal', path),
  openInCursor: (path: string) => ipcRenderer.invoke('shell:openInCursor', path),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // 应用窗口获得焦点时触发（用于自动刷新项目管理等）
  onAppFocus: (callback: () => void) => {
    const fn = () => callback()
    ipcRenderer.on('app:focus', fn)
    return () => ipcRenderer.removeListener('app:focus', fn)
  },

  // 项目目录管理
  moveToTypeDir: (sourcePath: string, projectType: string, projectName?: string) =>
    ipcRenderer.invoke('project:moveToTypeDir', sourcePath, projectType, projectName ?? ''),
  renameFolderToMatchName: (projectPath: string, projectDisplayName: string) =>
    ipcRenderer.invoke('project:renameFolderToMatchName', projectPath, projectDisplayName),
  getTypeDir: (projectType: string) => ipcRenderer.invoke('project:getTypeDir', projectType),
  getCustomProjectTypes: () => ipcRenderer.invoke('project:getCustomTypes'),
  addCustomProjectType: (payload: { id: string; name: string; icon?: string; color?: string }) =>
    ipcRenderer.invoke('project:addCustomType', payload),
  deleteProjectDir: (projectPath: string) => ipcRenderer.invoke('project:deleteDir', projectPath),
  
  // .nexus 项目管理
  initSilProject: (projectPath: string, config: any) => 
    ipcRenderer.invoke('sil:init', projectPath, config),
  scanSilProject: (projectPath: string) => 
    ipcRenderer.invoke('sil:scan', projectPath),
  syncFromProject: (projectPath: string, apiKey?: string, projectType?: string) =>
    ipcRenderer.invoke('sil:syncFrom', projectPath, apiKey, projectType),
  syncToProject: (projectPath: string, data: any) => 
    ipcRenderer.invoke('sil:syncTo', projectPath, data),
  checkPendingSync: (projectPath: string, projectType?: string) =>
    ipcRenderer.invoke('sil:checkPending', projectPath, projectType),
  checkRemovedDocs: (projectPath: string, payload: { knowledge: Array<{ id: string; category: string; projectType: string }>; notes: string[] }) =>
    ipcRenderer.invoke('sil:checkRemovedDocs', projectPath, payload),
  reverseSyncToProjects: () =>
    ipcRenderer.invoke('sil:reverseSync'),
  clearKnowledgeBase: () =>
    ipcRenderer.invoke('knowledge:clear'),
  /** 清空中央笔记/知识库并删除所有项目内的 .nexus，便于重新配置 */
  resetAllSyncData: () =>
    ipcRenderer.invoke('sil:resetAllSyncData'),
  removeNexusDir: (projectPath: string) =>
    ipcRenderer.invoke('sil:removeNexusDir', projectPath),
  getKnowledgeCategoriesForType: (projectType: string) =>
    ipcRenderer.invoke('knowledge:getCategoriesForType', projectType),

  // 同步进度监听
  onSyncProgress: (callback: (progress: { step: string; current: number; total: number; file?: string }) => void) => {
    const handler = (_: any, progress: any) => callback(progress)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },
})
