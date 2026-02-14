import React, { useState, useEffect } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, Popconfirm, message, Row, Col, List
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  SettingOutlined, FileAddOutlined, CopyOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import type { ConfigTemplate, ConfigFile, Platform } from '../../types'
import styles from './Configs.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export function Configs() {
  const [configs, setConfigs] = useState<ConfigTemplate[]>([])
  const [filteredConfigs, setFilteredConfigs] = useState<ConfigTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConfigTemplate | null>(null)
  const [viewingConfig, setViewingConfig] = useState<ConfigTemplate | null>(null)
  const [form] = Form.useForm()
  const [files, setFiles] = useState<ConfigFile[]>([])
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [fileForm] = Form.useForm()
  const [platforms, setPlatforms] = useState<Platform[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterConfigs()
  }, [configs, searchQuery])

  const loadData = async () => {
    const [configList, platformList] = await Promise.all([
      storage.listConfigTemplates(),
      storage.listPlatforms()
    ])
    setConfigs(configList)
    setPlatforms(platformList)
  }

  const filterConfigs = () => {
    let filtered = [...configs]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    setFilteredConfigs(filtered)
  }

  const handleAdd = () => {
    setEditingConfig(null)
    setFiles([])
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (config: ConfigTemplate) => {
    setEditingConfig(config)
    setFiles(config.files || [])
    form.setFieldsValue({
      name: config.name,
      description: config.description,
      platformId: config.platformId,
      tags: config.tags
    })
    setModalOpen(true)
  }

  const handleView = (config: ConfigTemplate) => {
    setViewingConfig(config)
    setViewModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.deleteConfigTemplate(id)
    message.success('删除成功')
    loadData()
  }

  const handleAddFile = () => {
    fileForm.resetFields()
    setFileModalOpen(true)
  }

  const handleFileSubmit = (values: any) => {
    setFiles([...files, { 
      filename: values.filename, 
      path: values.path,
      content: values.content,
      description: values.description
    }])
    setFileModalOpen(false)
  }

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async (values: any) => {
    const now = new Date().toISOString()
    
    const configData: ConfigTemplate = {
      id: editingConfig?.id || uuidv4(),
      name: values.name,
      description: values.description,
      platformId: values.platformId,
      files: files,
      tags: values.tags || [],
      createdAt: editingConfig?.createdAt || now,
      updatedAt: now
    }

    await storage.saveConfigTemplate(configData)
    message.success(editingConfig ? '更新成功' : '添加成功')
    setModalOpen(false)
    loadData()
  }

  const handleCopyFile = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }

  const getPlatformName = (id: string) => {
    return platforms.find(p => p.id === id)?.name || id
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          <SettingOutlined style={{ marginRight: 12 }} />
          配置模板
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加模板
        </Button>
      </div>

      <div className={styles.filters}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索配置模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
      </div>

      <div className={styles.stats}>
        <Text type="secondary">共 {filteredConfigs.length} 个配置模板</Text>
      </div>

      {filteredConfigs.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredConfigs.map(config => (
            <Col xs={24} sm={12} lg={8} key={config.id}>
              <Card 
                className={styles.configCard}
                actions={[
                  <Button type="text" icon={<CopyOutlined />} onClick={() => handleView(config)}>
                    查看
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(config)}>
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定删除？"
                    onConfirm={() => handleDelete(config.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}
              >
                <div className={styles.cardContent}>
                  <Title level={5} className={styles.configName}>{config.name}</Title>
                  
                  <Paragraph className={styles.description} ellipsis={{ rows: 2 }}>
                    {config.description}
                  </Paragraph>
                  
                  {config.platformId && (
                    <Tag color="blue">{getPlatformName(config.platformId)}</Tag>
                  )}
                  
                  <div className={styles.fileInfo}>
                    <Text type="secondary">{config.files.length} 个配置文件</Text>
                    <div className={styles.fileList}>
                      {config.files.slice(0, 3).map((f, i) => (
                        <Tag key={i}>{f.filename}</Tag>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无配置模板" className={styles.empty}>
          <Button type="primary" onClick={handleAdd}>创建第一个模板</Button>
        </Empty>
      )}

      {/* 编辑模态框 */}
      <Modal
        title={editingConfig ? '编辑配置模板' : '添加配置模板'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input placeholder="如 ESP32-S3 + ST7789 显示配置" />
          </Form.Item>

          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="这个配置模板的用途" />
          </Form.Item>

          <Form.Item name="platformId" label="适用平台">
            <Select
              placeholder="选择适用的平台"
              options={platforms.map(p => ({ label: p.name, value: p.id }))}
              allowClear
            />
          </Form.Item>

          <div className={styles.filesSection}>
            <div className={styles.filesSectionHeader}>
              <Text strong>配置文件</Text>
              <Button type="dashed" icon={<FileAddOutlined />} onClick={handleAddFile}>
                添加文件
              </Button>
            </div>
            
            {files.length > 0 ? (
              <List
                dataSource={files}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        onClick={() => handleRemoveFile(index)}
                      >
                        删除
                      </Button>
                    ]}
                  >
                    <div>
                      <code>{file.path ? `${file.path}/${file.filename}` : file.filename}</code>
                      {file.description && (
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          - {file.description}
                        </Text>
                      )}
                    </div>
                  </List.Item>
                )}
                className={styles.filesList}
              />
            ) : (
              <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>

          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingConfig ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加文件模态框 */}
      <Modal
        title="添加配置文件"
        open={fileModalOpen}
        onCancel={() => setFileModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={fileForm} layout="vertical" onFinish={handleFileSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="filename" label="文件名" rules={[{ required: true }]}>
                <Input placeholder="如 sdkconfig.defaults" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="path" label="路径（可选）">
                <Input placeholder="如 main" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="说明">
            <Input placeholder="这个文件的作用" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <TextArea rows={15} placeholder="配置文件内容" className={styles.codeInput} />
          </Form.Item>
          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setFileModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看模态框 */}
      <Modal
        title={viewingConfig?.name}
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={null}
        width={900}
      >
        {viewingConfig && (
          <div className={styles.viewContent}>
            <Paragraph>{viewingConfig.description}</Paragraph>
            {viewingConfig.platformId && (
              <Tag color="blue" style={{ marginBottom: 16 }}>
                {getPlatformName(viewingConfig.platformId)}
              </Tag>
            )}
            
            <Title level={5}>配置文件</Title>
            {viewingConfig.files.map((file, index) => (
              <div key={index} className={styles.fileBlock}>
                <div className={styles.fileHeader}>
                  <div>
                    <code>{file.path ? `${file.path}/${file.filename}` : file.filename}</code>
                    {file.description && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        - {file.description}
                      </Text>
                    )}
                  </div>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyFile(file.content)}
                  >
                    复制
                  </Button>
                </div>
                <pre className={styles.fileContent}>{file.content}</pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
