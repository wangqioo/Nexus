import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Input, Button, Card, Tag, Empty, Space,
  message, Row, Col, Tooltip, Spin, Modal, Form,
  Select, Popconfirm, Tabs, List, Drawer, Dropdown, Badge
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
import { useSync } from '../../contexts/SyncContext'

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
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null)
  const [projectData, setProjectData] = useState<SilProjectData | null>(null)
  
  // 模态框状态
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [initModalOpen, setInitModalOpen] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [githubImportOpen, setGithubImportOpen] = useState(false)
  const [form] = Form.useForm()
  const [initForm] = Form.useForm()
  const [githubForm] = Form.useForm()
  
  // GitHub 导入状态
  const [cloning, setCloning] = useState(false)
  
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
        setProjects(data.projects || [])
        
        // 检查每个项目的 .nexus 状态
        await checkProjectsStatus(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
    setLoading(false)
  }

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
          
          // 检测待同步文档
          const pendingResult = await window.electronAPI.checkPendingSync(project.path)
          pendingCount = pendingResult.pendingCount
        }
        
        // 获取最后修改时间
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
  }
  
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
  const handleAddProject = () => {
    form.resetFields()
    setAddModalOpen(true)
  }

  const handleSelectFolder = async () => {
    const folderPath = await window.electronAPI.selectFolder()
    if (folderPath) {
      form.setFieldsValue({ path: folderPath })
      
      // 自动检测项目信息
      const analysis = await window.electronAPI.analyzeProject(folderPath)
      if (analysis) {
        form.setFieldsValue({
          name: analysis.projectName,
          chip: analysis.chip?.name || '',
          framework: analysis.framework?.name || '',
        })
      }
    }
  }

  // AI 分析项目并自动添加
  const handleAIAnalyzeAndAdd = async () => {
    const projectPath = form.getFieldValue('path')
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
        
        form.setFieldsValue({
          name: result.name,
          description: result.description,  // 只用简短描述
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
              // 自动保存（带自动初始化 .nexus）
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
      const values = await form.validateFields()
      
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
        const syncResult = await window.electronAPI.syncFromProject(finalPath)
        if (syncResult.success && (syncResult.imported > 0 || syncResult.updated > 0)) {
          newProject.documentCount = syncResult.imported + syncResult.updated
        }
        } else {
          // 没有 .nexus，自动初始化
        const silConfig = {
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
        setAddModalOpen(false)
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
      const values = await githubForm.validateFields()
      const url = values.url
      
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
      setGithubImportOpen(false)
      githubForm.resetFields()
      
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
      const values = await form.validateFields()
      
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
        setAddModalOpen(false)
        
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
    
    if (project.hasSil) {
      const data = await window.electronAPI.scanSilProject(project.path)
      setProjectData(data)
    } else {
      setProjectData(null)
    }
    
    setDetailDrawerOpen(true)
  }

  // 跳转到对应页面查看文档
  const handleViewDocument = async (doc: SilDocument, project: LocalProject) => {
    // 构建文档 ID（与同步时的命名规则一致）
    const safeProjectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '-')
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
      // 传入 API Key 以启用 AI 分析
      const result = await window.electronAPI.syncFromProject(project.path, apiKey || undefined)
      
      // 更新进度为完成
      updateProgress({ step: '同步完成', current: 1, total: 1 })
      
      if (result.success) {
        const total = result.imported + result.updated
        if (total > 0) {
          message.success(`导入完成: 新增 ${result.imported} 个, 更新 ${result.updated} 个`)
          
          // 更新 documentCount 和 pendingCount
          const updatedProjects = projects.map(p =>
            p.id === project.id ? { ...p, documentCount: Math.max(p.documentCount, total), pendingCount: 0 } : p
          )
          setProjects(updatedProjects)
          await saveProjects(updatedProjects)
        } else {
          message.info('没有新的经验文档需要导入')
        }
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

  // 批量本地导入：扫描目录，导入项目，生成介绍和知识库
  const handleBatchLocalImport = async () => {
    if (!apiKey) {
      message.warning('请先配置智谱 API Key')
      return
    }
    
    // 选择要扫描的目录
    const selectedDir = await window.electronAPI.selectFolder()
    if (!selectedDir) return
    
    message.loading({ content: '正在扫描目录...', key: 'batch-import', duration: 0 })
    
    // 扫描目录发现项目
    const scanResult = await window.electronAPI.scanDirectory(selectedDir)
    if (!scanResult.success || scanResult.projects.length === 0) {
      message.info({ content: '未发现项目', key: 'batch-import' })
      return
    }
    
    // 过滤掉已导入的项目
    const existingPaths = new Set(projects.map(p => p.path))
    const newProjects = scanResult.projects.filter(p => !existingPaths.has(p.path))
    
    message.destroy('batch-import')
    
    Modal.confirm({
      title: '批量本地导入',
      width: 600,
      content: (
        <div>
          <p>在 <code>{selectedDir}</code> 中发现 <strong>{scanResult.projects.length}</strong> 个项目</p>
          <p>其中 <strong>{newProjects.length}</strong> 个是新项目</p>
          
          <div style={{ maxHeight: 200, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6, marginTop: 12 }}>
            {newProjects.slice(0, 20).map(p => (
              <div key={p.path} style={{ fontSize: 12, marginBottom: 4 }}>
                {p.hasNexus ? '✅' : '⚪'} {p.name}
                <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>{p.path}</span>
              </div>
            ))}
            {newProjects.length > 20 && <div style={{ color: 'rgba(255,255,255,0.45)' }}>... 还有 {newProjects.length - 20} 个</div>}
          </div>
          
          <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
            将为每个项目：<br/>
            1. AI 分析项目类型和信息<br/>
            2. <strong>移动到对应分类目录</strong>（MCU/AI/Software/Linux 等）<br/>
            3. 初始化 .nexus 目录（如果没有）<br/>
            4. AI 生成知识库和笔记（如果 .nexus 为空）<br/>
            5. 同步到全局知识库
          </p>
          <p style={{ color: '#ff4d4f', fontSize: 13 }}>
            ⚠️ 开始前会清理知识库中没有对应项目的旧数据
          </p>
        </div>
      ),
      okText: `开始导入 (${newProjects.length} 个)`,
      cancelText: '取消',
      onOk: async () => {
        if (newProjects.length === 0) {
          message.info('没有新项目需要导入')
          return
        }
        
        setSyncing(true)
        setSyncProgress({ step: '清理旧知识库数据...', current: 0, total: newProjects.length })
        
        // 先清理旧的知识库（没有对应项目的）
        try {
          await window.electronAPI.clearKnowledgeBase()
        } catch (e) {
          console.error('清理知识库失败:', e)
        }
        
        const updatedProjects = [...projects]
        let imported = 0
        let errors = 0
        
        for (let i = 0; i < newProjects.length; i++) {
          const proj = newProjects[i]
          
          setSyncProgress({
            step: `处理项目 (${i + 1}/${newProjects.length})`,
            current: i,
            total: newProjects.length,
            file: proj.name
          })
          
          try {
            // 1. AI 分析项目获取基本信息
            setSyncProgress({ step: `AI 分析项目信息...`, current: i, total: newProjects.length, file: proj.name })
            const analysis = await window.electronAPI.analyzeLocalProject(proj.path, apiKey)
            
            const projectType = (analysis?.projectType as ProjectType) || 'mcu'
            const projectName = (analysis?.name || proj.name).replace(/[\/\\:*?"<>|]/g, '-')
            
            // 2. 根据项目类型移动到对应目录
            setSyncProgress({ step: `移动到 ${projectType.toUpperCase()} 目录...`, current: i, total: newProjects.length, file: proj.name })
            const moveResult = await window.electronAPI.moveToTypeDir(proj.path, projectType, projectName)
            const finalPath = moveResult.success ? moveResult.newPath : proj.path
            
            // 3. 创建项目记录
            const newProject: LocalProject = {
              id: Date.now().toString() + '-' + i,
              name: analysis?.name || proj.name,
              path: finalPath,  // 使用移动后的路径
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
            
            // 4. 初始化 .nexus（如果没有）
            if (!newProject.hasSil) {
              setSyncProgress({ step: `初始化 .nexus...`, current: i, total: newProjects.length, file: proj.name })
              const initConfig = {
                name: newProject.name,
                description: newProject.description,
                chip: newProject.chip,
                framework: newProject.framework,
                peripherals: newProject.peripherals,
                tags: newProject.tags,
              }
              await window.electronAPI.initSilProject(finalPath, initConfig)
              newProject.hasSil = true
            }
            
            // 5. 检查 .nexus 是否为空，如果是则生成文档
            const silData = await window.electronAPI.scanSilProject(finalPath)
            const docCount = silData?.documents?.length || 0
            
            if (docCount === 0) {
              setSyncProgress({ step: `AI 生成知识库文档...`, current: i, total: newProjects.length, file: proj.name })
              const genResult = await window.electronAPI.generateProjectDocs(finalPath, apiKey)
              if (genResult.success && genResult.generated) {
                newProject.documentCount = genResult.generated.notes + genResult.generated.snippets + genResult.generated.configs
              }
            } else {
              newProject.documentCount = docCount
            }
            
            // 6. 同步到全局知识库
            if (newProject.documentCount > 0) {
              setSyncProgress({ step: `同步到知识库...`, current: i, total: newProjects.length, file: proj.name })
              try {
                const syncResult = await window.electronAPI.syncFromProject(finalPath, apiKey)
                console.log(`[Sync] ${proj.name}: imported=${syncResult?.imported}, updated=${syncResult?.updated}`)
                if (syncResult?.errors?.length > 0) {
                  console.error(`[Sync] ${proj.name} 错误:`, syncResult.errors)
                }
              } catch (syncErr) {
                console.error(`[Sync] ${proj.name} 同步失败:`, syncErr)
              }
            }
            
            updatedProjects.push(newProject)
            imported++
            
            // 间隔避免 API 限流
            await new Promise(resolve => setTimeout(resolve, 800))
            
          } catch (e) {
            console.error(`导入 ${proj.name} 失败:`, e)
            errors++
          }
        }
        
        // 保存项目列表
        setProjects(updatedProjects)
        await saveProjects(updatedProjects)
        
        setSyncProgress({ step: '导入完成', current: newProjects.length, total: newProjects.length })
        
        setTimeout(() => {
          setSyncing(false)
          setSyncProgress(null)
          message.success(`批量导入完成: 成功 ${imported} 个, 失败 ${errors} 个`)
        }, 1000)
      }
    })
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
      {/* 同步进度条 - 使用 Portal 渲染到 body */}
      {syncing && createPortal(
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 340,
          minWidth: 240,
          background: 'rgba(22, 27, 34, 0.98)',
          borderRadius: 12,
          border: '1px solid #333',
          padding: '12px 16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          zIndex: 99999,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#fff', marginBottom: 8 }}>
            <SyncOutlined spin style={{ marginRight: 8, color: '#58a6ff' }} />
            <span>{syncProgress?.step || '同步中...'}</span>
            {syncProgress && syncProgress.total > 0 && (
              <span style={{ marginLeft: 'auto', color: '#58a6ff', fontWeight: 500 }}>
                {syncProgress.current}/{syncProgress.total}
              </span>
            )}
          </div>
          <div style={{ height: 4, background: '#2a3f5f', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1677ff, #52c41a)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              width: syncProgress && syncProgress.total > 0 
                ? `${Math.min((syncProgress.current / syncProgress.total) * 100, 100)}%` 
                : '30%'
            }} />
          </div>
          {syncProgress?.file && (
            <div style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {syncProgress.file}
            </div>
          )}
        </div>,
        document.body
      )}
      
      {/* ====== 头部（与知识库统一） ====== */}
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>项目管理</Title>
          <Text type="secondary">管理所有类型的本地项目</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ReloadOutlined />} onClick={handleRefreshAll}>刷新</Button>
          {projects.some(p => !p.hasSil) && (
            <Tooltip title={`为 ${projects.filter(p => !p.hasSil).length} 个未初始化项目创建 .nexus（使用已有元数据）`}>
              <Button icon={<ThunderboltOutlined />} onClick={handleBatchInit}>
                批量初始化
              </Button>
            </Tooltip>
          )}
          <Button icon={<GithubOutlined />} onClick={() => setGithubImportOpen(true)}>
            GitHub 导入
          </Button>
          <Button icon={<FolderAddOutlined />} onClick={handleAddProject}>
            本地导入
          </Button>
          <Tooltip title="扫描目录，批量导入项目并生成知识库">
            <Button icon={<ImportOutlined />} onClick={handleBatchLocalImport}>
              批量导入
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ====== 大类别：项目类型筛选（与知识库统一） ====== */}
      <div className={styles.typeSection}>
        <div className={styles.sectionLabel}>项目类型</div>
        <div className={styles.typeTabs}>
          <div
            className={`${styles.typeTab} ${selectedType === 'all' ? styles.typeTabActive : ''}`}
            style={selectedType === 'all' ? { background: '#333', borderColor: '#555' } : {}}
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
        <div className={styles.cardGrid}>
          {filteredProjects.map(project => {
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
      ) : (
        <div className={styles.emptyState}>
          <Empty
            description={projects.length === 0 ? "还没有添加任何项目" : "没有找到匹配的项目"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {projects.length === 0 && (
              <Dropdown
                menu={{
                  items: [
                    { key: 'github', icon: <GithubOutlined />, label: '从 GitHub 导入', onClick: () => setGithubImportOpen(true) },
                    { key: 'local', icon: <FolderAddOutlined />, label: '从本地导入', onClick: handleAddProject },
                  ],
                }}
                placement="bottom"
              >
                <Button type="primary" icon={<PlusOutlined />}>添加第一个项目</Button>
              </Dropdown>
            )}
          </Empty>
        </div>
      )}

      {/* 添加项目模态框 */}
      <Modal
        title="添加本地项目"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleSaveProject}
        okText="添加"
        cancelText="取消"
        width={650}
      >
        <Form form={form} layout="vertical">
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
                  {countdown > 0 ? `${countdown}s 后添加` : 'AI 分析并添加'}
                </Button>
              </Tooltip>
            </Space.Compact>
          </Form.Item>
          
          {/* API Key 提示 */}
          {!apiKey && (
            <div style={{ 
              marginBottom: 16, 
              padding: '8px 12px', 
              background: '#141414', 
              borderRadius: 6,
              border: '1px solid #333'
            }}>
              <Space>
                <Input.Password
                  placeholder="智谱 API Key"
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value)
                    localStorage.setItem('zhipu_api_key', e.target.value)
                  }}
                  style={{ width: 280 }}
                  size="small"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <a href="https://open.bigmodel.cn" target="_blank" rel="noreferrer">获取 API Key</a>
                </Text>
              </Space>
            </div>
          )}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="项目名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="我的 ESP32 项目" />
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
            <TextArea rows={4} placeholder="项目描述..." showCount maxLength={1000} />
          </Form.Item>
        </Form>
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

      {/* 从 GitHub 导入模态框 */}
      <Modal
        title={<><GithubOutlined /> 从 GitHub 导入项目</>}
        open={githubImportOpen}
        onCancel={() => setGithubImportOpen(false)}
        onOk={handleGithubImport}
        okText={cloning ? '导入中...' : 'AI 分析并导入'}
        okButtonProps={{ loading: cloning, icon: <ThunderboltOutlined /> }}
        cancelText="取消"
        width={550}
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          输入 GitHub 仓库地址，将自动克隆到本地并进行 AI 分析。
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            项目将保存到 <code>/Users/wq/Workshop/MCU/</code> 目录
          </Text>
        </Paragraph>
        
        <Form form={githubForm} layout="vertical">
          <Form.Item
            name="url"
            label="GitHub URL"
            rules={[
              { required: true, message: '请输入仓库地址' },
              { pattern: /github\.com/, message: '请输入有效的 GitHub 地址' }
            ]}
          >
            <Input 
              placeholder="https://github.com/78/xiaozhi-esp32" 
              prefix={<GithubOutlined />}
            />
          </Form.Item>
          
          <Form.Item name="branch" label="分支" initialValue="main">
            <Input placeholder="main" />
          </Form.Item>
        </Form>
        
        <div style={{ 
          padding: '12px', 
          background: '#141414', 
          borderRadius: 6, 
          border: '1px solid #333',
          marginTop: 8
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>提示：</strong>此功能用于导入单独的 MCU 项目（如开源项目）。
            <br />
            对于大型 SDK/框架（ESP-IDF、LVGL 等），请使用「开发库」管理。
          </Text>
        </div>
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
                          <Paragraph style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                            {selectedProject.description}
                          </Paragraph>
                        )}
                        
                        {/* 详细介绍 */}
                        {selectedProject.summary ? (
                          <div style={{ 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: 16, 
                            borderRadius: 8,
                            marginBottom: 16
                          }}>
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
            <div style={{ 
              background: '#141414', 
              borderRadius: 8, 
              padding: 16,
              marginBottom: 16 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>
                  {PROJECT_TYPES.find(t => t.id === importedProject.projectType)?.icon || '📁'}
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{importedProject.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {PROJECT_TYPES.find(t => t.id === importedProject.projectType)?.name || '未知类型'}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
                <FolderOutlined style={{ marginRight: 6 }} />
                {importedProject.path}
              </div>
              
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
                ellipsis={{ rows: 3, expandable: true }}
                style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 16 }}
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
              borderTop: '1px solid #333'
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
            <div style={{ 
              marginTop: 16, 
              padding: '10px 12px', 
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 6,
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)'
            }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
              已自动初始化 <code>.nexus</code> 目录，开发过程中可以记录调试经验和代码片段
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Projects
