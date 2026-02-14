import React, { useState, useEffect } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, Popconfirm, message, Row, Col
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  CodeOutlined, CopyOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import { CodeBlock } from '../../components/CodeBlock'
import type { CodeSnippet, SnippetCategory, Platform, Peripheral } from '../../types'
import styles from './Snippets.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const categoryOptions: { label: string; value: SnippetCategory; color: string }[] = [
  { label: '驱动代码', value: 'driver', color: 'blue' },
  { label: '初始化', value: 'init', color: 'green' },
  { label: '算法', value: 'algorithm', color: 'purple' },
  { label: '配置', value: 'config', color: 'orange' },
  { label: '协议', value: 'protocol', color: 'cyan' },
  { label: '中间件', value: 'middleware', color: 'magenta' },
  { label: '工具', value: 'utility', color: 'gold' },
  { label: '模板', value: 'template', color: 'lime' },
]

const languageOptions = [
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'MicroPython', value: 'python' },
  { label: 'Shell', value: 'bash' },
  { label: 'CMake', value: 'cmake' },
  { label: 'Kconfig', value: 'kconfig' },
]

export function Snippets() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([])
  const [filteredSnippets, setFilteredSnippets] = useState<CodeSnippet[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null)
  const [viewingSnippet, setViewingSnippet] = useState<CodeSnippet | null>(null)
  const [form] = Form.useForm()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [peripherals, setPeripherals] = useState<Peripheral[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterSnippets()
  }, [snippets, searchQuery, selectedCategory])

  const loadData = async () => {
    const [snippetList, platformList, peripheralList] = await Promise.all([
      storage.listSnippets(),
      storage.listPlatforms(),
      storage.listPeripherals()
    ])
    setSnippets(snippetList)
    setPlatforms(platformList)
    setPeripherals(peripheralList)
  }

  const filterSnippets = () => {
    let filtered = [...snippets]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    if (selectedCategory) {
      filtered = filtered.filter(s => s.category === selectedCategory)
    }
    setFilteredSnippets(filtered)
  }

  const handleAdd = () => {
    setEditingSnippet(null)
    form.resetFields()
    form.setFieldsValue({ language: 'c' })
    setModalOpen(true)
  }

  const handleEdit = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet)
    form.setFieldsValue({
      name: snippet.name,
      category: snippet.category,
      language: snippet.language,
      description: snippet.description,
      code: snippet.code,
      usage: snippet.usage,
      dependencies: snippet.dependencies,
      platformIds: snippet.platformIds,
      peripheralIds: snippet.peripheralIds,
      tags: snippet.tags
    })
    setModalOpen(true)
  }

  const handleView = (snippet: CodeSnippet) => {
    setViewingSnippet(snippet)
    setViewModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.deleteSnippet(id)
    message.success('删除成功')
    loadData()
  }

  const handleSubmit = async (values: any) => {
    const now = new Date().toISOString()
    
    const snippetData: CodeSnippet = {
      id: editingSnippet?.id || uuidv4(),
      name: values.name,
      category: values.category,
      language: values.language,
      description: values.description,
      code: values.code,
      usage: values.usage,
      dependencies: values.dependencies || [],
      platformIds: values.platformIds || [],
      peripheralIds: values.peripheralIds || [],
      tags: values.tags || [],
      createdAt: editingSnippet?.createdAt || now,
      updatedAt: now
    }

    await storage.saveSnippet(snippetData)
    message.success(editingSnippet ? '更新成功' : '添加成功')
    setModalOpen(false)
    loadData()
  }

  const getCategoryInfo = (category: string) => {
    return categoryOptions.find(c => c.value === category) || { label: category, color: 'default' }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          <CodeOutlined style={{ marginRight: 12 }} />
          代码片段
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加代码
        </Button>
      </div>

      <div className={styles.filters}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索代码片段..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
        <Select
          placeholder="按分类筛选"
          value={selectedCategory}
          onChange={setSelectedCategory}
          options={categoryOptions}
          className={styles.categoryFilter}
          allowClear
        />
      </div>

      <div className={styles.categoryTags}>
        {categoryOptions.map(cat => {
          const count = snippets.filter(s => s.category === cat.value).length
          return count > 0 ? (
            <Tag 
              key={cat.value}
              color={selectedCategory === cat.value ? cat.color : 'default'}
              className={styles.categoryTag}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            >
              {cat.label} ({count})
            </Tag>
          ) : null
        })}
      </div>

      <div className={styles.stats}>
        <Text type="secondary">共 {filteredSnippets.length} 个代码片段</Text>
      </div>

      {filteredSnippets.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredSnippets.map(snippet => (
            <Col xs={24} md={12} lg={8} key={snippet.id}>
              <Card 
                className={styles.snippetCard}
                actions={[
                  <Button type="text" icon={<CopyOutlined />} onClick={() => handleView(snippet)}>
                    查看
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(snippet)}>
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定删除？"
                    onConfirm={() => handleDelete(snippet.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <Text strong className={styles.snippetName}>{snippet.name}</Text>
                    <Tag color={getCategoryInfo(snippet.category).color}>
                      {getCategoryInfo(snippet.category).label}
                    </Tag>
                  </div>
                  
                  <Paragraph className={styles.description} ellipsis={{ rows: 2 }}>
                    {snippet.description}
                  </Paragraph>
                  
                  <div className={styles.cardMeta}>
                    <Tag>{snippet.language.toUpperCase()}</Tag>
                    <Text type="secondary">{snippet.code.split('\n').length} 行</Text>
                  </div>
                  
                  {snippet.tags.length > 0 && (
                    <div className={styles.tags}>
                      {snippet.tags.slice(0, 3).map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无代码片段" className={styles.empty}>
          <Button type="primary" onClick={handleAdd}>添加第一个代码片段</Button>
        </Empty>
      )}

      {/* 编辑模态框 */}
      <Modal
        title={editingSnippet ? '编辑代码片段' : '添加代码片段'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input placeholder="如 QMI8658 IMU 初始化" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="category" label="分类" rules={[{ required: true }]}>
                <Select options={categoryOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="language" label="语言" rules={[{ required: true }]}>
                <Select options={languageOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="简要描述这段代码的功能" />
          </Form.Item>

          <Form.Item name="code" label="代码" rules={[{ required: true }]}>
            <TextArea rows={12} placeholder="粘贴代码" className={styles.codeInput} />
          </Form.Item>

          <Form.Item name="usage" label="使用说明">
            <TextArea rows={2} placeholder="如何使用这段代码" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="platformIds" label="适用平台">
                <Select
                  mode="multiple"
                  placeholder="选择适用的平台"
                  options={platforms.map(p => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="peripheralIds" label="相关外设">
                <Select
                  mode="multiple"
                  placeholder="选择相关的外设"
                  options={peripherals.map(p => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dependencies" label="依赖">
            <Select mode="tags" placeholder="添加依赖库或组件" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>

          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingSnippet ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看模态框 */}
      <Modal
        title={viewingSnippet?.name}
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={null}
        width={900}
      >
        {viewingSnippet && (
          <div>
            <Paragraph>{viewingSnippet.description}</Paragraph>
            <div style={{ marginBottom: 16 }}>
              <Tag color={getCategoryInfo(viewingSnippet.category).color}>
                {getCategoryInfo(viewingSnippet.category).label}
              </Tag>
              {viewingSnippet.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
            </div>
            <CodeBlock
              code={viewingSnippet.code}
              language={viewingSnippet.language}
              height={400}
            />
            {viewingSnippet.usage && (
              <div style={{ marginTop: 16 }}>
                <Text strong>使用说明：</Text>
                <Paragraph>{viewingSnippet.usage}</Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
