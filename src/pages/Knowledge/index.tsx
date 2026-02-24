import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, message, Drawer, Popconfirm, Tooltip
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  BookOutlined, FolderOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import type { KnowledgeEntry, ProjectType } from '../../types'
import { PROJECT_TYPES, FIXED_KNOWLEDGE_CATEGORIES, KNOWLEDGE_CATEGORIES } from '../../types'
import { getProjectTypeIcon } from '../../components/Icons'
import { logger } from '../../utils/logger'
import styles from './Knowledge.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

/** 各项目类型对应的知识分类（固定 4 类，后端统一返回） */
type CategoriesMap = Record<string, { id: string; name: string; icon: string }[]>

export function Knowledge() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesByType, setCategoriesByType] = useState<CategoriesMap | null>(null)
  
  // 筛选：项目类型 + 知识库固定 4 类
  const [selectedType, setSelectedType] = useState<ProjectType | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 详情
  const [detailEntry, setDetailEntry] = useState<KnowledgeEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  // 新建/编辑
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [form] = Form.useForm()
  const [formType, setFormType] = useState<ProjectType>('mcu')

  useEffect(() => {
    loadData()
  }, [])

  // 带 docId 进入时先刷新知识列表（避免刚同步后跳转时列表未更新）
  const docIdFromUrl = searchParams.get('docId')
  useEffect(() => {
    if (docIdFromUrl) {
      loadData()
    }
  }, [docIdFromUrl])

  // 处理 URL 参数打开指定文档（仅在加载完成后执行，避免用旧列表误判）
  useEffect(() => {
    const docId = searchParams.get('docId')
    if (!docId || loading) return

    const entry = entries.find(e => {
      if (!e.id) return false
      if (e.id === docId) return true
      if (e.id.includes(docId) || docId.includes(e.id)) return true
      if (e.id.toLowerCase() === docId.toLowerCase()) return true
      return false
    })

    if (entry) {
      setDetailEntry(entry)
      setDrawerOpen(true)
    } else {
      message.info('未找到对应的知识条目，可能尚未同步')
    }
    setSearchParams({})
  }, [entries, searchParams, loading])

  const loadData = async () => {
    setLoading(true)
    try {
      let categoriesByType: CategoriesMap | null = null
      if (typeof window !== 'undefined' && window.electronAPI?.getKnowledgeCategoriesForType) {
        const types: ProjectType[] = PROJECT_TYPES.map(t => t.id)
        const map: CategoriesMap = {}
        await Promise.all(
          types.map(async (t) => {
            map[t] = await window.electronAPI.getKnowledgeCategoriesForType(t)
          })
        )
        setCategoriesByType(map)
      }
      const data = await storage.listAllKnowledge()
      setEntries(data)
    } catch (e) {
      logger.error('Failed to load knowledge:', e)
    }
    setLoading(false)
  }

  const filteredEntries = useMemo(() => {
    let filtered = [...entries]
    if (selectedType !== 'all') filtered = filtered.filter(e => e.projectType === selectedType)
    if (selectedCategory !== 'all') filtered = filtered.filter(e => (e.category || 'other') === selectedCategory)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.content || '').toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [entries, selectedType, selectedCategory, searchQuery])

  const typeStats = useMemo(() => {
    const stats: Record<string, number> = { all: entries.length }
    for (const e of entries) {
      stats[e.projectType] = (stats[e.projectType] || 0) + 1
    }
    return stats
  }, [entries])

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: 0 }
    const base = selectedType === 'all' ? entries : entries.filter(e => e.projectType === selectedType)
    stats.all = base.length
    for (const e of base) {
      const cat = e.category || 'other'
      stats[cat] = (stats[cat] || 0) + 1
    }
    return stats
  }, [entries, selectedType])

  // 获取类型配置
  const getTypeConfig = (type: ProjectType) => {
    return PROJECT_TYPES.find(t => t.id === type)
  }

  // 获取分类名称
  const getCategoryName = (type: ProjectType, category: string) => {
    const cats = categoriesByType?.[type] ?? KNOWLEDGE_CATEGORIES[type] ?? []
    return cats.find(c => c.id === category)?.name || category
  }

  const getCategoryIcon = (type: ProjectType, category: string) => {
    const cats = categoriesByType?.[type] ?? KNOWLEDGE_CATEGORIES[type] ?? []
    return cats.find(c => c.id === category)?.icon || '📄'
  }

  // 内容预览（去除 Markdown 标记）
  const getPreview = (content?: string) => {
    if (!content) return ''
    return content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '[代码]')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200)
  }

  // 格式化时间
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } catch {
      return dateStr
    }
  }

  const handleAdd = () => {
    setEditingEntry(null)
    form.resetFields()
    form.setFieldsValue({ projectType: 'mcu', category: FIXED_KNOWLEDGE_CATEGORIES[0]?.id || 'debug' })
    setFormType('mcu')
    setModalOpen(true)
  }

  // 编辑
  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    form.setFieldsValue({
      title: entry.title,
      projectType: entry.projectType,
      category: entry.category,
      content: entry.content,
      tags: entry.tags?.join(', ') || '',
      severity: entry.severity,
    })
    setFormType(entry.projectType)
    setModalOpen(true)
    setDrawerOpen(false)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const entry: KnowledgeEntry = {
        id: editingEntry?.id || uuidv4(),
        title: values.title,
        content: values.content || '',
        projectType: values.projectType,
        category: values.category || 'other',
        tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        severity: values.severity,
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const success = await storage.saveKnowledgeEntry(entry)
      if (success) {
        message.success(editingEntry ? '已更新' : '已添加')
        setModalOpen(false)
        loadData()
      } else {
        message.error('保存失败')
      }
    } catch (e) {
      // form validation error
    }
  }

  // 删除
  const handleDelete = async (entry: KnowledgeEntry) => {
    const success = await storage.deleteKnowledgeEntry(entry)
    if (success) {
      message.success('已删除')
      setDrawerOpen(false)
      loadData()
    } else {
      message.error('删除失败')
    }
  }

  // 查看详情
  const handleViewDetail = async (entry: KnowledgeEntry) => {
    setDetailEntry(entry)
    setDrawerOpen(true)
    
    // 标记为已读
    if (entry.isNew) {
      const updatedEntry = { ...entry, isNew: false }
      await storage.saveKnowledgeEntry(updatedEntry)
      // 更新本地状态
      setEntries(prev => prev.map(e => e.id === entry.id ? updatedEntry : e))
    }
  }

  // 严重程度颜色
  const getSeverityColor = (severity?: string) => {
    const map: Record<string, string> = {
      critical: '#ff4d4f',
      major: '#fa8c16',
      minor: '#1677ff',
      trivial: '#8c8c8c',
    }
    return map[severity || ''] || ''
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>知识库</Title>
          <Text type="secondary">所有项目类型的开发经验和复用资料</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加知识
        </Button>
      </div>

      {/* ====== 大类别：项目类型 ====== */}
      <div className={styles.typeSection}>
        <div className={styles.sectionLabel}>项目类型</div>
        <div className={styles.typeTabs}>
          <div 
            className={`${styles.typeTab} ${selectedType === 'all' ? `${styles.typeTabActive} ${styles.typeTabActiveAll}` : ''}`}
            onClick={() => { setSelectedType('all'); setSelectedCategory('all') }}
          >
            <span className={styles.typeIcon}>📋</span>
            <span className={styles.typeLabel}>全部</span>
            <span className={styles.typeCount}>{typeStats.all || 0}</span>
          </div>
          {PROJECT_TYPES.map(type => (
            <div 
              key={type.id}
              className={`${styles.typeTab} ${selectedType === type.id ? styles.typeTabActive : ''}`}
              style={selectedType === type.id 
                ? { background: type.color, borderColor: type.color } 
                : { borderLeftColor: type.color, borderLeftWidth: 3 }
              }
              onClick={() => { setSelectedType(type.id); setSelectedCategory('all') }}
            >
              <span className={styles.typeIcon}>{getProjectTypeIcon(type.id, type.icon)}</span>
              <span className={styles.typeLabel}>{type.name}</span>
              <span className={styles.typeCount}>{typeStats[type.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 知识分类：固定 4 类 */}
      <div className={styles.categorySection}>
        <div className={styles.sectionLabel}>知识分类</div>
        <div className={styles.categoryBar}>
          <span
            className={`${styles.categoryTag} ${selectedCategory === 'all' ? styles.categoryTagActive : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            全部 {categoryStats.all || 0}
          </span>
          {FIXED_KNOWLEDGE_CATEGORIES.map(cat => (
            <span
              key={cat.id}
              className={`${styles.categoryTag} ${selectedCategory === cat.id ? styles.categoryTagActive : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.icon} {cat.name}
              <span className={styles.categoryCount}>{categoryStats[cat.id] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 搜索栏 */}
      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索知识条目..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
        <Text type="secondary">
          共 {filteredEntries.length} 条
        </Text>
      </div>

      {/* 知识卡片网格 */}
      {filteredEntries.length > 0 ? (
        <div className={styles.cardGrid} key={`grid-${selectedType}-${selectedCategory}`}>
          {filteredEntries.map((entry) => {
            const typeConfig = getTypeConfig(entry.projectType)
            return (
              <Card
                key={entry.id}
                className={styles.knowledgeCard}
                bodyStyle={{ padding: 16 }}
                onClick={() => handleViewDetail(entry)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    {entry.isNew && (
                      <span className={styles.unreadDot} title="未读" />
                    )}
                    {entry.title}
                  </div>
                  <div className={styles.cardBadges}>
                    <span 
                      className={styles.typeBadge}
                      style={{ backgroundColor: typeConfig?.color || '#555' }}
                    >
                      {getProjectTypeIcon(entry.projectType, typeConfig?.icon || '')} {typeConfig?.name}
                    </span>
                    {entry.category && (
                      <span className={styles.categoryBadge} title="笔记标签（仅展示）">
                        {getCategoryIcon(entry.projectType, entry.category)} {getCategoryName(entry.projectType, entry.category)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  {getPreview(entry.content)}
                </div>
                
                <div className={styles.cardFooter}>
                  <div className={styles.cardTags}>
                    {(entry.tags || []).slice(0, 4).map(tag => (
                      <span key={tag} className={styles.cardTag}>{tag}</span>
                    ))}
                    {(entry.tags?.length || 0) > 4 && (
                      <span className={styles.cardTag}>+{(entry.tags?.length || 0) - 4}</span>
                    )}
                  </div>
                  <span className={styles.cardDate}>{formatDate(entry.updatedAt || '')}</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            {selectedType !== 'all' 
              ? getProjectTypeIcon(selectedType, getTypeConfig(selectedType)?.icon || '📚', 48)
              : '📚'
            }
          </div>
          <Empty 
            description={
              searchQuery 
                ? `没有找到匹配 "${searchQuery}" 的结果` 
                : selectedType !== 'all'
                  ? `暂无${getTypeConfig(selectedType)?.name || ''}知识条目`
                  : '知识库为空，点击"添加知识"开始积累'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          {!searchQuery && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginTop: 16 }}>
              添加第一条知识
            </Button>
          )}
        </div>
      )}

      {/* 详情抽屉 */}
      <Drawer
        title={null}
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
        extra={
          <div className={styles.actionButtons}>
            <Button 
              icon={<EditOutlined />} 
              onClick={() => detailEntry && handleEdit(detailEntry)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除？"
              onConfirm={() => detailEntry && handleDelete(detailEntry)}
            >
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        }
      >
        {detailEntry && (
          <>
            <Title level={4} style={{ color: '#e0e0e0', marginBottom: 8 }}>{detailEntry.title}</Title>
            
            <div className={styles.detailHeader}>
              {(() => {
                const tc = getTypeConfig(detailEntry.projectType)
                return tc ? (
                  <Tag color={tc.color}>{tc.icon} {tc.name}</Tag>
                ) : null
              })()}
              {detailEntry.category && (
                <Tag>{getCategoryIcon(detailEntry.projectType, detailEntry.category)} {getCategoryName(detailEntry.projectType, detailEntry.category)}</Tag>
              )}
              {detailEntry.severity && (
                <Tag color={getSeverityColor(detailEntry.severity)}>{detailEntry.severity}</Tag>
              )}
              {(detailEntry.tags || []).map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            
            <div className={styles.detailContent}>
              <pre className={styles.detailPre}>
                {detailEntry.content}
              </pre>
            </div>
            
            {/* 所属项目标签 */}
            {(detailEntry.projectName || detailEntry.projectPath) && (
              <div className={styles.linkedProject}>
                <FolderOutlined style={{ marginRight: 8, fontSize: 15 }} />
                <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>来自项目</Text>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 16px', fontWeight: 600, borderRadius: 6 }}>
                  {detailEntry.projectName || detailEntry.projectPath?.split('/').pop() || '未知项目'}
                </Tag>
              </div>
            )}
            
            <div className={styles.detailMeta}>
              <Text type="secondary">
                创建: {formatDate(detailEntry.createdAt)} | 
                更新: {formatDate(detailEntry.updatedAt)}
              </Text>
            </div>
          </>
        )}
      </Drawer>

      {/* 新建/编辑模态框 */}
      <Modal
        title={editingEntry ? '编辑知识条目' : '添加知识条目'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item 
              name="projectType" 
              label="项目类型" 
              rules={[{ required: true }]}
              style={{ flex: 1 }}
            >
              <Select onChange={(v: ProjectType) => {
                setFormType(v)
                const cats = KNOWLEDGE_CATEGORIES[v]
                if (cats && cats.length > 0) {
                  form.setFieldsValue({ category: cats[0].id })
                }
              }}>
                {PROJECT_TYPES.map(type => (
                  <Select.Option key={type.id} value={type.id}>
                    {getProjectTypeIcon(type.id, type.icon)} {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item 
              name="category" 
              label="知识分类（4 类）" 
              rules={[{ required: true, message: '请选择分类' }]}
              style={{ flex: 1 }}
            >
              <Select>
                {FIXED_KNOWLEDGE_CATEGORIES.map(cat => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item 
            name="title" 
            label="标题" 
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="知识条目标题" />
          </Form.Item>
          
          <Form.Item name="content" label="内容 (支持 Markdown)">
            <TextArea rows={10} placeholder="详细内容..." />
          </Form.Item>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="tags" label="标签" style={{ flex: 1 }}>
              <Input placeholder="用逗号分隔，如: ESP32, LVGL, SPI" />
            </Form.Item>
            
            <Form.Item name="severity" label="重要程度" style={{ width: 150 }}>
              <Select allowClear placeholder="选择">
                <Select.Option value="critical">严重</Select.Option>
                <Select.Option value="major">重要</Select.Option>
                <Select.Option value="minor">一般</Select.Option>
                <Select.Option value="trivial">轻微</Select.Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
