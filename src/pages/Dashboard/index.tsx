import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Card, Typography, List, Tag, Button, Empty, Alert, message } from 'antd'
import { 
  PlusOutlined, RightOutlined, BookOutlined, FolderOutlined, SyncOutlined, QuestionCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { storage } from '../../services/storage'
import type { KnowledgeEntry, LocalProject, ProjectType, SyncProgress } from '../../types'
import { PROJECT_TYPES, KNOWLEDGE_CATEGORIES } from '../../types'
import { getProjectTypeIcon } from '../../components/Icons'
import { Onboarding } from '../../components/Onboarding'
import styles from './Dashboard.module.css'

const { Title, Text } = Typography

interface PendingProject {
  name: string
  path: string
  pendingCount: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [notesCount, setNotesCount] = useState(0)
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([])
  const [showGuide, setShowGuide] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [knowledgeList, notesList] = await Promise.all([
      storage.listAllKnowledge(),
      storage.listNotes(),
    ])
    setEntries(knowledgeList)
    setNotesCount(notesList.length)

    // 读取本地项目
    try {
      const content = await window.electronAPI?.readFile('local-projects.json')
      if (content) {
        const data = JSON.parse(content)
        const projectList = data.projects || []
        setProjects(projectList)
        
        // 检测待同步项目
        checkPendingProjects(projectList)
      }
    } catch {}
  }
  
  const checkPendingProjects = async (projectList: LocalProject[]) => {
    const pending: PendingProject[] = []
    for (const project of projectList) {
      try {
        const result = await window.electronAPI?.checkPendingSync(project.path)
        if (result?.hasPending) {
          pending.push({
            name: project.name,
            path: project.path,
            pendingCount: result.pendingCount
          })
        }
      } catch {}
    }
    setPendingProjects(pending)
  }

  // 一键同步所有待同步项目
  const handleSyncAll = async () => {
    if (pendingProjects.length === 0) {
      message.info('没有待同步的项目')
      return
    }

    // 获取 API Key
    let apiKey = localStorage.getItem('zhipu_api_key') || ''
    if (!apiKey) {
      try {
        const configContent = await window.electronAPI?.readFile('config.json')
        if (configContent) {
          const config = JSON.parse(configContent)
          apiKey = config.zhipu_api_key || ''
        }
      } catch {}
    }

    setSyncing(true)
    let synced = 0
    let errors = 0

    for (let i = 0; i < pendingProjects.length; i++) {
      const project = pendingProjects[i]
      setSyncProgress({
        step: `同步 ${project.name}`,
        current: i,
        total: pendingProjects.length,
        file: `${project.pendingCount} 条待同步`
      })

      try {
        await window.electronAPI?.syncFromProject(project.path, apiKey)
        synced++
      } catch (e) {
        console.error(`同步 ${project.name} 失败:`, e)
        errors++
      }

      // API 限速
      if (i < pendingProjects.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    setSyncProgress({ step: '同步完成', current: pendingProjects.length, total: pendingProjects.length })
    
    setTimeout(() => {
      setSyncing(false)
      setSyncProgress(null)
      message.success(`一键同步完成: 成功 ${synced} 个项目, 失败 ${errors} 个`)
      // 刷新数据
      loadData()
    }, 1000)
  }

  // 项目类型统计
  const typeStats: Record<string, { projects: number; knowledge: number }> = {}
  for (const type of PROJECT_TYPES) {
    typeStats[type.id] = {
      projects: projects.filter(p => p.projectType === type.id).length,
      knowledge: entries.filter(e => e.projectType === type.id).length,
    }
  }

  // 总计
  const totalProjects = projects.length
  const totalKnowledge = entries.length

  // 最近知识条目
  const recentEntries = entries.slice(0, 8)

  // 最近项目
  const recentProjects = [...projects]
    .sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))
    .slice(0, 6)

  // 获取类型配置
  const getTypeConfig = (type: ProjectType) => PROJECT_TYPES.find(t => t.id === type)

  // 获取分类名称
  const getCategoryName = (type: ProjectType, category: string) => {
    const cats = KNOWLEDGE_CATEGORIES[type] || []
    return cats.find(c => c.id === category)?.name || category
  }

  const getCategoryIcon = (type: ProjectType, category: string) => {
    const cats = KNOWLEDGE_CATEGORIES[type] || []
    return cats.find(c => c.id === category)?.icon || '📄'
  }

  // 内容预览
  const getPreview = (content?: string) => {
    if (!content) return ''
    return content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[*_~`#]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 80)
  }

  const getSeverityColor = (severity?: string) => {
    const map: Record<string, string> = {
      critical: 'red', major: 'orange', minor: 'blue', trivial: 'default'
    }
    return map[severity || ''] || 'default'
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

      {/* 头部 */}
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>Nexus</Title>
          <Text type="secondary">全栈项目开发经验管理中枢</Text>
        </div>
        <Button 
          type="text" 
          icon={<QuestionCircleOutlined />} 
          onClick={() => setShowGuide(true)}
          title="使用指南"
        />
      </div>

      {/* 概览统计 */}
      <div className={styles.statsBar}>
        <div className={styles.statItem} onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
          <span className={styles.statNumber}>{totalProjects}</span>
          <span className={styles.statLabel}>项目</span>
        </div>
        <div className={styles.statItem} onClick={() => navigate('/knowledge')} style={{ cursor: 'pointer' }}>
          <span className={styles.statNumber}>{totalKnowledge}</span>
          <span className={styles.statLabel}>知识条目</span>
        </div>
        <div className={styles.statItem} onClick={() => navigate('/notes')} style={{ cursor: 'pointer' }}>
          <span className={styles.statNumber}>{notesCount}</span>
          <span className={styles.statLabel}>笔记</span>
        </div>
        <div className={styles.statItem} style={{ cursor: pendingProjects.length > 0 ? 'pointer' : undefined }} onClick={() => pendingProjects.length > 0 && navigate('/projects')}>
          <span className={styles.statNumber} style={{ color: pendingProjects.length > 0 ? '#52c41a' : undefined }}>
            {pendingProjects.reduce((sum, p) => sum + p.pendingCount, 0)}
          </span>
          <span className={styles.statLabel}>待同步</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{PROJECT_TYPES.filter(t => typeStats[t.id]?.projects > 0).length}</span>
          <span className={styles.statLabel}>项目类型</span>
        </div>
      </div>

      {/* 待同步提醒 */}
      {pendingProjects.length > 0 && (
        <Alert
          type="success"
          showIcon
          icon={<SyncOutlined spin />}
          message={
            <span>
              <strong>{pendingProjects.length}</strong> 个项目有新经验待同步（共 {pendingProjects.reduce((sum, p) => sum + p.pendingCount, 0)} 条）
            </span>
          }
          description={
            <div style={{ marginTop: 8 }}>
              {pendingProjects.slice(0, 3).map((p, i) => (
                <Tag key={i} color="green" style={{ marginBottom: 4 }}>
                  {p.name}: {p.pendingCount}条
                </Tag>
              ))}
              {pendingProjects.length > 3 && <Tag>+{pendingProjects.length - 3} 更多</Tag>}
              <Button 
                type="primary" 
                size="small" 
                icon={<ThunderboltOutlined />}
                style={{ marginLeft: 12 }}
                loading={syncing}
                onClick={handleSyncAll}
              >
                一键同步
              </Button>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 项目类型卡片 - 始终显示所有类型 */}
      <div className={styles.typeCardsRow}>
        {PROJECT_TYPES.map(type => {
          const stats = typeStats[type.id]
          return (
            <div 
              key={type.id} 
              className={styles.typeCard}
              onClick={() => navigate('/projects')}
              style={{ 
                borderLeftColor: type.color, 
                borderLeftWidth: 3,
                opacity: stats.projects === 0 ? 0.6 : 1
              }}
            >
              <div className={styles.typeCardIcon}>{type.icon}</div>
              <div className={styles.typeCardInfo}>
                <div className={styles.typeCardName}>{type.name}</div>
                <div className={styles.typeCardCount}>{stats.projects}</div>
                <div className={styles.typeCardLabel}>
                  项目 · {stats.knowledge} 知识
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 欢迎卡（如果没有知识） */}
      {totalKnowledge === 0 && totalProjects === 0 && (
        <Card className={styles.welcomeCard}>
          <div className={styles.welcomeContent}>
            <Title level={4}>🚀 开始使用 Nexus</Title>
            <Text type="secondary">导入项目 → Cursor 开发 → 自动记录经验 → 一键同步知识库</Text>
            <div className={styles.quickActions}>
              <Button type="primary" icon={<FolderOutlined />} onClick={() => navigate('/projects')}>
                导入第一个项目
              </Button>
              <Button icon={<BookOutlined />} onClick={() => navigate('/knowledge')}>
                浏览知识库
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 最近知识 + 最近项目 */}
      <div className={styles.recentGrid}>
        {/* 最近知识 */}
        <Card
          title={<><BookOutlined /> 最近知识</>}
          extra={<Button type="link" onClick={() => navigate('/knowledge')}>查看全部 <RightOutlined /></Button>}
          className={styles.listCard}
        >
          {recentEntries.length > 0 ? (
            <List
              dataSource={recentEntries}
              renderItem={(item) => {
                const tc = getTypeConfig(item.projectType)
                return (
                  <List.Item className={styles.listItem} onClick={() => navigate('/knowledge')}>
                    <div className={styles.entryItem}>
                      <div className={styles.entryMain}>
                        {item.isNew && <span className={styles.unreadDot} title="未读" />}
                        <Text strong className={styles.entryTitle}>{item.title}</Text>
                        <Tag color={tc?.color} style={{ fontSize: 11 }}>
                          {getProjectTypeIcon(item.projectType, tc?.icon || '')} {getCategoryName(item.projectType, item.category)}
                        </Tag>
                      </div>
                      <Text className={styles.entryPreview}>
                        {getPreview(item.content)}
                      </Text>
                    </div>
                  </List.Item>
                )
              }}
            />
          ) : (
            <Empty description="暂无知识条目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {/* 最近项目 */}
        <Card
          title={<><FolderOutlined /> 最近项目</>}
          extra={<Button type="link" onClick={() => navigate('/projects')}>查看全部 <RightOutlined /></Button>}
          className={styles.listCard}
        >
          {recentProjects.length > 0 ? (
            <List
              dataSource={recentProjects}
              renderItem={(item) => {
                const tc = getTypeConfig(item.projectType)
                return (
                  <List.Item className={styles.listItem} onClick={() => navigate('/projects')}>
                    <div className={styles.entryItem}>
                      <div className={styles.entryMain}>
                        <Text strong className={styles.entryTitle}>{item.name}</Text>
                        <Tag color={tc?.color} style={{ fontSize: 11 }}>
                          {getProjectTypeIcon(item.projectType, tc?.icon || '')} {tc?.name}
                        </Tag>
                      </div>
                      <Text className={styles.entryPreview}>
                        {item.description?.slice(0, 80) || item.path}
                      </Text>
                    </div>
                  </List.Item>
                )
              }}
            />
          ) : (
            <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
      
      {/* 使用指南弹窗 */}
      <Onboarding 
        open={showGuide} 
        onFinish={() => setShowGuide(false)} 
      />
    </div>
  )
}
