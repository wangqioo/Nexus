import React, { useState, useEffect } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, Popconfirm, message, Row, Col
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  BugOutlined, ExclamationCircleOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import type { DebugExperience, Platform, Peripheral } from '../../types'
import styles from './Debug.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const severityOptions = [
  { label: '严重', value: 'critical', color: 'red' },
  { label: '重要', value: 'major', color: 'orange' },
  { label: '一般', value: 'minor', color: 'blue' },
  { label: '轻微', value: 'trivial', color: 'default' },
]

export function Debug() {
  const [experiences, setExperiences] = useState<DebugExperience[]>([])
  const [filteredExperiences, setFilteredExperiences] = useState<DebugExperience[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [editingExp, setEditingExp] = useState<DebugExperience | null>(null)
  const [viewingExp, setViewingExp] = useState<DebugExperience | null>(null)
  const [form] = Form.useForm()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [peripherals, setPeripherals] = useState<Peripheral[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterExperiences()
  }, [experiences, searchQuery, selectedSeverity])

  const loadData = async () => {
    const [expList, platformList, peripheralList] = await Promise.all([
      storage.listDebugExperiences(),
      storage.listPlatforms(),
      storage.listPeripherals()
    ])
    setExperiences(expList)
    setPlatforms(platformList)
    setPeripherals(peripheralList)
  }

  const filterExperiences = () => {
    let filtered = [...experiences]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e => 
        e.title.toLowerCase().includes(query) ||
        e.symptom.toLowerCase().includes(query) ||
        e.solution.toLowerCase().includes(query) ||
        e.rootCause.toLowerCase().includes(query) ||
        e.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    if (selectedSeverity) {
      filtered = filtered.filter(e => e.severity === selectedSeverity)
    }
    setFilteredExperiences(filtered)
  }

  const handleAdd = () => {
    setEditingExp(null)
    form.resetFields()
    form.setFieldsValue({ severity: 'minor' })
    setModalOpen(true)
  }

  const handleEdit = (exp: DebugExperience) => {
    setEditingExp(exp)
    form.setFieldsValue({
      title: exp.title,
      platformId: exp.environment.platformId,
      peripheralIds: exp.environment.peripheralIds,
      frameworkVersion: exp.environment.frameworkVersion,
      symptom: exp.symptom,
      errorLog: exp.errorLog,
      rootCause: exp.rootCause,
      solution: exp.solution,
      solutionCode: exp.solutionCode,
      severity: exp.severity,
      tags: exp.tags
    })
    setModalOpen(true)
  }

  const handleView = (exp: DebugExperience) => {
    setViewingExp(exp)
    setDetailModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.deleteDebugExperience(id)
    message.success('删除成功')
    loadData()
  }

  const handleSubmit = async (values: any) => {
    const now = new Date().toISOString()
    
    const expData: DebugExperience = {
      id: editingExp?.id || uuidv4(),
      title: values.title,
      environment: {
        platformId: values.platformId,
        peripheralIds: values.peripheralIds,
        frameworkVersion: values.frameworkVersion
      },
      symptom: values.symptom,
      errorLog: values.errorLog,
      rootCause: values.rootCause,
      solution: values.solution,
      solutionCode: values.solutionCode,
      severity: values.severity,
      tags: values.tags || [],
      createdAt: editingExp?.createdAt || now,
      updatedAt: now
    }

    await storage.saveDebugExperience(expData)
    message.success(editingExp ? '更新成功' : '添加成功')
    setModalOpen(false)
    loadData()
  }

  const getSeverityInfo = (severity: string) => {
    return severityOptions.find(s => s.value === severity) || { label: severity, color: 'default' }
  }

  const getPlatformName = (id?: string) => {
    if (!id) return null
    return platforms.find(p => p.id === id)?.name
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          <BugOutlined style={{ marginRight: 12 }} />
          调试经验
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加经验
        </Button>
      </div>

      <div className={styles.filters}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索问题、解决方案..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
        <Select
          placeholder="按严重程度"
          value={selectedSeverity}
          onChange={setSelectedSeverity}
          options={severityOptions}
          className={styles.severityFilter}
          allowClear
        />
      </div>

      <div className={styles.severityTags}>
        {severityOptions.map(sev => {
          const count = experiences.filter(e => e.severity === sev.value).length
          return count > 0 ? (
            <Tag 
              key={sev.value}
              color={selectedSeverity === sev.value ? sev.color : 'default'}
              className={styles.severityTag}
              onClick={() => setSelectedSeverity(selectedSeverity === sev.value ? null : sev.value)}
            >
              {sev.label} ({count})
            </Tag>
          ) : null
        })}
      </div>

      <div className={styles.stats}>
        <Text type="secondary">共 {filteredExperiences.length} 条调试经验</Text>
      </div>

      {filteredExperiences.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredExperiences.map(exp => (
            <Col xs={24} lg={12} key={exp.id}>
              <Card 
                className={styles.expCard}
                onClick={() => handleView(exp)}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <Tag color={getSeverityInfo(exp.severity).color}>
                      {getSeverityInfo(exp.severity).label}
                    </Tag>
                    <Title level={5} className={styles.expTitle}>{exp.title}</Title>
                  </div>
                  
                  {exp.environment.platformId && (
                    <Tag color="blue" className={styles.platformTag}>
                      {getPlatformName(exp.environment.platformId)}
                    </Tag>
                  )}
                  
                  <div className={styles.section}>
                    <Text type="secondary" className={styles.sectionLabel}>
                      <ExclamationCircleOutlined /> 现象
                    </Text>
                    <Paragraph className={styles.sectionContent} ellipsis={{ rows: 2 }}>
                      {exp.symptom}
                    </Paragraph>
                  </div>

                  <div className={styles.section}>
                    <Text type="secondary" className={styles.sectionLabel}>✓ 解决方案</Text>
                    <Paragraph className={styles.sectionContent} ellipsis={{ rows: 2 }}>
                      {exp.solution}
                    </Paragraph>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.tags}>
                      {exp.tags.slice(0, 3).map(tag => <Tag key={tag}>{tag}</Tag>)}
                    </div>
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleEdit(exp) }}
                      />
                      <Popconfirm
                        title="确定删除？"
                        onConfirm={(e) => { e?.stopPropagation(); handleDelete(exp.id) }}
                      >
                        <Button 
                          type="text" 
                          size="small" 
                          danger 
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无调试经验" className={styles.empty}>
          <Button type="primary" onClick={handleAdd}>记录第一条经验</Button>
        </Empty>
      )}

      {/* 编辑模态框 */}
      <Modal
        title={editingExp ? '编辑调试经验' : '记录调试经验'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={18}>
              <Form.Item name="title" label="问题标题" rules={[{ required: true }]}>
                <Input placeholder="简要描述问题" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="severity" label="严重程度" rules={[{ required: true }]}>
                <Select options={severityOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5}>环境信息</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="platformId" label="平台">
                <Select
                  placeholder="选择平台"
                  options={platforms.map(p => ({ label: p.name, value: p.id }))}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="peripheralIds" label="涉及外设">
                <Select
                  mode="multiple"
                  placeholder="选择外设"
                  options={peripherals.map(p => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="frameworkVersion" label="框架版本">
                <Input placeholder="如 ESP-IDF 5.3" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="symptom" label="问题现象" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="详细描述发生了什么" />
          </Form.Item>

          <Form.Item name="errorLog" label="错误日志">
            <TextArea rows={3} placeholder="相关的错误输出（可选）" className={styles.codeInput} />
          </Form.Item>

          <Form.Item name="rootCause" label="根本原因" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="为什么会发生这个问题" />
          </Form.Item>

          <Form.Item name="solution" label="解决方案" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="如何解决" />
          </Form.Item>

          <Form.Item name="solutionCode" label="修复代码（可选）">
            <TextArea rows={4} placeholder="关键的修复代码" className={styles.codeInput} />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>

          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingExp ? '更新' : '保存'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title={
          <Space>
            <Tag color={getSeverityInfo(viewingExp?.severity || '').color}>
              {getSeverityInfo(viewingExp?.severity || '').label}
            </Tag>
            {viewingExp?.title}
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={800}
      >
        {viewingExp && (
          <div className={styles.detailContent}>
            {viewingExp.environment.platformId && (
              <div className={styles.envInfo}>
                <Tag color="blue">{getPlatformName(viewingExp.environment.platformId)}</Tag>
                {viewingExp.environment.frameworkVersion && (
                  <Tag>{viewingExp.environment.frameworkVersion}</Tag>
                )}
              </div>
            )}

            <div className={styles.detailSection}>
              <Title level={5}>问题现象</Title>
              <Paragraph>{viewingExp.symptom}</Paragraph>
            </div>

            {viewingExp.errorLog && (
              <div className={styles.detailSection}>
                <Title level={5}>错误日志</Title>
                <pre className={styles.errorLog}>{viewingExp.errorLog}</pre>
              </div>
            )}

            <div className={styles.detailSection}>
              <Title level={5}>根本原因</Title>
              <Paragraph>{viewingExp.rootCause}</Paragraph>
            </div>

            <div className={styles.detailSection}>
              <Title level={5}>解决方案</Title>
              <Paragraph>{viewingExp.solution}</Paragraph>
            </div>

            {viewingExp.solutionCode && (
              <div className={styles.detailSection}>
                <Title level={5}>修复代码</Title>
                <pre className={styles.solutionCode}>{viewingExp.solutionCode}</pre>
              </div>
            )}

            {viewingExp.tags.length > 0 && (
              <div className={styles.detailTags}>
                {viewingExp.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
