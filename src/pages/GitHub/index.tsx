import React, { useState, useEffect, useCallback } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Space, 
  message, Row, Col, Tooltip, Spin, Badge, Select, Modal, Form,
  Switch, Popconfirm
} from 'antd'
import { 
  SearchOutlined, GithubOutlined, DownloadOutlined, SyncOutlined,
  FolderOpenOutlined, CodeOutlined, StarOutlined, StarFilled,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined,
  ThunderboltOutlined, ClockCircleOutlined, LayoutOutlined,
  ExperimentOutlined, ToolOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import type { GitHubRepo, GitHubCategory, GitStatusResult } from '../../types'
import styles from './GitHub.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

// 仓库配置文件路径
const REPOS_CONFIG_PATH = '/Users/wq/Workshop/MCU/_github/repos.json'

// 图标映射
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'espressif': <ThunderboltOutlined />,
  'sifli': <ClockCircleOutlined />,
  'lvgl': <LayoutOutlined />,
  'arduino': <ExperimentOutlined />,
  'tools': <ToolOutlined />,
}

export function GitHub() {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [categories, setCategories] = useState<GitHubCategory[]>([])
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [repoStatus, setRepoStatus] = useState<Record<string, GitStatusResult>>({})
  const [loadingRepos, setLoadingRepos] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  
  // 添加/编辑仓库模态框
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRepo, setEditingRepo] = useState<GitHubRepo | null>(null)
  const [form] = Form.useForm()
  
  // AI 分析
  const [analyzing, setAnalyzing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  
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
    loadReposConfig()
  }, [])

  useEffect(() => {
    filterRepos()
  }, [repos, searchQuery, selectedCategory])

  const loadReposConfig = async () => {
    setLoading(true)
    try {
      // 读取仓库配置
      const content = await window.electronAPI.readProjectFile(REPOS_CONFIG_PATH)
      if (content) {
        const config = JSON.parse(content)
        setRepos(config.repos || [])
        setCategories(config.categories || [])
        
        // 检查所有仓库状态
        checkAllReposStatus(config.repos || [])
      }
    } catch (error) {
      console.error('Failed to load repos config:', error)
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

  const handleOpenInTerminal = async (repo: GitHubRepo) => {
    const success = await window.electronAPI.openInTerminal(repo.localPath)
    if (!success) {
      message.warning('目录不存在，请先克隆仓库')
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

  // 保存配置到文件
  const saveReposConfig = async (newRepos: GitHubRepo[]) => {
    try {
      const config = { repos: newRepos, categories }
      const content = JSON.stringify(config, null, 2)
      
      // 直接写入原始配置文件路径
      const success = await window.electronAPI.writeProjectFile(REPOS_CONFIG_PATH, content)
      
      return success
    } catch (error) {
      console.error('Failed to save repos config:', error)
      return false
    }
  }

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

  // 打开添加仓库模态框
  const handleAddRepo = () => {
    setEditingRepo(null)
    form.resetFields()
    form.setFieldsValue({
      category: 'tools',
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

  // 处理 URL 输入变化，自动填充信息
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    const parsed = parseGitHubUrl(url)
    
    if (parsed && !editingRepo) {
      // 只在添加新仓库时自动填充基本信息
      form.setFieldsValue({
        name: parsed.name,
        localPath: `/Users/wq/Workshop/MCU/_github/tools/${parsed.name}`
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
      message.warning('请先设置智谱 API Key')
      return
    }
    
    // 保存 API Key
    localStorage.setItem('zhipu_api_key', apiKey)
    
    setAnalyzing(true)
    message.loading({ content: '正在分析仓库...', key: 'analyze', duration: 0 })
    
    try {
      const result = await window.electronAPI.analyzeGitHubRepo(url, apiKey)
      
      if (result) {
        // 解析 URL 获取仓库名
        const parsed = parseGitHubUrl(url)
        const repoName = parsed?.name || result.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        
        // 自动填充表单
        form.setFieldsValue({
          name: result.name,
          description: result.description,
          summary: result.summary || '',
          category: result.category,
          branch: result.branch || 'main',
          tags: result.tags?.join(', ') || '',
          starred: result.starred || false,
          localPath: `/Users/wq/Workshop/MCU/_github/${result.category}/${repoName}`
        })
        
        message.success({ content: '分析完成！已生成详细介绍', key: 'analyze' })
      } else {
        message.error({ content: '分析失败，请检查 URL 或 API Key', key: 'analyze' })
      }
    } catch (error) {
      console.error('AI 分析错误:', error)
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
      console.error('Validation failed:', error)
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRepo}>
              添加仓库
            </Button>
          </Space>
        </div>
        
        <div className={styles.filters}>
          <Input
            placeholder="搜索仓库..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            allowClear
          />
          
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            className={styles.categorySelect}
            options={[
              { value: 'all', label: '全部分类' },
              ...categories.map(c => ({
                value: c.id,
                label: (
                  <Space>
                    {CATEGORY_ICONS[c.id]}
                    {c.name}
                  </Space>
                )
              }))
            ]}
          />
        </div>
        
        {/* 分类统计 */}
        <div className={styles.stats}>
          {categories.map(cat => {
            const count = repos.filter(r => r.category === cat.id).length
            const cloned = repos.filter(r => r.category === cat.id && repoStatus[r.id]?.isRepo).length
            return (
              <Tag 
                key={cat.id} 
                color={cat.color}
                className={styles.statTag}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {CATEGORY_ICONS[cat.id]} {cat.name}: {cloned}/{count}
              </Tag>
            )
          })}
        </div>
      </div>

      <div className={styles.content}>
        {filteredRepos.length === 0 ? (
          <Empty description="没有找到匹配的仓库" />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredRepos.map(repo => {
              const status = repoStatus[repo.id]
              const isCloned = status?.isRepo
              const isLoading = loadingRepos[repo.id]
              
              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={repo.id}>
                  <Card
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
                      <Tooltip title="在终端打开" key="terminal">
                        <CodeOutlined 
                          onClick={() => handleOpenInTerminal(repo)}
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
                        {repo.name}
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
                </Col>
              )
            })}
          </Row>
        )}
      </div>

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
          initialValues={{ category: 'tools', branch: 'main', starred: false }}
        >
          {/* API Key 配置（仅在未配置时显示） */}
          {!editingRepo && !apiKey && (
            <div className={styles.apiKeySection}>
              <Input.Password
                placeholder="智谱 API Key (用于自动分析)"
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
                        {CATEGORY_ICONS[c.id]}
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
                extra="仓库将被克隆到此目录"
              >
                <Input placeholder="/Users/wq/Workshop/MCU/_github/tools/xxx" />
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
