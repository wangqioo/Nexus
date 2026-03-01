import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Space, 
  message, Row, Col, Tooltip, Spin, Badge, Select, Modal, Form,
  Switch, Popconfirm, List
} from 'antd'
import { 
  SearchOutlined, GithubOutlined, DownloadOutlined, SyncOutlined,
  FolderOpenOutlined, CodeOutlined, StarOutlined, StarFilled,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  ThunderboltOutlined, ClockCircleOutlined, LayoutOutlined,
  ExperimentOutlined, ToolOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, InfoCircleOutlined, ImportOutlined
} from '@ant-design/icons'
import type { GitHubRepo, GitHubCategory, GitStatusResult } from '../../types'
import { PROJECT_TYPES } from '../../types'
import type { CustomProjectType, ProjectType } from '../../types'
import { getProjectTypeIcon } from '../../components/Icons'
import { useLanguage } from '../../contexts/LanguageContext'
import { logger } from '../../utils/logger'
import styles from './GitHub.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 项目类型 id 列表（与软件内分类一致），用于校验 AI 返回的 category
const PROJECT_TYPE_IDS = new Set(PROJECT_TYPES.map(t => t.id))

function projectTypeToCategory(t: { id: string; name: string; icon: string; color: string }): GitHubCategory {
  return { id: t.id, name: t.name, icon: t.icon, color: t.color }
}

export function GitHub() {
  const { t } = useLanguage()
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [categories, setCategories] = useState<GitHubCategory[]>([])
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [repoStatus, setRepoStatus] = useState<Record<string, GitStatusResult>>({})
  const [loadingRepos, setLoadingRepos] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [reposConfigPath, setReposConfigPath] = useState<string>('')
  const [reposBasePath, setReposBasePath] = useState<string>('')
  
  // 添加/编辑仓库模态框
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRepo, setEditingRepo] = useState<GitHubRepo | null>(null)
  const [form] = Form.useForm()
  
  // AI 分析
  const [analyzing, setAnalyzing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  
  // 自定义项目类型（与项目管理一致，用于开发库类型分类）
  const [customTypes, setCustomTypes] = useState<CustomProjectType[]>([])
  
  // 批量导入
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [batchUrls, setBatchUrls] = useState<string[]>([])
  const [batchExtracting, setBatchExtracting] = useState(false)
  const [batchAdding, setBatchAdding] = useState(false)
  
  // 默认分类 = 内置项目类型 + 自定义类型（与软件内分类一致，仓库按类型放入 DevLibs/类型/仓库名）
  const defaultCategories = useMemo<GitHubCategory[]>(() => [
    ...PROJECT_TYPES.map(projectTypeToCategory),
    ...customTypes.map(ct => ({ id: ct.id, name: ct.name, icon: ct.icon || '📁', color: ct.color || '#666' }))
  ], [customTypes])
  
  // 加载 API Key
  useEffect(() => {
    const loadApiKey = async () => {
      // 优先从 localStorage 读取
      const localKey = localStorage.getItem('zhipu_api_key')
      if (localKey) {
        setApiKey(localKey)
        return
      }
      // 否则从配置文件读取
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
    Promise.all([
      window.electronAPI?.getDefaultReposConfigPath?.() ?? Promise.resolve(''),
      window.electronAPI?.getDefaultReposBasePath?.() ?? Promise.resolve(''),
    ]).then(([configPath, basePath]) => {
      setReposConfigPath(configPath || '')
      setReposBasePath(basePath || '')
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      const list = await window.electronAPI?.getCustomProjectTypes?.() ?? []
      setCustomTypes(list || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (reposConfigPath) loadReposConfig()
  }, [reposConfigPath])

  useEffect(() => {
    filterRepos()
  }, [repos, searchQuery, selectedCategory])

  // 仅当当前无分类且默认分类已就绪时补全 UI（不写文件，避免覆盖已有 repos）
  useEffect(() => {
    if (categories.length === 0 && defaultCategories.length > 0 && repos.length > 0) {
      setCategories(defaultCategories)
    }
  }, [categories.length, defaultCategories.length, repos.length])

  const loadReposConfig = async () => {
    if (!reposConfigPath) return
    setLoading(true)
    try {
      const content = await window.electronAPI.readProjectFile(reposConfigPath)
      const loadedRepos: GitHubRepo[] = []
      let loadedCategories: GitHubCategory[] = []
      if (content) {
        const config = JSON.parse(content)
        loadedRepos.push(...(config.repos || []))
        loadedCategories = config.categories || []
      }
      setRepos(loadedRepos)
      // 无分类时用软件内项目类型作为默认分类（仅补全 categories，绝不覆盖已有 repos）
      if (loadedCategories.length === 0 && defaultCategories.length > 0) {
        loadedCategories = defaultCategories
        setCategories(loadedCategories)
        const contentToWrite = JSON.stringify({ repos: loadedRepos, categories: loadedCategories }, null, 2)
        await window.electronAPI.writeProjectFile(reposConfigPath, contentToWrite)
      } else {
        setCategories(loadedCategories)
      }
      checkAllReposStatus(loadedRepos)
    } catch (error) {
      logger.error('Failed to load repos config:', error)
      message.error('加载仓库配置失败')
    }
    setLoading(false)
  }

  const checkAllReposStatus = async (repoList: GitHubRepo[]) => {
    const statusMap: Record<string, GitStatusResult> = {}
    
    for (const repo of repoList) {
      try {
        const status = await window.electronAPI.gitStatus(repo.localPath)
        statusMap[repo.id] = status
      } catch {
        statusMap[repo.id] = { exists: false, isRepo: false }
      }
    }
    
    setRepoStatus(statusMap)
  }

  const filterRepos = () => {
    let filtered = [...repos]
    
    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory)
    }
    
    // 按搜索词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    // 星标优先排序
    filtered.sort((a, b) => {
      if (a.starred && !b.starred) return -1
      if (!a.starred && b.starred) return 1
      return 0
    })
    
    setFilteredRepos(filtered)
  }

  const handleClone = async (repo: GitHubRepo) => {
    setLoadingRepos(prev => ({ ...prev, [repo.id]: true }))
    message.loading({ content: `正在克隆 ${repo.name}...`, key: repo.id, duration: 0 })
    
    try {
      const result = await window.electronAPI.gitClone(repo.url, repo.localPath, repo.branch)
      
      if (result.success) {
        message.success({ content: result.message, key: repo.id })
        // 更新状态
        const status = await window.electronAPI.gitStatus(repo.localPath)
        setRepoStatus(prev => ({ ...prev, [repo.id]: status }))
      } else {
        message.error({ content: `克隆失败: ${result.error}`, key: repo.id })
      }
    } catch (error) {
      message.error({ content: '克隆失败', key: repo.id })
    }
    
    setLoadingRepos(prev => ({ ...prev, [repo.id]: false }))
  }

  const handlePull = async (repo: GitHubRepo) => {
    setLoadingRepos(prev => ({ ...prev, [repo.id]: true }))
    message.loading({ content: `正在更新 ${repo.name}...`, key: repo.id, duration: 0 })
    
    try {
      const result = await window.electronAPI.gitPull(repo.localPath)
      
      if (result.success) {
        message.success({ content: result.message, key: repo.id })
        // 更新状态
        const status = await window.electronAPI.gitStatus(repo.localPath)
        setRepoStatus(prev => ({ ...prev, [repo.id]: status }))
      } else {
        message.error({ content: `更新失败: ${result.error}`, key: repo.id })
      }
    } catch (error) {
      message.error({ content: '更新失败', key: repo.id })
    }
    
    setLoadingRepos(prev => ({ ...prev, [repo.id]: false }))
  }

  const handleOpenInFinder = async (repo: GitHubRepo) => {
    const success = await window.electronAPI.openInFinder(repo.localPath)
    if (!success) {
      message.warning('目录不存在，请先克隆仓库')
    }
  }

  const handleOpenInCursor = async (repo: GitHubRepo) => {
    const success = await window.electronAPI.openInCursor(repo.localPath)
    if (!success) {
      message.warning('目录不存在或未安装 Cursor，请先克隆仓库')
    }
  }

  const handleOpenGitHub = (repo: GitHubRepo) => {
    const webUrl = repo.url.replace('.git', '').replace('git@github.com:', 'https://github.com/')
    window.electronAPI.openExternal(webUrl)
  }

  const handleRefreshAll = async () => {
    message.loading({ content: '正在检查所有仓库状态...', key: 'refresh' })
    await checkAllReposStatus(repos)
    message.success({ content: '状态刷新完成', key: 'refresh' })
  }

  const handlePullAll = async () => {
    const clonedRepos = repos.filter(r => repoStatus[r.id]?.isRepo)
    
    if (clonedRepos.length === 0) {
      message.warning('没有已克隆的仓库')
      return
    }
    
    message.loading({ content: `正在更新 ${clonedRepos.length} 个仓库...`, key: 'pullAll', duration: 0 })
    
    let success = 0
    let failed = 0
    
    for (const repo of clonedRepos) {
      try {
        const result = await window.electronAPI.gitPull(repo.localPath)
        if (result.success) {
          success++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    
    await checkAllReposStatus(repos)
    message.success({ content: `更新完成: ${success} 成功, ${failed} 失败`, key: 'pullAll' })
  }

  // 保存配置到文件（可选传入 categories，用于迁移）
  const saveReposConfig = async (newRepos: GitHubRepo[], newCategories?: GitHubCategory[]) => {
    try {
      const cats = newCategories ?? categories
      const config = { repos: newRepos, categories: cats }
      const content = JSON.stringify(config, null, 2)
      const success = await window.electronAPI.writeProjectFile(reposConfigPath, content)
      return success
    } catch (error) {
      logger.error('Failed to save repos config:', error)
      return false
    }
  }

  // 从 URL 取仓库原名（用于卡片展示：原名 · 概要中文名）
  const getRepoNameFromUrl = (repo: GitHubRepo) => parseGitHubUrl(repo.url)?.name || repo.id

  // 从 GitHub URL 解析仓库信息
  const parseGitHubUrl = (url: string) => {
    // 支持多种格式
    // https://github.com/user/repo.git
    // https://github.com/user/repo
    // git@github.com:user/repo.git
    
    let match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/)
    if (match) {
      return {
        owner: match[1],
        name: match[2],
        fullUrl: url.endsWith('.git') ? url : url + '.git'
      }
    }
    return null
  }

  // 打开添加仓库模态框（默认类型为 mcu，本地路径将为 DevLibs/类型/仓库名）
  const handleAddRepo = () => {
    setEditingRepo(null)
    form.resetFields()
    const defaultCat = categories.length > 0 ? categories[0].id : 'mcu'
    form.setFieldsValue({
      category: defaultCat,
      branch: 'main',
      starred: false,
      tags: ''
    })
    setModalOpen(true)
  }

  // 打开编辑仓库模态框
  const handleEditRepo = (repo: GitHubRepo) => {
    setEditingRepo(repo)
    form.setFieldsValue({
      url: repo.url,
      name: repo.name,
      description: repo.description,
      summary: repo.summary || '',
      category: repo.category,
      branch: repo.branch,
      localPath: repo.localPath,
      starred: repo.starred,
      tags: repo.tags.join(', ')
    })
    setModalOpen(true)
  }

  // 处理 URL 输入变化，自动填充信息（本地路径按类型分目录：DevLibs/类型/仓库名）
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    const parsed = parseGitHubUrl(url)
    if (parsed && !editingRepo && reposBasePath) {
      const cat = form.getFieldValue('category') || 'mcu'
      form.setFieldsValue({
        name: parsed.name,
        localPath: `${reposBasePath}/${cat}/${parsed.name}`
      })
    }
  }

  // AI 自动分析仓库
  const handleAIAnalyze = async () => {
    const url = form.getFieldValue('url')
    if (!url) {
      message.warning('请先输入 GitHub URL')
      return
    }
    
    if (!apiKey) {
      message.warning('请先在设置 → 大模型 API 中配置 API Key')
      return
    }
    
    // 保存 API Key
    localStorage.setItem('zhipu_api_key', apiKey)
    
    setAnalyzing(true)
    message.loading({ content: '正在分析仓库...', key: 'analyze', duration: 0 })
    
    try {
      const result = await window.electronAPI.analyzeGitHubRepo(url, apiKey)
      
      if (result) {
        const parsed = parseGitHubUrl(url)
        const repoName = parsed?.name || result.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        const base = reposBasePath || (await window.electronAPI?.getDefaultReposBasePath?.()) || ''
        const cat = PROJECT_TYPE_IDS.has(result.category as ProjectType) ? result.category : 'software'
        form.setFieldsValue({
          name: result.name,
          description: result.description,
          summary: result.summary || '',
          category: cat,
          branch: result.branch || 'main',
          tags: result.tags?.join(', ') || '',
          starred: result.starred || false,
          localPath: base ? `${base}/${cat}/${repoName}` : ''
        })
        
        message.success({ content: '分析完成！已生成详细介绍', key: 'analyze' })
      } else {
        message.error({ content: '分析失败，请检查 URL 或 API Key', key: 'analyze' })
      }
    } catch (error) {
      logger.error('AI 分析错误:', error)
      message.error({ content: '分析失败', key: 'analyze' })
    }
    
    setAnalyzing(false)
  }

  // 保存仓库
  const handleSaveRepo = async () => {
    try {
      const values = await form.validateFields()
      
      const newRepo: GitHubRepo = {
        id: editingRepo?.id || values.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: values.name,
        description: values.description || '',
        url: values.url.endsWith('.git') ? values.url : values.url + '.git',
        category: values.category,
        localPath: values.localPath,
        branch: values.branch || 'main',
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        starred: values.starred || false,
        summary: values.summary || ''
      }
      
      let newRepos: GitHubRepo[]
      if (editingRepo) {
        // 编辑现有仓库
        newRepos = repos.map(r => r.id === editingRepo.id ? newRepo : r)
      } else {
        // 添加新仓库
        // 检查是否已存在
        if (repos.some(r => r.url === newRepo.url || r.id === newRepo.id)) {
          message.error('该仓库已存在')
          return
        }
        newRepos = [...repos, newRepo]
      }
      
      // 保存到文件
      const saved = await saveReposConfig(newRepos)
      if (saved) {
        setRepos(newRepos)
        message.success(editingRepo ? '仓库已更新' : '仓库已添加')
        setModalOpen(false)
        
        // 检查新仓库状态
        const status = await window.electronAPI.gitStatus(newRepo.localPath)
        setRepoStatus(prev => ({ ...prev, [newRepo.id]: status }))
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      logger.error('Validation failed:', error)
    }
  }

  // 删除仓库
  const handleDeleteRepo = async (repo: GitHubRepo) => {
    const newRepos = repos.filter(r => r.id !== repo.id)
    const saved = await saveReposConfig(newRepos)
    
    if (saved) {
      setRepos(newRepos)
      message.success('仓库已删除')
    } else {
      message.error('删除失败')
    }
  }

  // 切换星标
  const handleToggleStar = async (repo: GitHubRepo) => {
    const newRepos = repos.map(r => 
      r.id === repo.id ? { ...r, starred: !r.starred } : r
    )
    const saved = await saveReposConfig(newRepos)
    
    if (saved) {
      setRepos(newRepos)
    }
  }

  const getStatusBadge = (repo: GitHubRepo) => {
    const status = repoStatus[repo.id]
    
    if (!status) {
      return <Badge status="default" text="检查中..." />
    }
    
    if (!status.exists || !status.isRepo) {
      return <Badge status="warning" text="未克隆" />
    }
    
    if (status.hasChanges) {
      return <Badge status="processing" text={`已修改 (${status.modified})`} />
    }
    
    return <Badge status="success" text="已同步" />
  }

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.color || '#666'
  }

  // 批量导入：AI 提取文本中的 GitHub 链接
  const handleBatchExtractUrls = async () => {
    if (!batchText.trim()) {
      message.warning('请先粘贴包含 GitHub 链接的文字')
      return
    }
    if (!apiKey) {
      message.warning('请先在设置 → 大模型 API 中配置 API Key')
      return
    }
    setBatchExtracting(true)
    try {
      const { urls } = await window.electronAPI.extractGitHubUrls(batchText, apiKey)
      setBatchUrls(urls)
      if (urls.length === 0) {
        message.info('未识别到 GitHub 仓库链接')
      } else {
        message.success(`已提取 ${urls.length} 个链接`)
      }
    } catch (e) {
      message.error('提取失败')
    }
    setBatchExtracting(false)
  }

  // 批量导入：逐个分析并添加仓库（按类型分目录）
  const handleBatchAdd = async () => {
    if (batchUrls.length === 0) {
      message.warning('请先点击「AI 提取链接」')
      return
    }
    if (!apiKey) {
      message.warning('请先配置 API Key')
      return
    }
    const base = reposBasePath || (await window.electronAPI?.getDefaultReposBasePath?.()) || ''
    if (!base) {
      message.error('无法获取开发库根路径')
      return
    }
    setBatchAdding(true)
    let added = 0
    const existingUrls = new Set(repos.map(r => r.url.replace(/\.git$/i, '')))
    let currentRepos = [...repos]
    for (const url of batchUrls) {
      const normalized = url.endsWith('.git') ? url : url + '.git'
      const key = url.replace(/\.git$/i, '')
      if (existingUrls.has(key)) continue
      try {
        const result = await window.electronAPI.analyzeGitHubRepo(url, apiKey)
        const parsed = parseGitHubUrl(url)
        const repoName = parsed?.name || (result?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-') || 'repo'
        const cat = result?.category && PROJECT_TYPE_IDS.has(result.category as ProjectType) ? result.category : 'software'
        const newRepo: GitHubRepo = {
          id: repoName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: result?.name || repoName,
          description: result?.description || '',
          url: normalized,
          category: cat,
          localPath: `${base}/${cat}/${repoName}`,
          branch: result?.branch || 'main',
          tags: result?.tags || [],
          starred: result?.starred || false,
          summary: result?.summary
        }
        if (currentRepos.some(r => r.id === newRepo.id)) {
          newRepo.id = `${newRepo.id}-${Date.now().toString(36)}`
        }
        currentRepos = [...currentRepos, newRepo]
        const saved = await saveReposConfig(currentRepos)
        if (saved) {
          setRepos(currentRepos)
          existingUrls.add(key)
          added++
          const status = await window.electronAPI.gitStatus(newRepo.localPath)
          setRepoStatus(prev => ({ ...prev, [newRepo.id]: status }))
        }
      } catch (_) {
        // 单条失败继续下一条
      }
    }
    setBatchAdding(false)
    if (added > 0) {
      setBatchModalOpen(false)
      setBatchUrls([])
      setBatchText('')
      message.success(`已添加 ${added} 个仓库`)
    } else {
      message.info('没有新仓库被添加（可能均已存在）')
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip="加载仓库配置..." />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Title level={2} className={styles.title}>
            <GithubOutlined /> 开发库管理
          </Title>
          <Space>
            <Button icon={<SyncOutlined />} onClick={handleRefreshAll}>
              刷新状态
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handlePullAll}>
              全部更新
            </Button>
            <Button icon={<ImportOutlined />} onClick={() => { setBatchModalOpen(true); setBatchUrls([]); setBatchText('') }}>
              批量导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRepo}>
              添加仓库
            </Button>
          </Space>
        </div>
        <Paragraph type="secondary" className={styles.subtitle}>
          {t.devLibrary.subtitle} 仓库将克隆到 <code>~/DevLibs/类型/仓库名</code>，与 Workshop 项目分开存放。
        </Paragraph>

        {/* 分类筛选（与项目管理页一致，点击切换类型） */}
        <div className={styles.typeSection}>
          <div className={styles.sectionLabel}>项目类型</div>
          <div className={styles.typeTabs}>
            <div
              className={`${styles.typeTab} ${selectedCategory === 'all' ? `${styles.typeTabActive} ${styles.typeTabActiveAll}` : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              <span className={styles.typeIcon}>📋</span>
              <span className={styles.typeLabel}>全部</span>
              <span className={styles.typeCount}>{repos.length}</span>
            </div>
            {categories.map(cat => {
              const count = repos.filter(r => r.category === cat.id).length
              return (
                <div
                  key={cat.id}
                  className={`${styles.typeTab} ${selectedCategory === cat.id ? styles.typeTabActive : ''}`}
                  style={selectedCategory === cat.id
                    ? { background: cat.color, borderColor: cat.color, color: '#fff' }
                    : { borderLeftColor: cat.color, borderLeftWidth: 3 }
                  }
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className={styles.typeIcon}>{getProjectTypeIcon(cat.id, cat.icon)}</span>
                  <span className={styles.typeLabel}>{cat.name}</span>
                  <span className={styles.typeCount}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 搜索栏 */}
        <div className={styles.filters}>
          <Input
            placeholder="搜索仓库..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
          />
        </div>
      </div>

      <div className={styles.content}>
        {filteredRepos.length === 0 ? (
          <Empty description="没有找到匹配的仓库" />
        ) : (
          <div className={styles.cardGrid}>
            {filteredRepos.map(repo => {
              const status = repoStatus[repo.id]
              const isCloned = status?.isRepo
              const isLoading = loadingRepos[repo.id]
              
              return (
                <Card
                    key={repo.id}
                    className={`${styles.repoCard} ${isCloned ? styles.cloned : ''}`}
                    hoverable
                    actions={[
                      <Tooltip title="在 GitHub 打开" key="github">
                        <GithubOutlined onClick={() => handleOpenGitHub(repo)} />
                      </Tooltip>,
                      <Tooltip title="在 Finder 打开" key="finder">
                        <FolderOpenOutlined 
                          onClick={() => handleOpenInFinder(repo)}
                          style={{ opacity: isCloned ? 1 : 0.3 }}
                        />
                      </Tooltip>,
                      <Tooltip title="在 Cursor 中打开" key="cursor">
                        <CodeOutlined 
                          onClick={() => handleOpenInCursor(repo)}
                          style={{ opacity: isCloned ? 1 : 0.3 }}
                        />
                      </Tooltip>,
                      isCloned ? (
                        <Tooltip title="拉取更新" key="action">
                          {isLoading ? (
                            <LoadingOutlined />
                          ) : (
                            <SyncOutlined onClick={() => handlePull(repo)} />
                          )}
                        </Tooltip>
                      ) : (
                        <Tooltip title="克隆仓库" key="action">
                          {isLoading ? (
                            <LoadingOutlined />
                          ) : (
                            <DownloadOutlined onClick={() => handleClone(repo)} />
                          )}
                        </Tooltip>
                      )
                    ]}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.repoName}>
                        <span 
                          className={styles.starBtn}
                          onClick={(e) => { e.stopPropagation(); handleToggleStar(repo) }}
                        >
                          {repo.starred ? <StarFilled className={styles.star} /> : <StarOutlined className={styles.starEmpty} />}
                        </span>
                        <span className={styles.repoNameText}>
                          {(() => {
                            const original = getRepoNameFromUrl(repo)
                            const summary = repo.name
                            if (original && summary && original !== summary) {
                              return (
                                <>
                                  {original}
                                  <span className={styles.repoNameSummary}> · {summary}</span>
                                </>
                              )
                            }
                            return original || summary || '仓库'
                          })()}
                        </span>
                      </div>
                      <Space size={4}>
                        <Tooltip title="编辑">
                          <EditOutlined 
                            className={styles.editBtn}
                            onClick={() => handleEditRepo(repo)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定删除这个仓库吗？"
                          onConfirm={() => handleDeleteRepo(repo)}
                          okText="删除"
                          cancelText="取消"
                        >
                          <DeleteOutlined className={styles.deleteBtn} />
                        </Popconfirm>
                      </Space>
                    </div>
                    
                    <Tag color={getCategoryColor(repo.category)} className={styles.categoryTagRow}>
                      {categories.find(c => c.id === repo.category)?.name}
                    </Tag>
                    
                    <Paragraph 
                      className={styles.description}
                      ellipsis={{ rows: 2 }}
                    >
                      {repo.description}
                      {repo.summary && (
                        <Tooltip 
                          title={
                            <div style={{ maxWidth: 400, whiteSpace: 'pre-wrap' }}>
                              {repo.summary}
                            </div>
                          }
                          placement="right"
                          overlayStyle={{ maxWidth: 450 }}
                        >
                          <InfoCircleOutlined className={styles.infoIcon} />
                        </Tooltip>
                      )}
                    </Paragraph>
                    
                    <div className={styles.tags}>
                      {repo.tags.slice(0, 4).map(tag => (
                        <Tag key={tag} className={styles.tag}>{tag}</Tag>
                      ))}
                    </div>
                    
                    <div className={styles.status}>
                      {getStatusBadge(repo)}
                      {status?.lastCommitDate && (
                        <Text type="secondary" className={styles.lastUpdate}>
                          {status.lastCommitDate}
                        </Text>
                      )}
                    </div>
                  </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* 批量导入：粘贴文字 → AI 提取链接 → 批量添加 */}
      <Modal
        title={<><ImportOutlined /> 批量导入</>}
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setBatchModalOpen(false)}>取消</Button>,
          <Button key="extract" onClick={handleBatchExtractUrls} loading={batchExtracting} icon={<ThunderboltOutlined />}>
            AI 提取链接
          </Button>,
          <Button key="add" type="primary" onClick={handleBatchAdd} loading={batchAdding} disabled={batchUrls.length === 0}>
            批量添加（{batchUrls.length}）
          </Button>
        ]}
        width={640}
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          粘贴包含 GitHub 链接的文字（支持 Markdown：如 [描述](https://github.com/owner/repo)、README、文档等），点击「AI 提取链接」识别仓库地址，再批量添加。仓库将按 AI 分析的类型放入 ~/DevLibs/类型/仓库名。
        </Paragraph>
        <TextArea
          placeholder="支持 Markdown 链接格式，如 [项目名](https://github.com/owner/repo)..."
          value={batchText}
          onChange={e => setBatchText(e.target.value)}
          rows={6}
          style={{ marginBottom: 16 }}
        />
        {batchUrls.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Text strong>已提取的链接（可删除不需要的）：</Text>
            <List
              size="small"
              dataSource={batchUrls}
              style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}
              renderItem={(url, index) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" danger onClick={() => setBatchUrls(prev => prev.filter((_, i) => i !== index))}>
                      删除
                    </Button>
                  ]}
                >
                  <Text code style={{ fontSize: 12 }} ellipsis>{url}</Text>
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>

      {/* 添加/编辑仓库模态框 */}
      <Modal
        title={editingRepo ? '编辑仓库' : '添加仓库'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveRepo}
        okText={editingRepo ? '保存' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ category: 'mcu', branch: 'main', starred: false }}
          onValuesChange={(_, all) => {
            if (reposBasePath && all.name && all.category && !editingRepo) {
              const name = (all.name as string).toLowerCase().replace(/[^a-z0-9]/g, '-') || 'repo'
              form.setFieldsValue({ localPath: `${reposBasePath}/${all.category}/${name}` })
            }
          }}
        >
          {/* API Key 配置（仅在未配置时显示） */}
          {!editingRepo && !apiKey && (
            <div className={styles.apiKeySection}>
              <Input.Password
                placeholder="API Key（用于自动分析，可在设置 → 大模型 API 配置）"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className={styles.apiKeyInput}
                size="small"
              />
              <Text type="secondary" className={styles.apiKeyTip}>
                获取: <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI.openExternal('https://open.bigmodel.cn') }}>open.bigmodel.cn</a>
              </Text>
            </div>
          )}
          
          <Form.Item
            name="url"
            label="GitHub URL"
            rules={[
              { required: true, message: '请输入仓库地址' },
              { pattern: /github\.com/, message: '请输入有效的 GitHub 地址' }
            ]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="https://github.com/espressif/esp-idf" 
                onChange={handleUrlChange}
                style={{ flex: 1 }}
              />
              {!editingRepo && (
                <Button 
                  type="primary"
                  onClick={handleAIAnalyze}
                  loading={analyzing}
                  icon={<ThunderboltOutlined />}
                >
                  AI 分析
                </Button>
              )}
            </Space.Compact>
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="仓库名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="ESP-IDF" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true }]}
              >
                <Select
                  options={categories.map(c => ({
                    value: c.id,
                    label: (
                      <Space>
                        {getProjectTypeIcon(c.id, c.icon)}
                        {c.name}
                      </Space>
                    )
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="简短描述"
          >
            <Input placeholder="一句话描述仓库用途" maxLength={50} />
          </Form.Item>
          
          <Form.Item
            name="summary"
            label="详细介绍"
            extra="AI 将基于 README 自动生成详细介绍"
          >
            <TextArea 
              rows={5} 
              placeholder="仓库的详细介绍，包含功能、特性、支持的硬件等..."
              showCount
              maxLength={1000}
            />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="localPath"
                label="本地路径"
                rules={[{ required: true, message: '请输入本地存储路径' }]}
                extra="仓库将按类型克隆到 ~/DevLibs/类型/仓库名"
              >
                <Input placeholder="~/DevLibs/类型/仓库名" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="branch"
                label="分支"
              >
                <Input placeholder="main" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="tags"
                label="标签"
                extra="用逗号分隔多个标签"
              >
                <Input placeholder="ESP32, SDK, 官方" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="starred"
                label="星标"
                valuePropName="checked"
              >
                <Switch checkedChildren="⭐" unCheckedChildren="☆" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default GitHub
