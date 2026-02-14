import React, { useState, useEffect } from 'react'
import { 
  Typography, Input, Button, Card, Tag, Empty, Modal, Form, 
  Select, Space, Popconfirm, message, Row, Col, Table, Tabs
} from 'antd'
import { 
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  UsbOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../../services/storage'
import { PERIPHERAL_PRESETS } from '../../types'
import type { Peripheral, PeripheralType, InterfaceType, WiringConfig } from '../../types'
import styles from './Peripherals.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

const peripheralTypes: { label: string; value: PeripheralType }[] = [
  { label: '显示', value: 'display' },
  { label: '传感器', value: 'sensor' },
  { label: '音频', value: 'audio' },
  { label: '摄像头', value: 'camera' },
  { label: '通信', value: 'communication' },
  { label: '存储', value: 'storage' },
  { label: '执行器', value: 'actuator' },
  { label: '输入', value: 'input' },
  { label: '电源', value: 'power' },
  { label: '其他', value: 'other' },
]

const interfaceTypes: { label: string; value: InterfaceType }[] = [
  { label: 'SPI', value: 'spi' },
  { label: 'I2C', value: 'i2c' },
  { label: 'UART', value: 'uart' },
  { label: 'I2S', value: 'i2s' },
  { label: 'RMT', value: 'rmt' },
  { label: 'MIPI DSI', value: 'mipi_dsi' },
  { label: 'MIPI CSI', value: 'mipi_csi' },
  { label: 'SDMMC', value: 'sdmmc' },
  { label: 'USB', value: 'usb' },
  { label: 'GPIO', value: 'gpio' },
  { label: 'PWM', value: 'pwm' },
  { label: 'ADC', value: 'adc' },
  { label: 'DAC', value: 'dac' },
  { label: '其他', value: 'other' },
]

export function Peripherals() {
  const [peripherals, setPeripherals] = useState<Peripheral[]>([])
  const [filteredPeripherals, setFilteredPeripherals] = useState<Peripheral[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPeripheral, setEditingPeripheral] = useState<Peripheral | null>(null)
  const [form] = Form.useForm()
  const [wiring, setWiring] = useState<WiringConfig[]>([])

  useEffect(() => {
    loadPeripherals()
  }, [])

  useEffect(() => {
    filterPeripherals()
  }, [peripherals, searchQuery, selectedType])

  const loadPeripherals = async () => {
    const list = await storage.listPeripherals()
    setPeripherals(list)
  }

  const filterPeripherals = () => {
    let filtered = [...peripherals]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.manufacturer?.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    if (selectedType) {
      filtered = filtered.filter(p => p.type === selectedType)
    }
    setFilteredPeripherals(filtered)
  }

  const handleAdd = () => {
    setEditingPeripheral(null)
    setWiring([])
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (peripheral: Peripheral) => {
    setEditingPeripheral(peripheral)
    setWiring(peripheral.defaultWiring || [])
    form.setFieldsValue({
      name: peripheral.name,
      type: peripheral.type,
      manufacturer: peripheral.manufacturer,
      interfaceType: peripheral.interface.type,
      interfaceSpeed: peripheral.interface.speed,
      datasheet: peripheral.datasheet,
      tags: peripheral.tags,
      notes: peripheral.notes
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.deletePeripheral(id)
    message.success('删除成功')
    loadPeripherals()
  }

  const handlePresetSelect = (name: string) => {
    const preset = PERIPHERAL_PRESETS.find(p => p.name === name)
    if (preset) {
      form.setFieldsValue({
        name: preset.name,
        type: preset.type,
        interfaceType: preset.interface
      })
    }
  }

  const handleAddWiring = () => {
    setWiring([...wiring, { peripheralPin: '', mcuPin: '', required: true }])
  }

  const handleRemoveWiring = (index: number) => {
    setWiring(wiring.filter((_, i) => i !== index))
  }

  const handleWiringChange = (index: number, field: string, value: any) => {
    const newWiring = [...wiring]
    newWiring[index] = { ...newWiring[index], [field]: value }
    setWiring(newWiring)
  }

  const handleSubmit = async (values: any) => {
    const now = new Date().toISOString()
    
    const peripheralData: Peripheral = {
      id: editingPeripheral?.id || uuidv4(),
      name: values.name,
      type: values.type,
      manufacturer: values.manufacturer,
      interface: {
        type: values.interfaceType,
        speed: values.interfaceSpeed
      },
      defaultWiring: wiring.filter(w => w.peripheralPin && w.mcuPin),
      snippetIds: editingPeripheral?.snippetIds || [],
      datasheet: values.datasheet,
      tags: values.tags || [],
      notes: values.notes,
      createdAt: editingPeripheral?.createdAt || now,
      updatedAt: now
    }

    await storage.savePeripheral(peripheralData)
    message.success(editingPeripheral ? '更新成功' : '添加成功')
    setModalOpen(false)
    loadPeripherals()
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      display: 'blue',
      sensor: 'green',
      audio: 'purple',
      camera: 'cyan',
      communication: 'orange',
      storage: 'gold',
      actuator: 'red',
      input: 'magenta',
      power: 'lime',
      other: 'default'
    }
    return colors[type] || 'default'
  }

  const getTypeLabel = (type: string) => {
    return peripheralTypes.find(t => t.value === type)?.label || type
  }

  // 按类型分组
  const groupedPeripherals = peripheralTypes.map(type => ({
    type: type.value,
    label: type.label,
    items: filteredPeripherals.filter(p => p.type === type.value)
  })).filter(g => g.items.length > 0)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2} className={styles.title}>
          <UsbOutlined style={{ marginRight: 12 }} />
          外设库
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加外设
        </Button>
      </div>

      <div className={styles.filters}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索外设名称、厂商..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
        />
        <Select
          placeholder="按类型筛选"
          value={selectedType}
          onChange={setSelectedType}
          options={peripheralTypes}
          className={styles.typeFilter}
          allowClear
        />
      </div>

      <div className={styles.stats}>
        <Text type="secondary">共 {filteredPeripherals.length} 个外设</Text>
      </div>

      {groupedPeripherals.length > 0 ? (
        <div className={styles.groups}>
          {groupedPeripherals.map(group => (
            <div key={group.type} className={styles.group}>
              <div className={styles.groupHeader}>
                <Tag color={getTypeColor(group.type)}>{group.label}</Tag>
                <Text type="secondary">{group.items.length} 个</Text>
              </div>
              <Row gutter={[12, 12]}>
                {group.items.map(peripheral => (
                  <Col xs={24} sm={12} md={8} lg={6} key={peripheral.id}>
                    <Card 
                      size="small"
                      className={styles.peripheralCard}
                      actions={[
                        <EditOutlined onClick={() => handleEdit(peripheral)} />,
                        <Popconfirm
                          title="确定删除？"
                          onConfirm={() => handleDelete(peripheral.id)}
                        >
                          <DeleteOutlined />
                        </Popconfirm>
                      ]}
                    >
                      <div className={styles.cardContent}>
                        <Text strong className={styles.peripheralName}>{peripheral.name}</Text>
                        <div className={styles.interfaceInfo}>
                          <Tag>{peripheral.interface.type.toUpperCase()}</Tag>
                          {peripheral.interface.speed && (
                            <Text type="secondary">{peripheral.interface.speed}</Text>
                          )}
                        </div>
                        {peripheral.manufacturer && (
                          <Text type="secondary" className={styles.manufacturer}>
                            {peripheral.manufacturer}
                          </Text>
                        )}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无外设" className={styles.empty}>
          <Button type="primary" onClick={handleAdd}>添加第一个外设</Button>
        </Empty>
      )}

      {/* 编辑模态框 */}
      <Modal
        title={editingPeripheral ? '编辑外设' : '添加外设'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="外设名称" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="选择或输入外设名称"
                  options={PERIPHERAL_PRESETS.map(p => ({ label: p.name, value: p.name }))}
                  onChange={handlePresetSelect}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                <Select options={peripheralTypes} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="interfaceType" label="接口" rules={[{ required: true }]}>
                <Select options={interfaceTypes} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="interfaceSpeed" label="速度">
                <Input placeholder="如 40MHz" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="manufacturer" label="厂商">
                <Input placeholder="如 Sitronix" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="datasheet" label="数据手册链接">
            <Input placeholder="https://..." />
          </Form.Item>

          <div className={styles.wiringSection}>
            <div className={styles.wiringSectionHeader}>
              <Text strong>默认接线配置</Text>
              <Button type="dashed" size="small" onClick={handleAddWiring}>
                添加引脚
              </Button>
            </div>
            {wiring.length > 0 && (
              <Table
                size="small"
                dataSource={wiring}
                pagination={false}
                rowKey={(_, index) => index?.toString() || '0'}
                columns={[
                  {
                    title: '外设引脚',
                    dataIndex: 'peripheralPin',
                    render: (_, __, index) => (
                      <Input
                        size="small"
                        value={wiring[index].peripheralPin}
                        onChange={(e) => handleWiringChange(index, 'peripheralPin', e.target.value)}
                        placeholder="如 SCL"
                      />
                    )
                  },
                  {
                    title: 'MCU引脚',
                    dataIndex: 'mcuPin',
                    render: (_, __, index) => (
                      <Input
                        size="small"
                        value={wiring[index].mcuPin}
                        onChange={(e) => handleWiringChange(index, 'mcuPin', e.target.value)}
                        placeholder="如 GPIO11"
                      />
                    )
                  },
                  {
                    title: '',
                    width: 60,
                    render: (_, __, index) => (
                      <Button type="text" danger size="small" onClick={() => handleRemoveWiring(index)}>
                        删除
                      </Button>
                    )
                  }
                ]}
              />
            )}
          </div>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="使用注意事项等" />
          </Form.Item>

          <Form.Item className={styles.formActions}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingPeripheral ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
