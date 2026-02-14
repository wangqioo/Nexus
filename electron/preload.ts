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
  
  // 项目导入 (绝对路径)
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  analyzeProject: (path: string) => ipcRenderer.invoke('project:analyze', path),
  readProjectFile: (path: string) => ipcRenderer.invoke('project:readFile', path),
  writeProjectFile: (path: string, content: string) => ipcRenderer.invoke('project:writeFile', path, content),
  deleteProjectFile: (path: string) => ipcRenderer.invoke('project:deleteFile', path),
  listProjectDir: (path: string) => ipcRenderer.invoke('project:listDir', path),
  projectPathExists: (path: string) => ipcRenderer.invoke('project:exists', path),
  getProjectLastModified: (path: string) => ipcRenderer.invoke('project:getLastModified', path),
  createProjectDir: (path: string) => ipcRenderer.invoke('project:createDir', path),
  
  // Git 操作
  gitClone: (url: string, targetPath: string, branch?: string) => 
    ipcRenderer.invoke('git:clone', url, targetPath, branch),
  gitPull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  
  // AI 分析
  analyzeGitHubRepo: (url: string, apiKey: string) => 
    ipcRenderer.invoke('ai:analyzeGitHubRepo', url, apiKey),
  analyzeLocalProject: (projectPath: string, apiKey: string) =>
    ipcRenderer.invoke('ai:analyzeLocalProject', projectPath, apiKey),
  generateProjectDocs: (projectPath: string, apiKey: string) =>
    ipcRenderer.invoke('ai:generateProjectDocs', projectPath, apiKey),
  scanDirectory: (dirPath: string) =>
    ipcRenderer.invoke('project:scanDirectory', dirPath),
  
  // 系统操作
  openInFinder: (path: string) => ipcRenderer.invoke('shell:openInFinder', path),
  openInTerminal: (path: string) => ipcRenderer.invoke('shell:openInTerminal', path),
  openInCursor: (path: string) => ipcRenderer.invoke('shell:openInCursor', path),
  
  // 项目目录管理
  moveToTypeDir: (sourcePath: string, projectType: string, projectName: string) =>
    ipcRenderer.invoke('project:moveToTypeDir', sourcePath, projectType, projectName),
  getTypeDir: (projectType: string) => ipcRenderer.invoke('project:getTypeDir', projectType),
  deleteProjectDir: (projectPath: string) => ipcRenderer.invoke('project:deleteDir', projectPath),
  
  // .nexus 项目管理
  initSilProject: (projectPath: string, config: any) => 
    ipcRenderer.invoke('sil:init', projectPath, config),
  scanSilProject: (projectPath: string) => 
    ipcRenderer.invoke('sil:scan', projectPath),
  syncFromProject: (projectPath: string, apiKey?: string) => 
    ipcRenderer.invoke('sil:syncFrom', projectPath, apiKey),
  syncToProject: (projectPath: string, data: any) => 
    ipcRenderer.invoke('sil:syncTo', projectPath, data),
  checkPendingSync: (projectPath: string) =>
    ipcRenderer.invoke('sil:checkPending', projectPath),
  reverseSyncToProjects: () =>
    ipcRenderer.invoke('sil:reverseSync'),
  clearKnowledgeBase: () =>
    ipcRenderer.invoke('knowledge:clear'),
  
  // 同步进度监听
  onSyncProgress: (callback: (progress: { step: string; current: number; total: number; file?: string }) => void) => {
    const handler = (_: any, progress: any) => callback(progress)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },
})
