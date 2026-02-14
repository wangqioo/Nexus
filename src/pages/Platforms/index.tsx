import React, { useState, useEffect } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, Popconfirm, message, Row, Col, Descriptions
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  CloudServerOutlined, EyeOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import { CHIP_PRESETS, FRAMEWORK_PRESETS } from '../../types'
import type { Platform } from '../../types'
import styles from './Platforms.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

export function Platforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [filteredPlatforms, setFilteredPlatforms] = useState<Platform[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [viewingPlatform, setViewingPlatform] = useState<Platform | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadPlatforms()
  }, [])

  useEffect(() => {
    filterPlatforms()
  }, [platforms, searchQuery])

  const loadPlatforms = async () => {
    const list = await storage.listPlatforms()
    setPlatforms(list)
  }

  const filterPlatforms = () => {
    let filtered = [...platforms]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.chip.name.toLowerCase().includes(query) ||
        p.chip.manufacturer.toLowerCase().includes(query) ||
        p.framework.name.toLowerCase().includes(query)
      )
    }
    setFilteredPlatforms(filtered)
  }

  const handleAdd = () => {
    setEditingPlatform(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform)
    form.setFieldsValue({
      chipName: platform.chip.name,
      chipManufacturer: platform.chip.manufacturer,
      chipCore: platform.chip.core,
      chipFeatures: platform.chip.features,
      frameworkName: platform.framework.name,
      frameworkVersion: platform.framework.version,
      buildSystem: platform.framework.buildSystem,
      compiler: platform.toolchain.compiler,
      initScript: platform.toolchain.initScript,
      buildCommand: platform.toolchain.buildCommand,
      flashCommand: platform.toolchain.flashCommand,
      notes: platform.notes
    })
    setModalOpen(true)
  }

  const handleView = (platform: Platform) => {
    setViewingPlatform(platform)
    setDetailModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.deletePlatform(id)
    message.success('删除成功')
    loadPlatforms()
  }

  const handleChipSelect = (chipName: string) => {
    const preset = CHIP_PRESETS.find(c => c.name === chipName)
    if (preset) {
      form.setFieldsValue({
        chipName: preset.name,
        chipManufacturer: preset.manufacturer,
        chipCore: preset.core
      })
    }
  }

  const handleFrameworkSelect = (frameworkName: string) => {
    const preset = FRAMEWORK_PRESETS.find(f => f.name === frameworkName)
    if (preset) {
      form.setFieldsValue({
        frameworkName: preset.name,
        buildSystem: preset.buildSystem
      })
    }
  }

  const handleSubmit = async (values: any) => {
    const now = new Date().toISOString()
    
    const platformData: Platform = {
      id: editingPlatform?.id || uuidv4(),
      name: `${values.chipName} (${values.frameworkName})`,
      chip: {
        name: values.chipName,
        manufacturer: values.chipManufacturer,
        core: values.chipCore,
        features: values.chipFeatures || []
      },
      framework: {
        name: values.frameworkName,
        version: values.frameworkVersion,
        buildSystem: values.buildSystem,
        configFiles: [...(FRAMEWORK_PRESETS.find(f => f.name === values.frameworkName)?.configFiles || [])]
      },
      toolchain: {
        compiler: values.compiler || '',
        initScript: values.initScript,
        buildCommand: values.buildCommand,
        flashCommand: values.flashCommand
      },
      notes: values.notes,
      createdAt: editingPlatform?.createdAt || now,
      updatedAt: now
    }

    await storage.savePlatform(platformData)
    message.success(editingPlatform ? '更新成功' : '添加成功')
    setModalOpen(false)
    loadPlatforms()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          <CloudServerOutlined style={{ marginRight: 12 }} />
          平台配置
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加平台
        </Button>
      </div>

      <div className={styles.filters}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索芯片、厂商、框架..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
      </div>

      <div className={styles.stats}>
        <Text type="secondary">共 {filteredPlatforms.length} 个平台配置</Text>
      </div>

      {filteredPlatforms.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredPlatforms.map(platform => (
            <Col xs={24} sm={12} lg={8} key={platform.id}>
              <Card 
                className={styles.platformCard}
                actions={[
                  <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(platform)}>
                    详情
                  </Button>,
                  <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(platform)}>
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定删除这个平台吗？"
                    onConfirm={() => handleDelete(platform.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                ]}
              >
                <div className={styles.cardContent}>
                  <div className={styles.chipInfo}>
                    <Title level={4} className={styles.chipName}>{platform.chip.name}</Title>
                    <Text type="secondary">{platform.chip.manufacturer}</Text>
                  </div>
                  
                  <div className={styles.tags}>
                    <Tag color="blue">{platform.framework.name}</Tag>
                    {platform.framework.version && (
                      <Tag color="cyan">v{platform.framework.version}</Tag>
                    )}
                  </div>
                  
                  <Text type="secondary" className={styles.core}>
                    {platform.chip.core}
                  </Text>
                  
                  {platform.chip.features && platform.chip.features.length > 0 && (
                    <div className={styles.features}>
                      {platform.chip.features.slice(0, 4).map(f => (
                        <Tag key={f}>{f}</Tag>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无平台配置" className={styles.empty}>
          <Button type="primary" onClick={handleAdd}>添加第一个平台</Button>
        </Empty>
      )}

      {/* 编辑模态框 */}
      <Modal
        title={editingPlatform ? '编辑平台' : '添加平台'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Title level={5}>芯片信息</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chipName" label="芯片型号" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="选择或输入芯片型号"
                  options={CHIP_PRESETS.map(c => ({ label: `${c.name} (${c.manufacturer})`, value: c.name }))}
                  onChange={handleChipSelect}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="chipManufacturer" label="厂商" rules={[{ required: true }]}>
                <Input placeholder="如 Espressif" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="chipCore" label="内核" rules={[{ required: true }]}>
            <Input placeholder="如 Xtensa LX7 Dual-Core" />
          </Form.Item>
          
          <Form.Item name="chipFeatures" label="特性">
            <Select mode="tags" placeholder="添加特性，如 WiFi, BLE, USB-OTG" />
          </Form.Item>

          <Title level={5} style={{ marginTop: 16 }}>框架信息</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="frameworkName" label="框架" rules={[{ required: true }]}>
                <Select
                  placeholder="选择框架"
                  options={FRAMEWORK_PRESETS.map(f => ({ label: f.name, value: f.name }))}
                  onChange={handleFrameworkSelect}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="frameworkVersion" label="版本">
                <Input placeholder="如 5.3" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="buildSystem" label="构建系统">
                <Input placeholder="如 CMake" />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ marginTop: 16 }}>工具链</Title>
          <Form.Item name="compiler" label="编译器">
            <Input placeholder="如 xtensa-esp32s3-elf-gcc" />
          </Form.Item>
          
          <Form.Item name="initScript" label="初始化脚本">
            <Input placeholder="如 . $IDF_PATH/export.sh" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="buildCommand" label="编译命令">
                <Input placeholder="如 idf.py build" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="flashCommand" label="烧录命令">
                <Input placeholder="如 idf.py flash" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="其他备注信息" />
          </Form.Item>

          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingPlatform ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title={viewingPlatform?.name}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {viewingPlatform && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="芯片" span={2}>
              <strong>{viewingPlatform.chip.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="厂商">{viewingPlatform.chip.manufacturer}</Descriptions.Item>
            <Descriptions.Item label="内核">{viewingPlatform.chip.core}</Descriptions.Item>
            <Descriptions.Item label="框架">{viewingPlatform.framework.name}</Descriptions.Item>
            <Descriptions.Item label="版本">{viewingPlatform.framework.version || '-'}</Descriptions.Item>
            <Descriptions.Item label="构建系统" span={2}>
              {viewingPlatform.framework.buildSystem}
            </Descriptions.Item>
            {viewingPlatform.toolchain.initScript && (
              <Descriptions.Item label="初始化" span={2}>
                <code>{viewingPlatform.toolchain.initScript}</code>
              </Descriptions.Item>
            )}
            {viewingPlatform.toolchain.buildCommand && (
              <Descriptions.Item label="编译命令" span={2}>
                <code>{viewingPlatform.toolchain.buildCommand}</code>
              </Descriptions.Item>
            )}
            {viewingPlatform.toolchain.flashCommand && (
              <Descriptions.Item label="烧录命令" span={2}>
                <code>{viewingPlatform.toolchain.flashCommand}</code>
              </Descriptions.Item>
            )}
            {viewingPlatform.chip.features && viewingPlatform.chip.features.length > 0 && (
              <Descriptions.Item label="特性" span={2}>
                {viewingPlatform.chip.features.map(f => <Tag key={f}>{f}</Tag>)}
              </Descriptions.Item>
            )}
            {viewingPlatform.notes && (
              <Descriptions.Item label="备注" span={2}>
                {viewingPlatform.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
