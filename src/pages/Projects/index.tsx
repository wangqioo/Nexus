import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Input, Button, Card, Tag, Empty, Space,
  message, Row, Col, Tooltip, Spin, Modal, Form,
  Select, Popconfirm, Tabs, List, Drawer, Dropdown, Badge, Segmented, Pagination
} from 'antd'
import {
  SearchOutlined, FolderOutlined, FolderAddOutlined, SyncOutlined,
  FolderOpenOutlined, CodeOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  FileTextOutlined, BugOutlined, CodeSandboxOutlined, SettingOutlined,
  ReloadOutlined, ImportOutlined, ExportOutlined, EyeOutlined,
  ThunderboltOutlined, GithubOutlined, ClockCircleOutlined, RightOutlined
} from '@ant-design/icons'
import type { LocalProject, SilProjectConfig, SilDocument, SilProjectData, ProjectType } from '../../types'
import { PROJECT_TYPES } from '../../types'

// 格式化相对时间
const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
import { getProjectTypeIcon } from '../../components/Icons'
import { useSync } from '../../contexts/SyncContext'
import { storage } from '../../services/storage'
import type { KnowledgeEntry, Note } from '../../types'
import styles from './Projects.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 本地项目配置文件
const LOCAL_PROJECTS_FILE = 'local-projects.json'

export function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [filteredProjects, setFilteredProjects] = useState<LocalProject[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<ProjectType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12) // 每页显示 12 个项目
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null)
  const [projectData, setProjectData] = useState<SilProjectData | null>(null)
  const [linkedDocs, setLinkedDocs] = useState<{ knowledge: KnowledgeEntry[], notes: Note[] }>({ knowledge: [], notes: [] })
  
  // 模态框状态
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importMode, setImportMode] = useState<'local' | 'github' | 'batch'>('local')
  const [initModalOpen, setInitModalOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [importForm] = Form.useForm()
  const [initForm] = Form.useForm()
  
  // GitHub 导入状态
  const [cloning, setCloning] = useState(false)
  
  // 批量扫描状态
  const [batchScanDir, setBatchScanDir] = useState('')
  const [batchNewProjects, setBatchNewProjects] = useState<Array<{ path: string; name: string; hasNexus: boolean; hasReadme: boolean }>>([])
  const [batchScanning, setBatchScanning] = useState(false)
  
  // AI 分析状态
  const [analyzing, setAnalyzing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [countdown, setCountdown] = useState(0)
  
  // 导入成功弹窗状态
  const [importSuccessOpen, setImportSuccessOpen] = useState(false)
  const [importedProject, setImportedProject] = useState<LocalProject | null>(null)
  
  // 使用全局同步状态
  const { syncing, syncProgress, startSync, updateProgress, endSync } = useSync()
  
  // 加载 API Key
  useEffect(() => {
    const loadApiKey = async () => {
      const localKey = localStorage.getItem('zhipu_api_key')
      if (localKey) {
        setApiKey(localKey)
        return
      }
      try {
        const configContent = await window.electronAPI.readFile('config.json')
        if (configContent) {
          const config = JSON.parse(configContent)
          if (config.zhipu_api_key) {
            setApiKey(config.zhipu_api_key)
            localStorage.setItem('zhipu_api_key', config.zhipu_api_key)
          }
        }
      } catch {}
    }
    loadApiKey()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    filterProjects()
  }, [projects, searchQuery, selectedType])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const content = await window.electronAPI.readFile(LOCAL_PROJECTS_FILE)
      if (content) {
        const data = JSON.parse(content)
        let projectList = data.projects || []
        
        // 验证项目路径，检测重命名或移动
        const pathsToVerify = projectList.map((p: LocalProject) => ({
          id: p.id,
          path: p.path,
          projectType: p.projectType
        }))
        
        const verifyResults = await window.electronAPI.verifyProjectPaths(pathsToVerify)
        
        // 检查是否有路径变化
        const pathChanges: Array<{ name: string, oldPath: string, newPath: string }> = []
        projectList = projectList.map((p: LocalProject) => {
          const result = verifyResults[p.id]
          if (result && !result.valid && result.newPath) {
            pathChanges.push({
              name: p.name,
              oldPath: p.path,
              newPath: result.newPath
            })
            // 自动更新路径
            return { ...p, path: result.newPath }
          }
          return p
        })
        
        // 如果有路径变化，保存更新后的列表并通知用户
        if (pathChanges.length > 0) {
          await saveProjects(projectList)
          message.info({
            content: `检测到 ${pathChanges.length} 个项目路径变化，已自动更新`,
            duration: 5
          })
          console.log('[Nexus] 项目路径变化:', pathChanges)
        }
        
        // 先立即显示项目列表（使用缓存的状态）
        setProjects(projectList)
        setLoading(false)
        
        // 后台异步加载详细状态（不阻塞 UI）
        checkProjectsStatusAsync(projectList)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      setLoading(false)
    }
  }

  // 后台异步检查项目状态（只检查当前页，减少不必要的 API 调用）
  const checkProjectsStatusAsync = async (projectList: LocalProject[], checkAll = false) => {
    // 如果不是检查全部，只检查前 pageSize 个项目（首页）
    const projectsToCheck = checkAll ? projectList : projectList.slice(0, pageSize)
    
    for (const project of projectsToCheck) {
      try {
        const silExists = await window.electronAPI.projectPathExists(
          `${project.path}/.nexus/project.yaml`
        )
        
        let documentCount = project.documentCount || 0
        let pendingCount = 0
        
        if (silExists) {
          const silData = await window.electronAPI.scanSilProject(project.path)
          documentCount = silData?.documents?.length || 0
          
          const pendingResult = await window.electronAPI.checkPendingSync(project.path, project.projectType)
          pendingCount = pendingResult.pendingCount
        }
        
        const lastActivity = await window.electronAPI.getProjectLastModified(project.path)
        
        // 逐个更新项目状态
        setProjects(prev => prev.map(p => 
          p.id === project.id ? {
            ...p,
            hasSil: silExists,
            documentCount,
            pendingCount,
            lastActivity: lastActivity || p.lastActivity,
          } : p
        ))
      } catch (e) {
        // 忽略单个项目的错误
      }
    }
  }
  
  // 当翻页时，检查新页面的项目状态
  useEffect(() => {
    if (!loading && filteredProjects.length > 0) {
      const startIndex = (currentPage - 1) * pageSize
      const currentPageProjects = filteredProjects.slice(startIndex, startIndex + pageSize)
      // 检查当前页中还没有状态的项目
      const projectsNeedCheck = currentPageProjects.filter(p => p.lastActivity === undefined)
      if (projectsNeedCheck.length > 0) {
        checkProjectsStatusAsync(projectsNeedCheck, true)
      }
    }
  }, [currentPage, pageSize, filteredProjects.length])

  // 同步版本（用于刷新按钮等需要等待的场景）
  const checkProjectsStatus = async (projectList: LocalProject[]) => {
    const updatedProjects = await Promise.all(
      projectList.map(async (project) => {
        const silExists = await window.electronAPI.projectPathExists(
          `${project.path}/.nexus/project.yaml`
        )
        
        let documentCount = 0
        let pendingCount = 0
        
        if (silExists) {
          const silData = await window.electronAPI.scanSilProject(project.path)
          documentCount = silData?.documents?.length || 0
          
          const pendingResult = await window.electronAPI.checkPendingSync(project.path, project.projectType)
          pendingCount = pendingResult.pendingCount
        }
        
        const lastActivity = await window.electronAPI.getProjectLastModified(project.path)
        
        return {
          ...project,
          hasSil: silExists,
          documentCount,
          pendingCount,
          lastActivity: lastActivity || project.lastActivity,
        }
      })
    )
    setProjects(updatedProjects)
  }

  const filterProjects = () => {
    let filtered = [...projects]
    
    // 按类型筛选
    if (selectedType !== 'all') {
      filtered = filtered.filter(p => p.projectType === selectedType)
    }
    
    // 按搜索词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.chip?.toLowerCase().includes(query) ||
        p.framework?.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    setFilteredProjects(filtered)
    // 筛选条件变化时重置到第一页
    setCurrentPage(1)
  }
  
  // 当前页显示的项目（分页）
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredProjects.slice(startIndex, startIndex + pageSize)
  }, [filteredProjects, currentPage, pageSize])
  
  // 获取各类型项目数量
  const getTypeCount = (type: ProjectType | 'all') => {
    if (type === 'all') return projects.length
    return projects.filter(p => p.projectType === type).length
  }

  const saveProjects = async (newProjects: LocalProject[]) => {
    try {
      const content = JSON.stringify({ projects: newProjects }, null, 2)
      await window.electronAPI.writeFile(LOCAL_PROJECTS_FILE, content)
      return true
    } catch (error) {
      console.error('Failed to save projects:', error)
      return false
    }
  }

  // 添加项目
  const handleOpenImport = (mode: 'local' | 'github' | 'batch' = 'local') => {
    importForm.resetFields()
    setImportMode(mode)
    setBatchScanDir('')
    setBatchNewProjects([])
    setImportModalOpen(true)
  }

  const handleSelectFolder = async () => {
    const folderPath = await window.electronAPI.selectFolder()
    if (folderPath) {
      importForm.setFieldsValue({ path: folderPath })
      
      // 自动检测项目信息
      const analysis = await window.electronAPI.analyzeProject(folderPath)
      if (analysis) {
        importForm.setFieldsValue({
          name: analysis.projectName,
          chip: analysis.chip?.name || '',
          framework: analysis.framework?.name || '',
        })
      }
    }
  }

  // AI 分析项目并自动添加（本地导入）
  const handleAIAnalyzeAndAdd = async () => {
    const projectPath = importForm.getFieldValue('path')
    if (!projectPath) {
      message.warning('请先选择项目文件夹')
      return
    }
    
    if (!apiKey) {
      message.warning('请先配置智谱 API Key')
      return
    }
    
    setAnalyzing(true)
    message.loading({ content: '正在分析项目...', key: 'analyze', duration: 0 })
    
    try {
      const result = await window.electronAPI.analyzeLocalProject(projectPath, apiKey)
      
      if (result) {
        // 保存分析结果供后续使用
        const analysisResult = result
        
        importForm.setFieldsValue({
          name: result.name,
          description: result.description,
          chip: result.chip,
          framework: result.framework,
          tags: [...(result.tags || []), ...(result.peripherals || [])].join(', '),
        })
        
        message.success({ content: '分析完成！3 秒后自动添加...', key: 'analyze' })
        
        // 倒计时 3 秒后自动添加
        setCountdown(3)
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              handleSaveProjectWithAutoInit(analysisResult)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        message.error({ content: '分析失败，请检查 API Key', key: 'analyze' })
      }
    } catch (error) {
      console.error('AI 分析错误:', error)
      message.error({ content: '分析失败', key: 'analyze' })
    }
    
    setAnalyzing(false)
  }
  
  // 保存项目并自动初始化 .nexus（用于 AI 分析后自动添加）
  const handleSaveProjectWithAutoInit = async (analysisResult: any) => {
    try {
      const values = await importForm.validateFields()
      
      // 查重：检查路径是否已存在
      if (projects.some(p => p.path === values.path)) {
        message.error('该项目路径已存在')
        return
      }
      
      // 查重：检查项目名称是否已存在
      const existingByName = projects.find(p => 
        p.name.toLowerCase() === values.name?.toLowerCase()
      )
      if (existingByName) {
        message.error(`项目名称已存在: "${existingByName.name}"，请使用不同的名称`)
        return
      }
      
      // 使用 AI 分析的项目类型
      const projectType = (analysisResult?.projectType as ProjectType) || values.projectType || 'mcu'
      const projectName = values.name?.replace(/[\/\\:*?"<>|]/g, '-') || values.path.split('/').pop() || 'project'
      
      // 自动移动到对应类型目录
      message.loading({ content: `正在移动到 ${projectType.toUpperCase()} 目录...`, key: 'save', duration: 0 })
      const moveResult = await window.electronAPI.moveToTypeDir(values.path, projectType, projectName)
      
      const finalPath = moveResult.success ? moveResult.newPath : values.path
      
      const newProject: LocalProject = {
        id: Date.now().toString(),
        name: values.name,
        path: finalPath,
        description: values.description || '',
        summary: analysisResult?.summary || '',           // AI 生成的详细介绍
        features: analysisResult?.features || [],         // 主要功能特性
        projectType,
        chip: values.chip || '',
        framework: values.framework || '',
        peripherals: analysisResult?.peripherals || [],   // 外设列表
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        hasSil: false,
        documentCount: 0,
        status: 'active',
        githubUrl: values.githubUrl || '',
      }
      
        // 检查是否已有 .nexus 目录
        const silPath = finalPath + '/.nexus'
        const hasSilAlready = await window.electronAPI.projectPathExists(silPath)
        
        if (hasSilAlready) {
          // 已有 .nexus，直接同步经验到管理器
        newProject.hasSil = true
        const syncResult = await window.electronAPI.syncFromProject(finalPath, undefined, newProject.projectType)
        if (syncResult.success && (syncResult.imported > 0 || syncResult.updated > 0)) {
          newProject.documentCount = syncResult.imported + syncResult.updated
        }
        } else {
          // 没有 .nexus，自动初始化
        const silConfig = {
          id: newProject.id,  // 传递项目 ID 用于路径变化检测
          name: values.name,
          description: values.description || '',
          chip: values.chip || analysisResult?.chip || '',
          framework: values.framework || analysisResult?.framework || '',
          peripherals: analysisResult?.peripherals || [],
          tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        }
        
        const initSuccess = await window.electronAPI.initSilProject(finalPath, silConfig)
        if (initSuccess) {
          newProject.hasSil = true
        }
      }
      
      const newProjects = [...projects, newProject]
      const saved = await saveProjects(newProjects)
      
      if (saved) {
        setProjects(newProjects)
        message.success({ content: '项目已添加', key: 'save' })
        setImportModalOpen(false)
        setCountdown(0)
        
        // 弹出成功窗口
        setImportedProject(newProject)
        setImportSuccessOpen(true)
      }
    } catch (error) {
      console.error('保存失败:', error)
      message.error({ content: '保存失败', key: 'save' })
    }
  }

  // ============================================================
  // 从 GitHub 导入项目
  // ============================================================
  
  const handleGithubImport = async () => {
    try {
      const values = await importForm.validateFields()
      const url = values.githubUrl
      
      // 解析 GitHub URL
      const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/)
      if (!match) {
        message.error('无效的 GitHub URL')
        return
      }
      
      // 查重：检查 GitHub URL 是否已导入
      const normalizedUrl = url.replace(/\.git$/, '').toLowerCase()
      const existingByUrl = projects.find(p => 
        p.githubUrl && p.githubUrl.replace(/\.git$/, '').toLowerCase() === normalizedUrl
      )
      if (existingByUrl) {
        message.error(`该仓库已导入: ${existingByUrl.name}`)
        return
      }
      
      const repoName = match[2]
      // 先克隆到临时目录
      const tempPath = `/tmp/nexus-import-${Date.now()}`
      
      setCloning(true)
      message.loading({ content: '正在克隆仓库...', key: 'clone', duration: 0 })
      
      // 克隆仓库
      const cloneResult = await window.electronAPI.gitClone(url, tempPath, values.branch || 'main')
      
      if (!cloneResult.success) {
        message.error({ content: `克隆失败: ${cloneResult.error}`, key: 'clone' })
        setCloning(false)
        return
      }
      
      message.loading({ content: '克隆完成，正在 AI 分析项目类型...', key: 'clone', duration: 0 })
      
      // AI 分析项目
      let analysisResult = null
      let projectType: ProjectType = 'mcu'
      if (apiKey) {
        analysisResult = await window.electronAPI.analyzeLocalProject(tempPath, apiKey)
        if (analysisResult?.projectType) {
          projectType = analysisResult.projectType as ProjectType
        }
      }
      
      const projectName = analysisResult?.name?.replace(/[\/\\:*?"<>|]/g, '-') || repoName
      
      // 根据项目类型移动到对应目录
      message.loading({ content: `正在移动到 ${projectType.toUpperCase()} 目录...`, key: 'clone', duration: 0 })
      const moveResult = await window.electronAPI.moveToTypeDir(tempPath, projectType, repoName)
      
      if (!moveResult.success) {
        message.error({ content: `移动失败: ${moveResult.error}`, key: 'clone' })
        setCloning(false)
        return
      }
      
      const finalPath = moveResult.newPath
      
      // 创建项目记录
      const newProject: LocalProject = {
        id: Date.now().toString(),
        name: projectName,
        path: finalPath,
        description: analysisResult?.description || '',
        summary: analysisResult?.summary || '',           // AI 生成的详细介绍
        features: analysisResult?.features || [],         // 主要功能特性
        projectType,
        chip: analysisResult?.chip || '',
        framework: analysisResult?.framework || '',
        peripherals: analysisResult?.peripherals || [],   // 外设列表
        tags: analysisResult ? [...(analysisResult.tags || []), ...(analysisResult.peripherals || [])] : [],
        hasSil: false,
        documentCount: 0,
        status: 'active',
        githubUrl: url,
      }
      
      // 初始化 .nexus
      const silConfig = {
        id: newProject.id,  // 传递项目 ID 用于路径变化检测
        name: newProject.name,
        description: newProject.description,
        chip: newProject.chip,
        framework: newProject.framework,
        peripherals: analysisResult?.peripherals || [],
        tags: newProject.tags,
        githubUrl: url,
      }
      
      const initSuccess = await window.electronAPI.initSilProject(finalPath, silConfig)
      if (initSuccess) {
        newProject.hasSil = true
      }
      
      // 保存项目
      const newProjects = [...projects, newProject]
      await saveProjects(newProjects)
      setProjects(newProjects)
      
      message.success({ content: '项目导入成功！', key: 'clone' })
      setImportModalOpen(false)
      importForm.resetFields()
      
      // 弹出成功窗口
      setImportedProject(newProject)
      setImportSuccessOpen(true)
      
    } catch (error) {
      console.error('GitHub 导入失败:', error)
      message.error('导入失败')
    }
    
    setCloning(false)
  }

  const handleSaveProject = async () => {
    try {
      const values = await importForm.validateFields()
      
      // 查重：检查路径是否已存在
      if (projects.some(p => p.path === values.path)) {
        message.error('该项目路径已存在')
        return
      }
      
      // 查重：检查项目名称是否已存在
      const existingByName = projects.find(p => 
        p.name.toLowerCase() === values.name?.toLowerCase()
      )
      if (existingByName) {
        message.error(`项目名称已存在: "${existingByName.name}"，请使用不同的名称`)
        return
      }
      
      // 检查 .nexus 是否存在
      const hasSil = await window.electronAPI.projectPathExists(
        `${values.path}/.nexus/project.yaml`
      )
      
      const newProject: LocalProject = {
        id: Date.now().toString(),
        name: values.name,
        path: values.path,
        description: values.description || '',
        projectType: values.projectType || 'mcu',
        chip: values.chip || '',
        framework: values.framework || '',
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        hasSil,
        documentCount: 0,
        status: 'active',
        githubUrl: values.githubUrl || '',
      }
      
      const newProjects = [...projects, newProject]
      const saved = await saveProjects(newProjects)
      
      if (saved) {
        setProjects(newProjects)
        message.success('项目已添加')
        setImportModalOpen(false)
        
        // 如果没有 .nexus，提示初始化
        if (!hasSil) {
          setSelectedProject(newProject)
          setInitModalOpen(true)
        }
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  // 开始初始化 .nexus（先 AI 分析）
  const handleStartInit = async (project: LocalProject) => {
    setSelectedProject(project)
    
    // 先用已有信息填充
    initForm.setFieldsValue({
      name: project.name,
      chip: project.chip || '',
      framework: project.framework || '',
      description: project.description || '',
      peripherals: (project.peripherals || []).join(', '),
      tags: (project.tags || []).join(', '),
    })
    
    // 打开模态框
    setInitModalOpen(true)
    
    // 后台调用 AI 分析
    const apiKey = localStorage.getItem('zhipu_api_key')
    if (apiKey) {
      message.loading({ content: 'AI 正在分析项目...', key: 'init-ai' })
      try {
        const analysis = await window.electronAPI.analyzeLocalProject(project.path, apiKey)
        if (analysis) {
          // 用 AI 结果更新表单
          initForm.setFieldsValue({
            name: analysis.name || project.name,
            description: analysis.description || '',
            chip: analysis.chip || '',
            framework: analysis.framework || '',
            peripherals: (analysis.peripherals || []).join(', '),
            tags: (analysis.tags || []).join(', '),
          })
          message.success({ content: 'AI 分析完成', key: 'init-ai' })
        }
      } catch (e) {
        message.info({ content: '已跳过 AI 分析', key: 'init-ai' })
      }
    }
  }

  // 确认初始化 .nexus
  const handleInitSil = async () => {
    if (!selectedProject) return
    
    try {
      const values = await initForm.validateFields()
      
      const config: SilProjectConfig = {
        id: selectedProject.id,  // 传递项目 ID 用于路径变化检测
        name: values.name || selectedProject.name,
        description: values.description || '',
        chip: values.chip || selectedProject.chip,
        framework: values.framework || selectedProject.framework,
        peripherals: values.peripherals ? values.peripherals.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        githubUrl: values.githubUrl || '',
      }
      
      const success = await window.electronAPI.initSilProject(selectedProject.path, config)
      
      if (success) {
        message.success('.nexus 初始化成功！现在可以在 Cursor 中自动记录经验了')
        setInitModalOpen(false)
        
        // 更新项目状态
        const updatedProjects = projects.map(p =>
          p.id === selectedProject.id ? { ...p, hasSil: true } : p
        )
        setProjects(updatedProjects)
        await saveProjects(updatedProjects)
      } else {
        message.error('初始化失败')
      }
    } catch (error) {
      console.error('Init failed:', error)
    }
  }

  // 查看项目详情
  const handleViewProject = async (project: LocalProject) => {
    setSelectedProject(project)
    
    // 加载 .nexus 目录中的原始文档
    if (project.hasSil) {
      const data = await window.electronAPI.scanSilProject(project.path)
      setProjectData(data)
    } else {
      setProjectData(null)
    }
    
    // 加载已同步到知识库的关联文档
    const docs = await storage.getDocumentsByProject(project.path)
    setLinkedDocs(docs)
    
    setDetailDrawerOpen(true)
  }

  // 跳转到对应页面查看文档
  const handleViewDocument = async (doc: SilDocument, project: LocalProject) => {
    // 构建文档 ID（与同步时的命名规则一致 - 使用目录名而非 project.name）
    const dirName = project.path.split('/').pop() || project.name
    const safeProjectName = dirName.replace(/[^a-zA-Z0-9_-]/g, '-')
    const docId = `${safeProjectName}-${doc.filename.replace('.md', '')}`
    
    // 检查文档是否已同步（通过尝试读取文件）
    let filePath: string
    if (doc.type === 'note') {
      filePath = `notes/${docId}.json`
    } else {
      // debug -> knowledge/{projectType}/debug/
      // snippet -> knowledge/{projectType}/snippet/
      // config -> knowledge/{projectType}/config/
      const category = doc.type === 'snippet' ? 'snippet' : doc.type === 'config' ? 'config' : 'debug'
      filePath = `knowledge/${project.projectType}/${category}/${docId}.json`
    }
    
    // 使用 readFile 检查文件是否存在
    const content = await window.electronAPI.readFile(filePath)
    
    if (!content) {
      message.warning('该文档尚未同步到知识库，请先同步项目')
      return
    }
    
    // 关闭抽屉并跳转
    setDetailDrawerOpen(false)
    if (doc.type === 'note') {
      navigate(`/notes?docId=${encodeURIComponent(docId)}`)
    } else {
      navigate(`/knowledge?docId=${encodeURIComponent(docId)}`)
    }
  }

  // 同步项目（一键导入经验，带 AI 分析）
  const handleSyncProject = async (project: LocalProject) => {
    if (!project.hasSil) {
      message.warning('请先初始化 .nexus')
      return
    }
    
    startSync('扫描文档...', 1)
    
    try {
      // 传入 API Key 和项目类型以启用 AI 分析
      const result = await window.electronAPI.syncFromProject(project.path, apiKey || undefined, project.projectType)
      
      // 更新进度为完成
      updateProgress({ step: '同步完成', current: 1, total: 1 })
      
      if (result.success) {
        const total = result.imported + result.updated
        if (total > 0) {
          message.success(`导入完成: 新增 ${result.imported} 个, 更新 ${result.updated} 个`)
        } else {
          message.info('没有新的经验文档需要导入')
        }
        // 重新检查项目状态（确保 pendingCount 正确更新）
        await checkProjectsStatus(projects)
      } else {
        message.error(`导入失败: ${result.errors?.join(', ') || '未知错误'}`)
      }
    } catch (err: any) {
      message.error(`同步出错: ${err.message || '未知错误'}`)
    } finally {
      endSync()
    }
  }

  // 打开操作
  const handleOpenInCursor = async (project: LocalProject) => {
    const success = await window.electronAPI.openInCursor(project.path)
    if (!success) {
      message.error('打开失败，请确保已安装 Cursor')
    }
  }

  const handleOpenInFinder = async (project: LocalProject) => {
    await window.electronAPI.openInFinder(project.path)
  }

  const handleOpenInTerminal = async (project: LocalProject) => {
    await window.electronAPI.openInTerminal(project.path)
  }

  // 删除项目（真正删除本地文件）
  const handleDeleteProject = async (project: LocalProject) => {
    message.loading({ content: '正在删除项目...', key: 'delete', duration: 0 })
    
    // 删除本地文件夹（移动到废纸篓）
    const deleteResult = await window.electronAPI.deleteProjectDir(project.path)
    
    if (!deleteResult.success) {
      message.error({ content: `删除失败: ${deleteResult.error}`, key: 'delete' })
      return
    }
    
    // 从列表中移除
    const newProjects = projects.filter(p => p.id !== project.id)
    const saved = await saveProjects(newProjects)
    
    if (saved) {
      setProjects(newProjects)
      message.success({ content: '项目已删除（已移动到废纸篓）', key: 'delete' })
    }
  }

  // 刷新状态
  const handleRefreshAll = async () => {
    message.loading({ content: '正在刷新...', key: 'refresh' })
    await checkProjectsStatus(projects)
    message.success({ content: '刷新完成', key: 'refresh' })
  }

  // 批量初始化未初始化的项目
  const handleBatchInit = async () => {
    const uninitProjects = projects.filter(p => !p.hasSil)
    if (uninitProjects.length === 0) {
      message.info('所有项目都已初始化 .nexus')
      return
    }
    
    message.loading({ content: `正在初始化 ${uninitProjects.length} 个项目...`, key: 'batch-init', duration: 0 })
    
    let successCount = 0
    let failCount = 0
    
    for (const project of uninitProjects) {
      try {
        // 使用已有的元数据初始化
        const config = {
          id: project.id,  // 传递项目 ID 用于路径变化检测
          name: project.name,
          description: project.description || '',
          chip: project.chip || '',
          framework: project.framework || '',
          peripherals: project.peripherals || [],
          tags: project.tags || [],
          githubUrl: project.githubUrl || '',
        }
        
        const success = await window.electronAPI.initSilProject(project.path, config)
        if (success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`初始化 ${project.name} 失败:`, error)
        failCount++
      }
    }
    
    // 更新项目状态
    await checkProjectsStatus(projects)
    
    if (failCount === 0) {
      message.success({ content: `成功初始化 ${successCount} 个项目`, key: 'batch-init' })
    } else {
      message.warning({ content: `初始化完成: 成功 ${successCount} 个, 失败 ${failCount} 个`, key: 'batch-init' })
    }
  }

  // 批量扫描：选择目录并发现项目
  const handleBatchScan = async () => {
    const selectedDir = await window.electronAPI.selectFolder()
    if (!selectedDir) return
    
    setBatchScanning(true)
    setBatchScanDir(selectedDir)
    
    const scanResult = await window.electronAPI.scanDirectory(selectedDir)
    setBatchScanning(false)
    
    if (!scanResult.success || scanResult.projects.length === 0) {
      message.info('未发现项目')
      setBatchNewProjects([])
      return
    }
    
    // 过滤掉已导入的
    const existingPaths = new Set(projects.map(p => p.path))
    const newProjects = scanResult.projects.filter(p => !existingPaths.has(p.path))
    setBatchNewProjects(newProjects)
    
    if (newProjects.length === 0) {
      message.info('该目录下的项目都已导入')
    }
  }

  // 批量执行导入（点击确定后）
  const handleBatchExecute = async () => {
    if (batchNewProjects.length === 0) {
      message.info('没有新项目需要导入')
      return
    }
    
    if (!apiKey) {
      message.warning('请先配置智谱 API Key')
      return
    }
    
    setImportModalOpen(false)
    startSync('清理旧知识库数据...', batchNewProjects.length)
    
    // 先清理旧的知识库
    try {
      await window.electronAPI.clearKnowledgeBase()
    } catch (e) {
      console.error('清理知识库失败:', e)
    }
    
    const updatedProjects = [...projects]
    let imported = 0
    let errors = 0
    
    for (let i = 0; i < batchNewProjects.length; i++) {
      const proj = batchNewProjects[i]
      
      updateProgress({
        step: `处理项目 (${i + 1}/${batchNewProjects.length})`,
        current: i,
        total: batchNewProjects.length,
        file: proj.name
      })
      
      try {
        // 1. AI 分析
        updateProgress({ step: `AI 分析项目信息...`, current: i, total: batchNewProjects.length, file: proj.name })
        const analysis = await window.electronAPI.analyzeLocalProject(proj.path, apiKey)
        
        const projectType = (analysis?.projectType as ProjectType) || 'mcu'
        const projectName = (analysis?.name || proj.name).replace(/[\/\\:*?"<>|]/g, '-')
        
        // 2. 移动到分类目录
        updateProgress({ step: `移动到 ${projectType.toUpperCase()} 目录...`, current: i, total: batchNewProjects.length, file: proj.name })
        const moveResult = await window.electronAPI.moveToTypeDir(proj.path, projectType, projectName)
        const finalPath = moveResult.success ? moveResult.newPath : proj.path
        
        // 3. 创建项目记录
        const newProject: LocalProject = {
          id: Date.now().toString() + '-' + i,
          name: analysis?.name || proj.name,
          path: finalPath,
          description: analysis?.description || '',
          summary: analysis?.summary || '',
          features: analysis?.features || [],
          projectType,
          chip: analysis?.chip || '',
          framework: analysis?.framework || '',
          peripherals: analysis?.peripherals || [],
          tags: analysis?.tags || [],
          hasSil: proj.hasNexus,
          documentCount: 0,
          status: 'active',
        }
        
        // 4. 初始化 .nexus
        if (!newProject.hasSil) {
          updateProgress({ step: `初始化 .nexus...`, current: i, total: batchNewProjects.length, file: proj.name })
          await window.electronAPI.initSilProject(finalPath, {
            name: newProject.name,
            description: newProject.description,
            chip: newProject.chip,
            framework: newProject.framework,
            peripherals: newProject.peripherals,
            tags: newProject.tags,
          })
          newProject.hasSil = true
        }
        
        // 5. 生成文档
        const silData = await window.electronAPI.scanSilProject(finalPath)
        const docCount = silData?.documents?.length || 0
        if (docCount === 0) {
          updateProgress({ step: `AI 生成知识库文档...`, current: i, total: batchNewProjects.length, file: proj.name })
          const genResult = await window.electronAPI.generateProjectDocs(finalPath, apiKey)
          if (genResult.success && genResult.generated) {
            newProject.documentCount = genResult.generated.notes + genResult.generated.snippets + genResult.generated.configs
          }
        } else {
          newProject.documentCount = docCount
        }
        
        // 6. 同步到知识库
        if (newProject.documentCount > 0) {
          updateProgress({ step: `同步到知识库...`, current: i, total: batchNewProjects.length, file: proj.name })
          try {
            await window.electronAPI.syncFromProject(finalPath, apiKey, newProject.projectType)
          } catch (syncErr) {
            console.error(`[Sync] ${proj.name} 同步失败:`, syncErr)
          }
        }
        
        updatedProjects.push(newProject)
        imported++
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } catch (e) {
        console.error(`导入 ${proj.name} 失败:`, e)
        errors++
      }
    }
    
    setProjects(updatedProjects)
    await saveProjects(updatedProjects)
    
    updateProgress({ step: '导入完成', current: batchNewProjects.length, total: batchNewProjects.length })
    setTimeout(() => {
      endSync()
      message.success(`批量导入完成: 成功 ${imported} 个, 失败 ${errors} 个`)
    }, 1000)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip="加载项目..." />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      
      {/* ====== 头部（与知识库统一） ====== */}
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>项目管理</Title>
          <Text type="secondary">管理所有类型的本地项目</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ReloadOutlined />} onClick={handleRefreshAll}>刷新</Button>
          <Dropdown
            menu={{
              items: [
                { key: 'local', icon: <FolderAddOutlined />, label: '本地项目', onClick: () => handleOpenImport('local') },
                { key: 'github', icon: <GithubOutlined />, label: 'GitHub 项目', onClick: () => handleOpenImport('github') },
                { type: 'divider' },
                { key: 'batch', icon: <ImportOutlined />, label: '批量扫描导入', onClick: () => handleOpenImport('batch') },
                ...(projects.some(p => !p.hasSil) ? [{
                  key: 'batch-init',
                  icon: <ThunderboltOutlined />,
                  label: `批量初始化 (${projects.filter(p => !p.hasSil).length})`,
                  onClick: handleBatchInit,
                }] : []),
              ],
            }}
            placement="bottom"
          >
            <Button type="primary" icon={<PlusOutlined />}>导入项目</Button>
          </Dropdown>
        </div>
      </div>

      {/* ====== 大类别：项目类型筛选（与知识库统一） ====== */}
      <div className={styles.typeSection}>
        <div className={styles.sectionLabel}>项目类型</div>
        <div className={styles.typeTabs}>
          <div
            className={`${styles.typeTab} ${selectedType === 'all' ? `${styles.typeTabActive} ${styles.typeTabActiveAll}` : ''}`}
            onClick={() => setSelectedType('all')}
          >
            <span className={styles.typeIcon}>📋</span>
            <span className={styles.typeLabel}>全部</span>
            <span className={styles.typeCount}>{getTypeCount('all')}</span>
          </div>
          {PROJECT_TYPES.map(type => (
            <div
              key={type.id}
              className={`${styles.typeTab} ${selectedType === type.id ? styles.typeTabActive : ''}`}
              style={selectedType === type.id
                ? { background: type.color, borderColor: type.color }
                : { borderLeftColor: type.color, borderLeftWidth: 3 }
              }
              onClick={() => setSelectedType(type.id)}
            >
              <span className={styles.typeIcon}>{getProjectTypeIcon(type.id, type.icon)}</span>
              <span className={styles.typeLabel}>{type.name}</span>
              <span className={styles.typeCount}>{getTypeCount(type.id)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ====== 统计条（对应知识库的分类栏） ====== */}
      <div className={styles.statsSection}>
        <div className={styles.statsLeft}>
          <span className={styles.statChip}>
            共 <span className={styles.statChipValue}>{filteredProjects.length}</span> 个项目
          </span>
          <span className={styles.statChip}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
            <span className={styles.statChipValue}>{filteredProjects.filter(p => p.hasSil).length}</span> 已初始化
          </span>
          <span className={styles.statChip}>
            <FileTextOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
            <span className={styles.statChipValue}>
              {filteredProjects.reduce((sum, p) => sum + (p.documentCount || 0), 0)}
            </span> 文档
          </span>
        </div>
      </div>

      {/* ====== 搜索栏（与知识库统一） ====== */}
      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索项目..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
      </div>

      {/* ====== 项目卡片网格（与知识库统一） ====== */}
      {filteredProjects.length > 0 ? (
        <>
          <div className={styles.cardGrid}>
            {paginatedProjects.map(project => {
              const typeConfig = PROJECT_TYPES.find(t => t.id === project.projectType)
              return (
                <Card
                key={project.id}
                className={styles.projectCard}
                hoverable
                actions={[
                  <Tooltip title="在 Cursor 打开" key="cursor">
                    <CodeOutlined onClick={() => handleOpenInCursor(project)} />
                  </Tooltip>,
                  <Tooltip title="在 Finder 打开" key="finder">
                    <FolderOpenOutlined onClick={() => handleOpenInFinder(project)} />
                  </Tooltip>,
                  <Tooltip title={project.pendingCount ? `${project.pendingCount} 条新经验待同步` : "一键导入经验"} key="sync">
                    <Badge count={project.pendingCount || 0} size="small" offset={[-2, 2]}>
                      <SyncOutlined
                        onClick={() => handleSyncProject(project)}
                        style={{ 
                          opacity: project.hasSil ? 1 : 0.3, 
                          color: project.pendingCount ? '#52c41a' : (project.hasSil ? '#4096ff' : undefined),
                          animation: project.pendingCount ? 'pulse 2s infinite' : undefined
                        }}
                      />
                    </Badge>
                  </Tooltip>,
                  <Tooltip title="查看详情" key="view">
                    <EyeOutlined onClick={() => handleViewProject(project)} />
                  </Tooltip>,
                ]}
              >
                <div 
                  className={styles.cardBody}
                  onClick={() => handleViewProject(project)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.projectNameRow}>
                      <span className={styles.projectTypeIcon}>{getProjectTypeIcon(project.projectType, typeConfig?.icon || '📁')}</span>
                      <Tooltip title="点击复制项目路径">
                        <div 
                          className={styles.projectName} 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(project.path)
                            message.success({
                              content: `已复制: ${project.path}`,
                              icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                            })
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {project.name}
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                      {project.hasSil ? (
                        <Tooltip title="已初始化 .nexus">
                          <CheckCircleOutlined className={styles.silIcon} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="点击初始化 .nexus（AI 自动分析）">
                          <ExclamationCircleOutlined
                            className={styles.noSilIcon}
                            onClick={() => handleStartInit(project)}
                          />
                        </Tooltip>
                      )}
                      <Popconfirm
                        title="确定删除这个项目吗？"
                        description={<span style={{ color: '#ff4d4f' }}>⚠️ 项目文件夹将被移动到废纸篓！</span>}
                        onConfirm={() => handleDeleteProject(project)}
                        okText="删除"
                        okButtonProps={{ danger: true }}
                        cancelText="取消"
                      >
                        <DeleteOutlined className={styles.deleteBtn} />
                      </Popconfirm>
                    </div>
                  </div>

                  <div className={styles.projectMeta}>
                    {project.chip && <Tag color="blue" style={{ fontSize: 11 }}>{project.chip}</Tag>}
                    {project.framework && <Tag color="purple" style={{ fontSize: 11 }}>{project.framework}</Tag>}
                    {typeConfig && (
                      <Tag style={{ fontSize: 11, background: typeConfig.color, color: '#fff', border: 'none' }}>
                        {typeConfig.icon} {typeConfig.name}
                      </Tag>
                    )}
                  </div>

                  <Paragraph className={styles.description} ellipsis={{ rows: 2 }}>
                    {project.description || project.path}
                  </Paragraph>

                  <div className={styles.cardFooter}>
                    <span className={styles.docCount}>
                      <FileTextOutlined /> {project.documentCount || 0}
                      {project.pendingCount ? (
                        <span style={{ marginLeft: 4, color: '#52c41a' }}>+{project.pendingCount}</span>
                      ) : null}
                    </span>
                    <span className={styles.lastUpdate}>
                      <ClockCircleOutlined /> {formatRelativeTime(project.lastActivity)}
                    </span>
                  </div>
                </div>
              </Card>
            )
            })}
          </div>
          
          {/* 分页器 */}
          {filteredProjects.length > pageSize && (
            <div className={styles.pagination}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredProjects.length}
                onChange={(page, size) => {
                  setCurrentPage(page)
                  if (size !== pageSize) setPageSize(size)
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 个项目`}
                pageSizeOptions={['12', '24', '48', '96']}
              />
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          {projects.length > 0 && !searchQuery ? (
            <Spin size="large" tip="加载项目中..." />
          ) : (
            <Empty
              description={projects.length === 0 ? "还没有添加任何项目" : "没有找到匹配的项目"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {projects.length === 0 && (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'local', icon: <FolderAddOutlined />, label: '本地项目', onClick: () => handleOpenImport('local') },
                      { key: 'github', icon: <GithubOutlined />, label: 'GitHub 项目', onClick: () => handleOpenImport('github') },
                    ],
                  }}
                  placement="bottom"
                >
                  <Button type="primary" icon={<PlusOutlined />}>导入第一个项目</Button>
                </Dropdown>
              )}
            </Empty>
          )}
        </div>
      )}

      {/* ====== 统一导入项目模态框 ====== */}
      <Modal
        title={
          <Space>
            {importMode === 'github' ? <GithubOutlined /> : importMode === 'batch' ? <ImportOutlined /> : <FolderAddOutlined />}
            <span>导入项目</span>
          </Space>
        }
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setCountdown(0) }}
        onOk={
          importMode === 'github' ? handleGithubImport
            : importMode === 'batch' ? handleBatchExecute
            : handleSaveProject
        }
        okText={
          importMode === 'github'
            ? (cloning ? '导入中...' : 'AI 分析并导入')
            : importMode === 'batch'
            ? `开始导入 (${batchNewProjects.length} 个)`
            : (countdown > 0 ? `${countdown}s 后添加` : '添加')
        }
        okButtonProps={{
          loading: importMode === 'github' ? cloning : false,
          icon: <ThunderboltOutlined />,
          disabled: importMode === 'batch' && batchNewProjects.length === 0,
          style: importMode === 'local' ? { display: 'none' } : undefined,
        }}
        cancelText={importMode === 'local' ? '关闭' : '取消'}
        width={600}
      >
        {/* 来源切换 */}
        <Segmented
          block
          value={importMode}
          onChange={(val) => {
            setImportMode(val as 'local' | 'github' | 'batch')
            importForm.resetFields()
            setCountdown(0)
            setBatchScanDir('')
            setBatchNewProjects([])
          }}
          options={[
            { value: 'local', icon: <FolderAddOutlined />, label: '本地项目' },
            { value: 'github', icon: <GithubOutlined />, label: 'GitHub' },
            { value: 'batch', icon: <ImportOutlined />, label: '批量扫描' },
          ]}
          style={{ marginBottom: 20 }}
        />

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {importMode === 'local'
            ? '选择本地项目文件夹，AI 自动分析并归档到对应分类目录。'
            : importMode === 'github'
            ? '输入 GitHub 仓库地址，自动克隆到本地并进行 AI 分析。'
            : '选择一个父目录，自动扫描其中的所有项目并批量导入。'}
        </Paragraph>

        <Form form={importForm} layout="vertical">
          {/* ---- 本地模式：选择文件夹 ---- */}
          {importMode === 'local' && (
            <>
              <Form.Item
                name="path"
                label="项目路径"
                rules={[{ required: true, message: '请选择项目文件夹' }]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input placeholder="/Users/wq/Workshop/MCU/..." style={{ flex: 1 }} disabled />
                  <Button onClick={handleSelectFolder}>选择文件夹</Button>
                  <Tooltip title="用智谱 AI 分析项目并自动添加">
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAIAnalyzeAndAdd}
                      loading={analyzing}
                    >
                      {countdown > 0 ? `${countdown}s 后添加` : 'AI 分析'}
                    </Button>
                  </Tooltip>
                </Space.Compact>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="项目名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                  >
                    <Input placeholder="项目名称（AI 自动填充）" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="chip" label="芯片">
                    <Input placeholder="ESP32-S3" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="framework" label="框架">
                    <Input placeholder="ESP-IDF" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tags" label="标签">
                    <Input placeholder="显示, 音频, LVGL" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="description" label="描述" extra="AI 会生成详细的项目介绍">
                <TextArea rows={3} placeholder="项目描述..." showCount maxLength={1000} />
              </Form.Item>
            </>
          )}

          {/* ---- GitHub 模式：输入 URL ---- */}
          {importMode === 'github' && (
            <>
              <Form.Item
                name="githubUrl"
                label="GitHub URL"
                rules={[
                  { required: true, message: '请输入仓库地址' },
                  { pattern: /github\.com/, message: '请输入有效的 GitHub 地址' }
                ]}
              >
                <Input 
                  placeholder="https://github.com/user/repo" 
                  prefix={<GithubOutlined />}
                />
              </Form.Item>
              
              <Form.Item name="branch" label="分支" initialValue="main">
                <Input placeholder="main" />
              </Form.Item>
            </>
          )}
        </Form>

        {/* ---- 批量模式：选择目录 + 扫描结果 ---- */}
        {importMode === 'batch' && (
          <div>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                value={batchScanDir}
                placeholder="选择要扫描的父目录..."
                style={{ flex: 1 }}
                disabled
              />
              <Button onClick={handleBatchScan} loading={batchScanning}>
                {batchScanning ? '扫描中...' : '选择目录'}
              </Button>
            </Space.Compact>

            {/* 扫描结果列表 */}
            {batchScanDir && (
              <div className={styles.scanResultBox}>
                {batchNewProjects.length > 0 ? (
                  <>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      发现 <strong style={{ color: '#52c41a' }}>{batchNewProjects.length}</strong> 个新项目
                    </Text>
                    {batchNewProjects.slice(0, 30).map(p => (
                      <div key={p.path} style={{ fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{p.hasNexus ? '✅' : '⚪'}</span>
                        <span style={{ fontWeight: 500 }}>{p.name}</span>
                        <span className={styles.scanResultPath}>
                          {p.path.replace(batchScanDir + '/', '')}
                        </span>
                      </div>
                    ))}
                    {batchNewProjects.length > 30 && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        ... 还有 {batchNewProjects.length - 30} 个
                      </Text>
                    )}
                  </>
                ) : (
                  <div className={styles.scanResultEmpty}>
                    该目录下的项目已全部导入
                  </div>
                )}
              </div>
            )}

            {batchNewProjects.length > 0 && (
              <div style={{ fontSize: 12, color: '#ff4d4f', marginBottom: 8 }}>
                ⚠️ 开始前会清理知识库中没有对应项目的旧数据
              </div>
            )}
          </div>
        )}

        {/* API Key 区域（所有模式共用） */}
        {!apiKey && (
          <div className={styles.modalInfoBox}>
            <Space>
              <Input.Password
                placeholder="智谱 API Key（AI 分析需要）"
                value={apiKey}
                onChange={e => {
                  setApiKey(e.target.value)
                  localStorage.setItem('zhipu_api_key', e.target.value)
                }}
                style={{ width: 280 }}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI.openExternal('https://open.bigmodel.cn') }}>获取 API Key</a>
              </Text>
            </Space>
          </div>
        )}

        {/* 底部提示（所有模式共用） */}
        <div className={styles.modalTipBox}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>流程：</strong>
            {importMode === 'local' && '选择文件夹 → AI 分析类型 → 移动到分类目录 → 初始化 .nexus'}
            {importMode === 'github' && (
              <>
                克隆仓库 → AI 分析类型 → 移动到分类目录 → 初始化 .nexus
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>大型 SDK/框架请使用「开发库」管理</Text>
              </>
            )}
            {importMode === 'batch' && '扫描目录 → 逐个 AI 分析 → 移动到分类目录 → 生成知识库 → 同步'}
          </Text>
        </div>
      </Modal>

      {/* 初始化 .nexus 模态框 */}
      <Modal
        title="初始化 .nexus"
        open={initModalOpen}
        onCancel={() => setInitModalOpen(false)}
        onOk={handleInitSil}
        okText="初始化"
        cancelText="取消"
        width={600}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          将在项目目录创建 <code>.nexus</code> 文件夹，用于存储开发经验和笔记。
        </Paragraph>
        
        <Form form={initForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="项目名称">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chip" label="芯片">
                <Input placeholder="ESP32-S3" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="framework" label="框架">
                <Input placeholder="ESP-IDF" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="peripherals" label="外设">
                <Input placeholder="ST7789, QMI8658" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="项目描述..." />
          </Form.Item>
          
          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 项目详情抽屉 */}
      <Drawer
        title={selectedProject?.name}
        placement="right"
        width={600}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      >
        {selectedProject && (
          <div className={styles.detailContent}>
            <div className={styles.detailSection}>
              <Text type="secondary">路径</Text>
              <Paragraph copyable>{selectedProject.path}</Paragraph>
            </div>
            
            <div className={styles.detailSection}>
              <Space wrap>
                {selectedProject.chip && <Tag color="blue">{selectedProject.chip}</Tag>}
                {selectedProject.framework && <Tag color="purple">{selectedProject.framework}</Tag>}
                {selectedProject.peripherals?.map(p => (
                  <Tag key={p} color="cyan">{p}</Tag>
                ))}
                {selectedProject.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
            
            {selectedProject.hasSil && projectData ? (
              <Tabs
                items={[
                  {
                    key: 'overview',
                    label: <><FileTextOutlined /> 项目概览</>,
                    children: (
                      <div>
                        {/* 简短描述 */}
                        {selectedProject.description && (
                          <Paragraph type="secondary" style={{ fontSize: 14 }}>
                            {selectedProject.description}
                          </Paragraph>
                        )}
                        
                        {/* 详细介绍 */}
                        {selectedProject.summary ? (
                          <div className={styles.detailInfoCard}>
                            <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                              {selectedProject.summary}
                            </Text>
                          </div>
                        ) : (
                          <Empty 
                            description="暂无项目介绍" 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            style={{ marginBottom: 16 }}
                          >
                            <Button 
                              type="primary" 
                              size="small"
                              icon={<ThunderboltOutlined />}
                              onClick={() => {
                                setDetailDrawerOpen(false)
                                // TODO: 触发 AI 分析
                                message.info('请使用"重建知识库"功能生成项目介绍')
                              }}
                            >
                              AI 生成介绍
                            </Button>
                          </Empty>
                        )}
                        
                        {/* 功能特性 */}
                        {selectedProject.features && selectedProject.features.length > 0 && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              主要功能
                            </Text>
                            <Space wrap>
                              {selectedProject.features.map((f, i) => (
                                <Tag key={i} color="green">{f}</Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'debug',
                    label: <><BugOutlined /> 调试经验 ({projectData.documents.filter(d => d.type === 'debug').length})</>,
                    children: (
                      <List
                        size="small"
                        dataSource={projectData.documents.filter(d => d.type === 'debug')}
                        renderItem={doc => (
                          <List.Item 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewDocument(doc, selectedProject!)}
                          >
                            <List.Item.Meta
                              title={<span style={{ color: '#1677ff' }}>{doc.title} <RightOutlined style={{ fontSize: 10 }} /></span>}
                              description={doc.tags.slice(0, 3).join(', ')}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: '暂无调试经验' }}
                      />
                    ),
                  },
                  {
                    key: 'notes',
                    label: <><FileTextOutlined /> 笔记 ({projectData.documents.filter(d => d.type === 'note').length})</>,
                    children: (
                      <List
                        size="small"
                        dataSource={projectData.documents.filter(d => d.type === 'note')}
                        renderItem={doc => (
                          <List.Item 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewDocument(doc, selectedProject!)}
                          >
                            <List.Item.Meta
                              title={<span style={{ color: '#1677ff' }}>{doc.title} <RightOutlined style={{ fontSize: 10 }} /></span>}
                              description={doc.tags.slice(0, 3).join(', ')}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: '暂无笔记' }}
                      />
                    ),
                  },
                  {
                    key: 'snippets',
                    label: <><CodeSandboxOutlined /> 代码片段 ({projectData.documents.filter(d => d.type === 'snippet').length})</>,
                    children: (
                      <List
                        size="small"
                        dataSource={projectData.documents.filter(d => d.type === 'snippet')}
                        renderItem={doc => (
                          <List.Item 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewDocument(doc, selectedProject!)}
                          >
                            <List.Item.Meta
                              title={<span style={{ color: '#1677ff' }}>{doc.title} <RightOutlined style={{ fontSize: 10 }} /></span>}
                              description={doc.tags.slice(0, 3).join(', ')}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: '暂无代码片段' }}
                      />
                    ),
                  },
                  {
                    key: 'configs',
                    label: <><SettingOutlined /> 配置模板 ({projectData.documents.filter(d => d.type === 'config').length})</>,
                    children: (
                      <List
                        size="small"
                        dataSource={projectData.documents.filter(d => d.type === 'config')}
                        renderItem={doc => (
                          <List.Item 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleViewDocument(doc, selectedProject!)}
                          >
                            <List.Item.Meta
                              title={<span style={{ color: '#1677ff' }}>{doc.title} <RightOutlined style={{ fontSize: 10 }} /></span>}
                              description={doc.tags.slice(0, 3).join(', ')}
                            />
                          </List.Item>
                        )}
                        locale={{ emptyText: '暂无配置模板' }}
                      />
                    ),
                  },
                  {
                    key: 'synced',
                    label: (
                      <span>
                        <SyncOutlined /> 已同步 
                        {(linkedDocs.knowledge.length + linkedDocs.notes.length) > 0 && (
                          <Badge 
                            count={linkedDocs.knowledge.length + linkedDocs.notes.length} 
                            size="small" 
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </span>
                    ),
                    children: (
                      <div>
                        {/* 知识库文档 */}
                        {linkedDocs.knowledge.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              知识库 ({linkedDocs.knowledge.length})
                            </Text>
                            <List
                              size="small"
                              dataSource={linkedDocs.knowledge}
                              renderItem={entry => (
                                <List.Item 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setDetailDrawerOpen(false)
                                    navigate(`/knowledge?docId=${encodeURIComponent(entry.id)}`)
                                  }}
                                >
                                  <List.Item.Meta
                                    title={
                                      <span style={{ color: '#1677ff' }}>
                                        {entry.isNew && <span style={{ width: 6, height: 6, background: '#1677ff', borderRadius: '50%', display: 'inline-block', marginRight: 6 }} />}
                                        {entry.title} <RightOutlined style={{ fontSize: 10 }} />
                                      </span>
                                    }
                                    description={
                                      <Space size={4}>
                                        <Tag color="blue" style={{ fontSize: 10 }}>{entry.category}</Tag>
                                        {entry.tags?.slice(0, 2).map(t => <Tag key={t} style={{ fontSize: 10 }}>{t}</Tag>)}
                                      </Space>
                                    }
                                  />
                                </List.Item>
                              )}
                            />
                          </div>
                        )}
                        
                        {/* 笔记文档 */}
                        {linkedDocs.notes.length > 0 && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              笔记 ({linkedDocs.notes.length})
                            </Text>
                            <List
                              size="small"
                              dataSource={linkedDocs.notes}
                              renderItem={note => (
                                <List.Item 
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setDetailDrawerOpen(false)
                                    navigate(`/notes?docId=${encodeURIComponent(note.id)}`)
                                  }}
                                >
                                  <List.Item.Meta
                                    title={
                                      <span style={{ color: '#1677ff' }}>
                                        {(note as any).isNew && <span style={{ width: 6, height: 6, background: '#1677ff', borderRadius: '50%', display: 'inline-block', marginRight: 6 }} />}
                                        {note.title} <RightOutlined style={{ fontSize: 10 }} />
                                      </span>
                                    }
                                    description={note.tags?.slice(0, 3).join(', ')}
                                  />
                                </List.Item>
                              )}
                            />
                          </div>
                        )}
                        
                        {linkedDocs.knowledge.length === 0 && linkedDocs.notes.length === 0 && (
                          <Empty 
                            description="暂无已同步的文档" 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          >
                            <Button 
                              type="primary" 
                              size="small"
                              icon={<SyncOutlined />}
                              onClick={() => {
                                setDetailDrawerOpen(false)
                                handleSyncProject(selectedProject!)
                              }}
                            >
                              立即同步
                            </Button>
                          </Empty>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <Empty
                description="项目未初始化 .nexus"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  onClick={() => {
                    setDetailDrawerOpen(false)
                    handleStartInit(selectedProject)
                  }}
                >
                  AI 分析并初始化
                </Button>
              </Empty>
            )}
          </div>
        )}
      </Drawer>

      {/* 导入成功弹窗 */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <span>项目导入成功</span>
          </Space>
        }
        open={importSuccessOpen}
        onCancel={() => setImportSuccessOpen(false)}
        footer={null}
        width={550}
      >
        {importedProject && (
          <div style={{ padding: '16px 0' }}>
            {/* 项目基本信息 */}
            <div className={styles.detailInfoCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>
                  {PROJECT_TYPES.find(t => t.id === importedProject.projectType)?.icon || '📁'}
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{importedProject.name}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {PROJECT_TYPES.find(t => t.id === importedProject.projectType)?.name || '未知类型'}
                  </Text>
                </div>
              </div>
              
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                <FolderOutlined style={{ marginRight: 6 }} />
                {importedProject.path}
              </Text>
              
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {importedProject.chip && (
                  <Tag color="blue">{importedProject.chip}</Tag>
                )}
                {importedProject.framework && (
                  <Tag color="purple">{importedProject.framework}</Tag>
                )}
                {importedProject.tags.slice(0, 4).map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            
            {/* 项目描述 */}
            {importedProject.description && (
              <Paragraph 
                type="secondary"
                ellipsis={{ rows: 3, expandable: true }}
                style={{ fontSize: 13, marginBottom: 16 }}
              >
                {importedProject.description}
              </Paragraph>
            )}
            
            {/* 操作按钮 */}
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'center',
              paddingTop: 8,
              borderTop: '1px solid var(--border-primary, #333)'
            }}>
              <Button 
                type="primary" 
                icon={<CodeOutlined />}
                onClick={() => {
                  window.electronAPI.openInCursor(importedProject.path)
                  setImportSuccessOpen(false)
                }}
              >
                在 Cursor 中打开
              </Button>
              <Button 
                icon={<FolderOpenOutlined />}
                onClick={() => {
                  window.electronAPI.openInFinder(importedProject.path)
                }}
              >
                在 Finder 中显示
              </Button>
              <Button 
                onClick={() => setImportSuccessOpen(false)}
              >
                稍后处理
              </Button>
            </div>
            
            {/* 提示信息 */}
            <div className={styles.modalTipBox} style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                已自动初始化 <code>.nexus</code> 目录，开发过程中可以记录调试经验和代码片段
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Projects
