import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 数据存储目录
const DATA_DIR = path.join(os.homedir(), '.nexus')

// 确保数据目录存在 (v5 知识库目录结构)
function ensureDataDirs() {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, 'knowledge'),
    path.join(DATA_DIR, 'notes'),
    path.join(DATA_DIR, 'projects'),
  ]
  
  // 为所有项目类型创建知识库子目录
  const types = ['mcu', 'ai', 'software', 'linux', 'mobile', 'remote']
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
  
  console.log('[Nexus] 开始数据迁移: 旧格式 -> 知识库格式...')
  
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
        console.error(`[Nexus] 迁移文件失败 ${file}:`, e)
      }
    }
    
    // 删除空的旧目录
    try {
      const remaining = fs.readdirSync(sourceDir)
      if (remaining.length === 0) {
        fs.rmdirSync(sourceDir)
        console.log(`[Nexus] 已删除旧目录: ${oldDir}/`)
      }
    } catch {}
  }
  
  console.log(`[Nexus] 数据迁移完成: ${totalMigrated} 个文件已迁移`)
  
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
  // 应用图标路径
  const iconPath = isDev
    ? path.join(__dirname, '../build/icon.png')
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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()  // 调试
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
    console.error('Error reading file:', error)
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
    console.error('Error writing file:', error)
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
    console.error('Error deleting file:', error)
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
    console.error('Error listing files:', error)
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


// 读取 Markdown 文件并解析 frontmatter
ipcMain.handle('fs:readMarkdown', async (_, filePath: string) => {
  try {
    const fullPath = path.join(DATA_DIR, filePath)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const parsed = parseMarkdownWithFrontmatter(content)
      const stats = fs.statSync(fullPath)
      return {
        frontmatter: parsed.frontmatter,
        content: parsed.content,
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
      }
    }
    return null
  } catch (error) {
    console.error('Error reading markdown:', error)
    return null
  }
})

// 项目导入相关 IPC
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择 MCU 项目文件夹'
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('project:analyze', async (_, projectPath: string) => {
  try {
    const analysis = await analyzeProject(projectPath)
    return analysis
  } catch (error) {
    console.error('Error analyzing project:', error)
    return null
  }
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
    console.error('Error writing file:', error)
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
    console.error('Error deleting file:', error)
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
    console.error('Error listing directory:', error)
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

ipcMain.handle('project:createDir', async (_, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    return true
  } catch (error) {
    console.error('Error creating directory:', error)
    return false
  }
})

// ============================================================
// Git 操作 IPC
// ============================================================

ipcMain.handle('git:clone', async (_, url: string, targetPath: string, branch?: string) => {
  try {
    // 确保目标目录存在
    const parentDir = path.dirname(targetPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }
    
    // 如果目标目录已存在，检查是否为空
    if (fs.existsSync(targetPath)) {
      const files = fs.readdirSync(targetPath)
      if (files.length > 0) {
        return { success: false, message: '目标目录不为空', error: 'Directory not empty' }
      }
    }
    
    // 构建 git clone 命令
    let command = `git clone --depth 1`
    if (branch) {
      command += ` -b ${branch}`
    }
    command += ` "${url}" "${targetPath}"`
    
    console.log('Executing:', command)
    const { stdout, stderr } = await execAsync(command, { timeout: 300000 }) // 5分钟超时
    
    return { 
      success: true, 
      message: `克隆成功: ${path.basename(targetPath)}`,
    }
  } catch (error: any) {
    console.error('Git clone error:', error)
    return { 
      success: false, 
      message: '克隆失败', 
      error: error.message || String(error) 
    }
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
    console.error('Git pull error:', error)
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
    console.error('Git status error:', error)
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
    
    // 使用 Cursor 打开项目
    if (process.platform === 'darwin') {
      await execAsync(`cursor "${targetPath}"`)
      return true
    }
    
    return false
  } catch {
    return false
  }
})

// 项目类型到目录的映射
const PROJECT_TYPE_DIRS: Record<string, string> = {
  'mcu': '/Users/wq/Workshop/MCU',
  'ai': '/Users/wq/Workshop/AI',
  'software': '/Users/wq/Workshop/Software',
  'linux': '/Users/wq/Workshop/Linux',
  'mobile': '/Users/wq/Workshop/Mobile',
  'remote': '/Users/wq/Workshop/Remote',
}

// 移动项目到对应类型目录
ipcMain.handle('project:moveToTypeDir', async (_, sourcePath: string, projectType: string, projectName: string) => {
  try {
    const typeDir = PROJECT_TYPE_DIRS[projectType]
    if (!typeDir) {
      return { success: false, error: `未知的项目类型: ${projectType}`, newPath: sourcePath }
    }
    
    // 确保目标目录存在
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true })
    }
    
    const targetPath = path.join(typeDir, projectName)
    
    // 如果源路径和目标路径相同，不需要移动
    if (sourcePath === targetPath) {
      return { success: true, newPath: targetPath, moved: false }
    }
    
    // 检查目标是否已存在
    if (fs.existsSync(targetPath)) {
      // 目标已存在，尝试添加后缀
      let suffix = 1
      let newTargetPath = `${targetPath}-${suffix}`
      while (fs.existsSync(newTargetPath) && suffix < 100) {
        suffix++
        newTargetPath = `${targetPath}-${suffix}`
      }
      if (suffix >= 100) {
        return { success: false, error: '目标目录已存在太多同名项目', newPath: sourcePath }
      }
      // 移动到带后缀的目录
      await execAsync(`mv "${sourcePath}" "${newTargetPath}"`)
      return { success: true, newPath: newTargetPath, moved: true }
    }
    
    // 移动目录
    await execAsync(`mv "${sourcePath}" "${targetPath}"`)
    return { success: true, newPath: targetPath, moved: true }
    
  } catch (error: any) {
    console.error('移动项目目录失败:', error)
    return { success: false, error: error.message, newPath: sourcePath }
  }
})

// 获取项目类型对应的目录
ipcMain.handle('project:getTypeDir', async (_, projectType: string) => {
  return PROJECT_TYPE_DIRS[projectType] || '/Users/wq/Workshop/Other'
})

// 删除项目目录（移动到废纸篓）
ipcMain.handle('project:deleteDir', async (_, projectPath: string) => {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: true, message: '目录不存在' }
    }
    
    // 安全检查：不允许删除系统目录
    const safePaths = ['/Users/wq/Workshop/', '/tmp/']
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
    console.error('删除项目目录失败:', error)
    return { success: false, error: error.message }
  }
})

// ============================================================
// .nexus 项目管理 IPC
// ============================================================

const SIL_DIR = '.nexus'
const SIL_SUBDIRS = ['debug', 'notes', 'snippets', 'configs']

// 初始化 .nexus 项目目录
ipcMain.handle('sil:init', async (_, projectPath: string, config: any) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    
    // 创建 .nexus 目录结构
    if (!fs.existsSync(silPath)) {
      fs.mkdirSync(silPath, { recursive: true })
    }
    
    // 创建子目录
    for (const subdir of SIL_SUBDIRS) {
      const subdirPath = path.join(silPath, subdir)
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true })
      }
    }
    
    // 写入 project.yaml 配置文件
    const projectConfig = {
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
    
    // 创建 README
    const readmeContent = `# ${projectConfig.name}

> 此目录由 Nexus 管理，存储项目开发经验和笔记。

## 目录结构

- \`debug/\` - 调试经验和问题解决记录
- \`notes/\` - 开发笔记
- \`snippets/\` - 代码片段
- \`configs/\` - 配置备份

## 文档格式

所有文档使用 Markdown 格式，带 YAML frontmatter：

\`\`\`markdown
---
title: 文档标题
tags: [tag1, tag2]
created: 2024-01-01
---

文档内容...
\`\`\`
`
    fs.writeFileSync(path.join(silPath, 'README.md'), readmeContent, 'utf-8')
    
    // 创建 .cursor/rules/nexus.mdc 项目规则（让 Cursor 自动识别 Nexus 项目）
    const cursorRulesDir = path.join(projectPath, '.cursor', 'rules')
    if (!fs.existsSync(cursorRulesDir)) {
      fs.mkdirSync(cursorRulesDir, { recursive: true })
    }
    
    const cursorRuleContent = `# Nexus 项目开发规则

## 项目信息

- **项目名称**: ${projectConfig.name}
- **芯片**: ${projectConfig.chip || '未指定'}
- **框架**: ${projectConfig.framework || '未指定'}
- **外设**: ${(projectConfig.peripherals || []).join(', ') || '无'}

## 开发经验记录

此项目由 Nexus 管理，开发过程中请注意记录有价值的经验：

### 调试经验 (.nexus/debug/)
当解决了一个 bug 或问题时，使用以下格式记录：
- 告诉 AI "帮我记录这个调试经验" 或 "保存这个问题的解决方案"
- AI 会自动保存到 \`.nexus/debug/\` 目录

### 代码片段 (.nexus/snippets/)
当写了有价值的代码时：
- 告诉 AI "把这段代码保存到 nexus" 或 "记录这个代码片段"
- AI 会自动保存到 \`.nexus/snippets/\` 目录

### 开发笔记 (.nexus/notes/)
当学到新知识时：
- 告诉 AI "记个笔记" 或 "帮我记录这个知识点"
- AI 会自动保存到 \`.nexus/notes/\` 目录

## 文档格式

所有记录使用 Markdown + YAML frontmatter 格式：

\`\`\`markdown
---
title: "标题"
tags: [tag1, tag2]
created: YYYY-MM-DD
---

内容...
\`\`\`

## 同步到知识库

开发完成后，回到 Nexus 应用点击「一键导入」，将经验同步到全局知识库。
`
    
    fs.writeFileSync(path.join(cursorRulesDir, 'nexus.mdc'), cursorRuleContent, 'utf-8')
    
    return true
  } catch (error) {
    console.error('Error initializing .nexus:', error)
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
        
        documents.push({
          id: `${subdir}/${file.replace('.md', '')}`,
          filename: file,
          type: subdir.replace(/s$/, '') as any, // debug, note, snippet, config
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
    console.error('Error scanning .nexus:', error)
    return null
  }
})

// 用 AI 分析文档内容
async function analyzeDocWithAI(content: string, type: string, filename: string, apiKey: string): Promise<any> {
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
  "platform": "涉及的芯片平台（如 ESP32-S3）",
  "framework": "开发框架（如 ESP-IDF 5.x）"
}`,
    notes: `分析这篇笔记文档，提取关键信息，返回 JSON 格式：
{
  "title": "笔记标题（中文）",
  "summary": "内容摘要（50字以内）",
  "category": "分类（hardware/software/protocol/algorithm/other）",
  "tags": ["标签1", "标签2", "标签3"]
}`,
    snippets: `分析这篇代码片段文档，提取关键信息，返回 JSON 格式：
{
  "name": "代码片段名称（中文）",
  "description": "功能描述（30字以内）",
  "language": "编程语言（c/cpp/python/rust）",
  "code": "核心代码内容",
  "tags": ["标签1", "标签2"]
}`,
    configs: `分析这篇配置文档，提取关键信息，返回 JSON 格式：
{
  "name": "配置名称（中文）",
  "description": "配置说明",
  "platform": "适用平台",
  "framework": "开发框架",
  "tags": ["标签1", "标签2"]
}`
  }

  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{
          role: 'user',
          content: `${prompts[type]}\n\n文件名: ${filename}\n\n文档内容:\n${content.substring(0, 3000)}`
        }],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    
    // 提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('AI 分析失败:', e)
  }
  return null
}

// 检测项目是否有待同步的新文档
ipcMain.handle('sil:checkPending', async (_, projectPath: string) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    if (!fs.existsSync(silPath)) {
      return { hasPending: false, pendingCount: 0, details: {} }
    }
    
    const projectName = path.basename(projectPath)
    const projectType = detectProjectType(projectPath)  // 使用项目类型
    let pendingCount = 0
    const details: Record<string, number> = {}
    
    // 检查每个子目录
    for (const subdir of SIL_SUBDIRS) {
      const sourceDir = path.join(silPath, subdir)
      if (!fs.existsSync(sourceDir)) continue
      
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'))
      let subdirPending = 0
      
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file)
        const sourceStats = fs.statSync(sourcePath)
        const sourceModTime = sourceStats.mtime.getTime()
        
        // 确定目标文件路径 - 使用检测到的项目类型
        const category = subdir === 'notes' ? null : subdir.replace(/s$/, '')
        const targetDir = category 
          ? path.join(DATA_DIR, 'knowledge', projectType, category)
          : path.join(DATA_DIR, 'notes')
        
        const jsonFilename = file.replace('.md', '.json')
        // 使用安全的项目名作为前缀，避免不同项目的文件冲突（与 syncFrom 保持一致）
        const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
        const targetFilename = `${safeProjectName}-${jsonFilename}`
        const targetPath = path.join(targetDir, targetFilename)
        
        // 检查目标文件是否存在，以及修改时间
        if (!fs.existsSync(targetPath)) {
          // 目标不存在，需要同步
          subdirPending++
        } else {
          const targetStats = fs.statSync(targetPath)
          const targetModTime = targetStats.mtime.getTime()
          // 如果源文件比目标文件新，需要同步
          if (sourceModTime > targetModTime) {
            subdirPending++
          }
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
    console.error('检测待同步文档失败:', error)
    return { hasPending: false, pendingCount: 0, details: {} }
  }
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
  for (const [type, dir] of Object.entries(PROJECT_TYPE_DIRS)) {
    if (normalizedPath.includes(dir.toLowerCase())) {
      return type
    }
  }
  // 默认返回 mcu
  return 'mcu'
}

// 清理知识库（保留目录结构，删除所有 JSON 文件）
ipcMain.handle('knowledge:clear', async () => {
  try {
    const knowledgeDir = path.join(DATA_DIR, 'knowledge')
    if (!fs.existsSync(knowledgeDir)) {
      return { success: true, deleted: 0 }
    }
    
    let deleted = 0
    
    // 递归删除所有 JSON 文件
    function clearDir(dir: string) {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)
        if (stat.isDirectory()) {
          clearDir(itemPath)
        } else if (item.endsWith('.json')) {
          fs.unlinkSync(itemPath)
          deleted++
        }
      }
    }
    
    clearDir(knowledgeDir)
    
    // 同时清理 notes 目录
    const notesDir = path.join(DATA_DIR, 'notes')
    if (fs.existsSync(notesDir)) {
      const noteFiles = fs.readdirSync(notesDir).filter(f => f.endsWith('.json'))
      for (const file of noteFiles) {
        fs.unlinkSync(path.join(notesDir, file))
        deleted++
      }
    }
    
    return { success: true, deleted }
  } catch (error) {
    console.error('清理知识库失败:', error)
    return { success: false, deleted: 0, error: (error as Error).message }
  }
})

// 反向同步：将全局知识库内容同步回对应项目的 .nexus 目录（已弃用）
ipcMain.handle('sil:reverseSync', async () => {
  try {
    // 读取本地项目列表
    const localProjectsPath = path.join(DATA_DIR, 'local-projects.json')
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
    
    // 分类映射: knowledge category -> .nexus subdir
    const categoryToSilDir: Record<string, string> = {
      'debug': 'debug',
      'snippet': 'snippets',
      'config': 'configs',
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
      const categories = fs.readdirSync(typeDir).filter(f =>
        fs.statSync(path.join(typeDir, f)).isDirectory()
      )
      
      for (const category of categories) {
        const categoryDir = path.join(typeDir, category)
        const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))
        
        for (const file of files) {
          try {
            const filePath = path.join(categoryDir, file)
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            
            // 获取源项目
            let sourceProject = content.sourceProject || content.metadata?.sourceProject
            if (!sourceProject) {
              skipped++
              continue
            }
            
            // 如果是完整路径，提取项目名
            if (sourceProject.startsWith('/')) {
              sourceProject = path.basename(sourceProject)
            }
            
            // 查找对应的项目路径
            let projectPath = projectMap.get(sourceProject)
            if (!projectPath) {
              // 尝试模糊匹配
              for (const [name, pPath] of projectMap.entries()) {
                if (name.includes(sourceProject) || sourceProject.includes(name) ||
                    pPath.includes(sourceProject)) {
                  projectPath = pPath
                  break
                }
              }
            }
            
            if (!projectPath) {
              skipped++
              continue
            }
            
            // 确定目标子目录
            const silDir = categoryToSilDir[category] || 'notes'
            const targetDir = path.join(projectPath, SIL_DIR, silDir)
            
            // 确保目录存在
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true })
            }
            
            // 生成 Markdown 文件名
            const mdFilename = file.replace('.json', '.md')
            const targetPath = path.join(targetDir, mdFilename)
            
            // 如果文件已存在，跳过
            if (fs.existsSync(targetPath)) {
              skipped++
              continue
            }
            
            // 将 JSON 转换为 Markdown
            const mdContent = jsonToMarkdown(content, category)
            fs.writeFileSync(targetPath, mdContent, 'utf-8')
            synced++
            
          } catch (e) {
            errors.push(`${file}: ${(e as Error).message}`)
          }
        }
      }
    }
    
    return { success: true, synced, skipped, errors }
  } catch (error) {
    console.error('反向同步失败:', error)
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
// v5: 写入 knowledge/{projectType}/{category}/ 知识库格式
ipcMain.handle('sil:syncFrom', async (_, projectPath: string, apiKey?: string) => {
  try {
    const silPath = path.join(projectPath, SIL_DIR)
    if (!fs.existsSync(silPath)) {
      return { success: false, imported: 0, updated: 0, errors: ['项目未初始化 .nexus'] }
    }
    
    sendSyncProgress('准备同步', 0, 1)
    
    // 根据项目路径推断项目类型
    const projectType = detectProjectType(projectPath)
    console.log(`[Sync] 项目路径: ${projectPath}, 识别类型: ${projectType}`)
    
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
    
    // 映射: .nexus 子目录 -> 知识库分类
    const syncTypes = [
      { silDir: 'debug',    category: 'debug', name: '调试经验' },
      { silDir: 'notes',    category: null, name: '笔记' },
      { silDir: 'snippets', category: 'snippet', name: '代码片段' },
      { silDir: 'configs',  category: 'config', name: '配置模板' },
    ]
    
    // 先统计总文件数
    let totalFiles = 0
    for (const { silDir } of syncTypes) {
      const sourceDir = path.join(silPath, silDir)
      if (fs.existsSync(sourceDir)) {
        totalFiles += fs.readdirSync(sourceDir).filter(f => f.endsWith('.md')).length
      }
    }
    
    let processedFiles = 0
    
    for (const { silDir, category, name } of syncTypes) {
      const sourceDir = path.join(silPath, silDir)
      
      // 确定目标目录 - 使用检测到的项目类型
      const targetDir = category 
        ? path.join(DATA_DIR, 'knowledge', projectType, category)
        : path.join(DATA_DIR, 'notes')
      
      if (!fs.existsSync(sourceDir)) continue
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }
      
      const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'))
      
      for (const file of files) {
        try {
          processedFiles++
          sendSyncProgress(`正在处理${name}`, processedFiles, totalFiles, file)
          
          const sourcePath = path.join(sourceDir, file)
          const fileContent = fs.readFileSync(sourcePath, 'utf-8')
          
          // 解析 YAML frontmatter
          const parsed = parseMarkdownWithFrontmatter(fileContent)
          const meta = parsed.frontmatter
          const content = parsed.content
          
          // 用 AI 分析提取关键信息
          let aiData: any = null
          if (actualApiKey) {
            sendSyncProgress(`AI 分析${name}`, processedFiles, totalFiles, file)
            aiData = await analyzeDocWithAI(fileContent, silDir, file, actualApiKey)
          }
          
          const baseId = `${projectName}-${file.replace('.md', '')}`
          let jsonData: any
          
          if (!category) {
            // Notes: 保持独立格式
            jsonData = {
              id: meta.id || baseId,
              title: aiData?.title || meta.title || file.replace('.md', '').replace(/-/g, ' '),
              content: content,
              category: aiData?.category || meta.category || 'learning',
              tags: [...new Set([...(aiData?.tags || []), ...(meta.tags || []), projectName])],
              createdAt: meta.createdAt || now,
              updatedAt: now,
              sourceProject: projectPath
            }
          } else {
            // 知识库: 统一 KnowledgeEntry 格式
            const title = aiData?.title || aiData?.name || meta.title || meta.name || file.replace('.md', '').replace(/-/g, ' ')
            const tags = [...new Set([...(aiData?.tags || []), ...(meta.tags || []), projectName])]
            
            const metadata: Record<string, any> = { sourceProject: projectPath }
            
            if (category === 'debug') {
              metadata.symptom = aiData?.symptom || meta.symptom || content.substring(0, 200)
              metadata.errorLog = meta.errorLog || ''
              metadata.rootCause = aiData?.rootCause || meta.rootCause || ''
              metadata.solution = aiData?.solution || meta.solution || content
              metadata.solutionCode = aiData?.solutionCode || meta.code || ''
              metadata.environment = {
                platformId: aiData?.platform || meta.platform || '',
                peripheralIds: meta.peripherals || [],
                frameworkVersion: aiData?.framework || meta.framework || ''
              }
            } else if (category === 'snippet') {
              const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
              metadata.language = aiData?.language || meta.language || 'c'
              metadata.snippetCategory = meta.category || 'utility'
              metadata.description = aiData?.description || meta.description || ''
              metadata.code = aiData?.code || meta.code || codeMatch?.[1] || content
              metadata.platformIds = meta.platforms || []
              metadata.peripheralIds = meta.peripherals || []
            } else if (category === 'config') {
              metadata.description = aiData?.description || meta.description || ''
              metadata.platformId = aiData?.platform || meta.platform || ''
              metadata.files = []
            }
            
            jsonData = {
              id: meta.id || baseId,
              title,
              content: content,
              projectType,  // 使用检测到的项目类型
              category,
              tags,
              severity: aiData?.severity || meta.severity,
              sourceProject: projectPath,
              metadata,
              createdAt: meta.createdAt || now,
              updatedAt: now,
            }
          }
          
          // 保存为 JSON - 加项目前缀避免同名冲突
          const safeProjectName = projectName.replace(/[^a-zA-Z0-9_-]/g, '-')
          const jsonFilename = `${safeProjectName}-${file.replace('.md', '.json')}`
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
    console.error('Error syncing to project:', error)
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
      console.log('无法获取 README:', e)
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

    // 调用智谱 API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.error('智谱 API 错误:', response.status)
      return null
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
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
    console.error('AI 分析错误:', error)
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

// AI 生成项目的知识库和笔记（写入 .nexus 目录）
ipcMain.handle('ai:generateProjectDocs', async (_, projectPath: string, apiKey: string) => {
  try {
    const projectName = path.basename(projectPath)
    const silPath = path.join(projectPath, SIL_DIR)
    
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
    
    // 构建 prompt 让 AI 生成知识库文档
    const prompt = `分析这个项目并生成知识库文档。

${projectInfo}

=== 项目结构 ===
${fileList}

${readmeContent ? `=== README ===\n${readmeContent}\n` : ''}

${codeSnippets ? `=== 代码片段 ===\n${codeSnippets}` : ''}

请根据项目内容生成以下 JSON 格式的知识文档（只返回 JSON）:
{
  "notes": [
    {
      "filename": "project-overview.md",
      "title": "项目概述",
      "content": "Markdown 格式的项目技术架构和设计说明（200-400字）",
      "tags": ["标签1", "标签2"]
    }
  ],
  "snippets": [
    {
      "filename": "example-snippet.md",
      "title": "代码片段标题",
      "description": "简短描述",
      "language": "c/python/javascript等",
      "code": "关键代码片段",
      "tags": ["标签"]
    }
  ],
  "configs": [
    {
      "filename": "config-name.md",
      "title": "配置说明",
      "content": "关键配置的说明和模板",
      "tags": ["标签"]
    }
  ]
}

要求:
- notes: 1-2 个笔记，介绍项目架构、设计思路
- snippets: 1-3 个代码片段，提取项目中有价值的代码
- configs: 0-2 个配置模板（如果有关键配置）
- 内容要有实际价值，不要泛泛而谈
- 如果项目信息不足，可以返回空数组`

    // 调用智谱 API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 3000
      })
    })
    
    if (!response.ok) {
      return { success: false, error: `API 错误: ${response.status}` }
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
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
    console.error('生成项目文档失败:', error)
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
    const prompt = `分析这个 MCU/嵌入式项目并返回 JSON 格式的信息:

${projectInfo}

=== 项目文件结构 ===
${fileList}

${readmeContent ? `=== README 内容 ===\n${readmeContent}\n` : ''}

${configContent}

${mainCode ? `=== 主程序代码 ===\n${mainCode}` : ''}

请仔细分析以上项目信息，返回以下 JSON 格式（只返回 JSON，不要其他内容）:
{
  "name": "项目名称（中文，简短易懂，如 智能手表、语音助手、LED矩阵时钟）",
  "description": "一句话中文描述（不超过30字）",
  "summary": "详细介绍（2-4段中文，约200-400字，包含：项目功能、主要特性、技术亮点、应用场景）",
  "projectType": "项目类型（只能是以下之一：mcu/ai/software/linux/mobile/remote）",
  "chip": "芯片型号（如 ESP32-S3、STM32F407、SF32LB52X，如无则留空）",
  "framework": "开发框架（如 ESP-IDF、RT-Thread、Arduino、PyTorch、React）",
  "peripherals": ["外设1", "外设2"],
  "tags": ["标签1", "标签2", "标签3"],
  "features": ["功能特性1", "功能特性2", "功能特性3"]
}

项目类型说明:
- mcu: MCU/嵌入式项目（ESP32、STM32、单片机等）
- ai: AI/机器学习项目（模型训练、推理、LLM应用等）
- software: 软件/Web项目（前端、后端、桌面应用等）
- linux: Linux平台项目（驱动开发、系统移植、RK3588等）
- mobile: 移动端项目（iOS、Android、Flutter、React Native等）
- remote: 远程设备/DevOps（服务器部署、运维脚本等）

分析要点:
- name: 根据项目功能取一个直观的中文名
- chip: 从配置文件或代码中识别芯片型号
- framework: 识别使用的开发框架
- peripherals: 识别使用的外设（如 LCD显示屏、IMU传感器、音频编解码器、摄像头等）
- tags: 包含芯片系列、功能领域、技术关键词
- features: 项目的主要功能点
- summary: 专业但易懂，介绍项目的核心价值和技术特点`

    // 调用智谱 API
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.error('智谱 API 错误:', response.status)
      return null
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    
    if (!content) {
      return null
    }
    
    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      return result
    }
    
    return null
  } catch (error) {
    console.error('AI 本地项目分析错误:', error)
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
