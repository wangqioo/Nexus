import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Typography, Input, Button, Card, Tag, Empty, Modal, Form,
  Select, Space, message, Drawer, Popconfirm
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, FolderOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { storage } from '../../services/storage'
import type { Note, ProjectType } from '../../types'
import { NOTE_CATEGORIES, PROJECT_TYPES } from '../../types'
import { getProjectTypeIcon } from '../../components/Icons'
import styles from './Notes.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

// 每个笔记分类的专属颜色
const CATEGORY_COLORS: Record<string, string> = {
  learning:  '#52c41a',  // 绿色 — 学习笔记
  summary:   '#1677ff',  // 蓝色 — 开发总结
  design:    '#722ed1',  // 紫色 — 方案设计
  issue:     '#fa8c16',  // 橙色 — 问题记录
  reference: '#13c2c2',  // 青色 — 参考手册
}

const getCategoryColor = (catId: string) => CATEGORY_COLORS[catId] || '#666'

export function Notes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // 筛选：按项目类型分类
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 详情抽屉
  const [detailNote, setDetailNote] = useState<Note | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 新建/编辑
  const [modalOpen, setModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadData()
  }, [])

  // 带 docId 进入时先刷新笔记列表（避免刚同步后跳转时列表未更新）
  const docIdFromUrl = searchParams.get('docId')
  useEffect(() => {
    if (docIdFromUrl) {
      loadData()
    }
  }, [docIdFromUrl])

  // 处理 URL 参数打开指定笔记（仅在加载完成后执行，避免用旧列表误判）
  useEffect(() => {
    const docId = searchParams.get('docId')
    if (!docId || loading) return

    // 查找匹配的笔记（多种匹配方式）
    const note = notes.find(n => {
      if (!n.id) return false
      if (n.id === docId) return true
      if (n.id.includes(docId) || docId.includes(n.id)) return true
      if (n.id.toLowerCase() === docId.toLowerCase()) return true
      return false
    })

    if (note) {
      setDetailNote(note)
      setDrawerOpen(true)
    } else {
      message.info('未找到对应的笔记，可能尚未同步')
    }
    setSearchParams({})
  }, [notes, searchParams, loading])

  const loadData = async () => {
    setLoading(true)
    try {
      const noteList = await storage.listNotes()
      setNotes(noteList)
    } catch (e) {
      console.error('Failed to load notes:', e)
    }
    setLoading(false)
  }

  const typeStats = useMemo(() => {
    const stats: Record<string, number> = { all: notes.length }
    for (const note of notes) {
      const t = note.projectType || 'unknown'
      stats[t] = (stats[t] || 0) + 1
    }
    return stats
  }, [notes])

  const filteredNotes = useMemo(() => {
    let filtered = [...notes]
    if (selectedProjectType !== 'all') {
      filtered = filtered.filter(n => (n.projectType || 'unknown') === selectedProjectType)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [notes, selectedProjectType, searchQuery])

  // 获取分类信息
  const getCategoryInfo = (catId: string) => {
    return NOTE_CATEGORIES.find(c => c.id === catId)
  }

  // 内容预览（去除 Markdown 标记）
  const getPreview = (content: string) => {
    return content
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/```[\s\S]*?```/g, '[代码]')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ')
      .replace(/\|[^\n]+\|/g, '')
      .replace(/---+/g, '')
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

  // 新建
  const handleAdd = () => {
    setEditingNote(null)
    form.resetFields()
    form.setFieldsValue({ category: 'learning' })
    setModalOpen(true)
  }

  // 编辑
  const handleEdit = (note: Note) => {
    setEditingNote(note)
    form.setFieldsValue({
      title: note.title,
      content: note.content,
      category: note.category || 'learning',
      tags: note.tags?.join(', ') || '',
    })
    setModalOpen(true)
    setDrawerOpen(false)
  }

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      const noteData: Note = {
        id: editingNote?.id || uuidv4(),
        title: values.title,
        content: values.content || '',
        category: values.category || 'learning',
        tags: values.tags
          ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.saveNote(noteData)
      message.success(editingNote ? '更新成功' : '添加成功')
      setModalOpen(false)
      loadData()
    } catch {
      // form validation error
    }
  }

  // 删除
  const handleDelete = async (note: Note) => {
    await storage.deleteNote(note.id)
    message.success('已删除')
    setDrawerOpen(false)
    loadData()
  }

  // 查看详情
  const handleViewDetail = async (note: Note) => {
    setDetailNote(note)
    setDrawerOpen(true)
    
    // 标记为已读
    if (note.isNew) {
      const updatedNote = { ...note, isNew: false }
      await storage.saveNote(updatedNote)
      // 更新本地状态
      setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n))
    }
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>笔记库</Title>
          <Text type="secondary">开发过程中的学习记录和总结</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建笔记
        </Button>
      </div>

      {/* ====== 按项目类型分类 ====== */}
      <div className={styles.typeSection}>
        <div className={styles.sectionLabel}>项目类型</div>
        <div className={styles.typeTabs}>
          <div
            className={`${styles.typeTab} ${selectedProjectType === 'all' ? `${styles.typeTabActive} ${styles.typeTabActiveAll}` : ''}`}
            onClick={() => setSelectedProjectType('all')}
          >
            <span className={styles.typeIcon}>📋</span>
            <span className={styles.typeLabel}>全部</span>
            <span className={styles.typeCount}>{typeStats.all || 0}</span>
          </div>
          {PROJECT_TYPES.map(type => (
            <div
              key={type.id}
              className={`${styles.typeTab} ${selectedProjectType === type.id ? styles.typeTabActive : ''}`}
              style={selectedProjectType === type.id
                ? { background: type.color, borderColor: type.color }
                : { borderLeftColor: type.color, borderLeftWidth: 3 }
              }
              onClick={() => setSelectedProjectType(type.id)}
            >
              <span className={styles.typeIcon}>{getProjectTypeIcon(type.id, type.icon)}</span>
              <span className={styles.typeLabel}>{type.name}</span>
              <span className={styles.typeCount}>{typeStats[type.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 搜索栏 */}
      <div className={styles.toolbar}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索笔记..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
        />
        <Text type="secondary">共 {filteredNotes.length} 篇</Text>
      </div>

      {/* ====== 卡片网格（与知识库一致） ====== */}
      {filteredNotes.length > 0 ? (
        <div className={styles.cardGrid}>
          {filteredNotes.map(note => {
            const typeId = note.projectType || 'unknown'
            const typeConfig = PROJECT_TYPES.find(t => t.id === typeId)
            const color = typeConfig?.color || '#666'
            const catId = note.category || 'learning'
            const catInfo = getCategoryInfo(catId)
            return (
              <Card
                key={note.id}
                className={styles.noteCard}
                styles={{ body: { padding: 16 } }}
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                onClick={() => handleViewDetail(note)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    {note.isNew && <span className={styles.unreadDot} title="未读" />}
                    {note.title}
                  </div>
                  <div className={styles.cardBadges}>
                    <span
                      className={styles.categoryBadge}
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {getProjectTypeIcon(typeId, typeConfig?.icon || '')} {typeConfig?.name || typeId}
                    </span>
                    {catInfo && (
                      <span className={styles.categoryBadge} style={{ marginLeft: 8, opacity: 0.9 }}>
                        {catInfo.icon} {catInfo.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardContent}>
                  {getPreview(note.content)}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.cardTags}>
                    {(note.tags || []).slice(0, 4).map(tag => (
                      <span key={tag} className={styles.cardTag}>{tag}</span>
                    ))}
                    {(note.tags?.length || 0) > 4 && (
                      <span className={styles.cardTag}>+{(note.tags?.length || 0) - 4}</span>
                    )}
                  </div>
                  <span className={styles.cardDate}>{formatDate(note.updatedAt)}</span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <Empty
            description={
              searchQuery
                ? `没有找到匹配 "${searchQuery}" 的结果`
                : selectedProjectType !== 'all'
                  ? `暂无${PROJECT_TYPES.find(t => t.id === selectedProjectType)?.name || ''}笔记`
                  : '笔记为空，点击"新建笔记"开始记录'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          {!searchQuery && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginTop: 16 }}>
              创建第一篇笔记
            </Button>
          )}
        </div>
      )}

      {/* ====== 详情抽屉（与知识库一致） ====== */}
      <Drawer
        title={null}
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={640}
        extra={
          <div className={styles.actionButtons}>
            <Button
              icon={<EditOutlined />}
              onClick={() => detailNote && handleEdit(detailNote)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除这篇笔记？"
              onConfirm={() => detailNote && handleDelete(detailNote)}
            >
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        }
      >
        {detailNote && (
          <>
            <Title level={4} style={{ color: '#e0e0e0', marginBottom: 8 }}>{detailNote.title}</Title>

            <div className={styles.detailHeader}>
              {detailNote.projectType && (() => {
                const tc = PROJECT_TYPES.find(t => t.id === detailNote!.projectType)
                return tc ? (
                  <Tag color={tc.color}>{getProjectTypeIcon(tc.id, tc.icon)} {tc.name}</Tag>
                ) : (
                  <Tag>{detailNote.projectType}</Tag>
                )
              })()}
              {(() => {
                const catId = detailNote.category || 'learning'
                const catInfo = getCategoryInfo(catId)
                return catInfo ? (
                  <Tag>{catInfo.icon} {catInfo.name}</Tag>
                ) : null
              })()}
              {(detailNote.tags || []).map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>

            <div className={styles.detailContent}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {detailNote.content}
              </ReactMarkdown>
            </div>

            {/* 所属项目标签 */}
            {(detailNote.projectName || detailNote.projectPath) && (
              <div className={styles.linkedProject}>
                <FolderOutlined style={{ marginRight: 8, color: '#1677ff', fontSize: 15 }} />
                <span style={{ color: '#888', fontSize: 12, marginRight: 8 }}>来自项目</span>
                <Tag color="blue" style={{ fontSize: 14, padding: '4px 16px', fontWeight: 600, borderRadius: 6 }}>
                  {detailNote.projectName || detailNote.projectPath?.split('/').pop() || '未知项目'}
                </Tag>
              </div>
            )}

            <div className={styles.detailMeta}>
              <Text type="secondary">
                创建: {formatDate(detailNote.createdAt)} |
                更新: {formatDate(detailNote.updatedAt)}
              </Text>
            </div>
          </>
        )}
      </Drawer>

      {/* ====== 新建/编辑模态框 ====== */}
      <Modal
        title={editingNote ? '编辑笔记' : '新建笔记'}
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
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入标题' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="笔记标题" />
            </Form.Item>
            <Form.Item name="category" label="分类" style={{ width: 180 }}>
              <Select>
                {NOTE_CATEGORIES.map(cat => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="content" label="内容（支持 Markdown）" rules={[{ required: true }]}>
            <TextArea rows={12} placeholder="写点什么..." />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Input placeholder="用逗号分隔，如: ESP32, 学习笔记, K230" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
