import React, { useState, useEffect } from 'react'
import { 
  Typography, Card, Tabs, Form, Input, Button, message, Space, 
  Select, Switch, Tag, Tooltip, Popconfirm, Alert, Collapse, Divider,
  Timeline, Empty, Badge
} from 'antd'
import { 
  SaveOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined,
  BugOutlined, CodeOutlined, FileTextOutlined, SettingOutlined,
  QuestionCircleOutlined, EditOutlined, EyeOutlined, HistoryOutlined,
  FolderOutlined, ClockCircleOutlined, FolderOpenOutlined, KeyOutlined
} from '@ant-design/icons'
import type { NexusTemplateConfig, DocumentTemplate, TemplateField, TemplateVersionRecord, ProjectTemplateUsage } from '../../types'
import { DEFAULT_TEMPLATE_CONFIG } from '../../types'
import styles from './Settings.module.css'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Panel } = Collapse

// 模板类型图标映射（4 类知识 + 笔记库）
const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  debug: <BugOutlined />,
  snippet: <CodeOutlined />,
  note: <FileTextOutlined />,
  config: <SettingOutlined />,
  other: <FolderOpenOutlined />,
}

// 字段类型选项
const FIELD_TYPES = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'tags', label: '标签' },
  { value: 'select', label: '下拉选择' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'boolean', label: '开关' },
]

// 单个字段编辑器
const FieldEditor: React.FC<{
  field: TemplateField
  onChange: (field: TemplateField) => void
  onDelete: () => void
}> = ({ field, onChange, onDelete }) => {
  return (
    <div className={styles.fieldEditor}>
      <div className={styles.fieldRow}>
        <Input
          value={field.name}
          onChange={(e) => onChange({ ...field, name: e.target.value })}
          placeholder="字段名(英文)"
          style={{ width: 120 }}
        />
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="显示名"
          style={{ width: 100 }}
        />
        <Select
          value={field.type}
          onChange={(value) => onChange({ ...field, type: value as any })}
          options={FIELD_TYPES}
          style={{ width: 110 }}
        />
        <Switch
          checked={field.required}
          onChange={(checked) => onChange({ ...field, required: checked })}
          checkedChildren="必填"
          unCheckedChildren="可选"
        />
        <Tooltip title="删除字段">
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={onDelete}
          />
        </Tooltip>
      </div>
      {field.type === 'select' && (
        <div className={styles.fieldOptions}>
          <Text type="secondary" style={{ fontSize: 12 }}>选项（逗号分隔）：</Text>
          <Input
            value={field.options?.join(', ') || ''}
            onChange={(e) => onChange({ 
              ...field, 
              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            placeholder="option1, option2, option3"
            size="small"
          />
        </div>
      )}
      <Input
        value={field.placeholder || ''}
        onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
        placeholder="输入提示文字"
        size="small"
        prefix={<Text type="secondary" style={{ fontSize: 11 }}>提示:</Text>}
      />
    </div>
  )
}

// 单个模板编辑器
const TemplateEditor: React.FC<{
  template: DocumentTemplate
  onChange: (template: DocumentTemplate) => void
}> = ({ template, onChange }) => {
  const [previewMode, setPreviewMode] = useState(false)

  const handleFieldChange = (index: number, field: TemplateField) => {
    const newFields = [...template.frontmatterFields]
    newFields[index] = field
    onChange({ ...template, frontmatterFields: newFields })
  }

  const handleFieldDelete = (index: number) => {
    const newFields = template.frontmatterFields.filter((_, i) => i !== index)
    onChange({ ...template, frontmatterFields: newFields })
  }

  const handleAddField = () => {
    const newField: TemplateField = {
      name: '',
      label: '',
      type: 'text',
      required: false,
    }
    onChange({ 
      ...template, 
      frontmatterFields: [...template.frontmatterFields, newField] 
    })
  }

  return (
    <div className={styles.templateEditor}>
      {/* 基本信息 */}
      <div className={styles.templateHeader}>
        <Space>
          {TEMPLATE_ICONS[template.id]}
          <Input
            value={template.name}
            onChange={(e) => onChange({ ...template, name: e.target.value })}
            style={{ width: 150 }}
            prefix={<Text type="secondary">名称:</Text>}
          />
        </Space>
        <Input
          value={template.description}
          onChange={(e) => onChange({ ...template, description: e.target.value })}
          placeholder="模板描述"
          style={{ flex: 1, marginLeft: 16 }}
        />
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 以下区块默认收起，需要时再展开 */}
      <Collapse defaultActiveKey={[]} ghost>
        <Panel 
          header={
            <Space>
              <Text strong>文档元数据字段</Text>
              <Tag>{template.frontmatterFields.length} 个</Tag>
            </Space>
          } 
          key="fields"
        >
          <div className={styles.fieldsContainer}>
            {template.frontmatterFields.map((field, index) => (
              <FieldEditor
                key={index}
                field={field}
                onChange={(f) => handleFieldChange(index, f)}
                onDelete={() => handleFieldDelete(index)}
              />
            ))}
            <Button 
              type="dashed" 
              icon={<PlusOutlined />} 
              onClick={handleAddField}
              block
            >
              添加字段
            </Button>
          </div>
        </Panel>

        <Panel 
          header={
            <Space>
              <Text strong>内容模板（Markdown 结构）</Text>
              <Button 
                type="text" 
                size="small"
                icon={previewMode ? <EditOutlined /> : <EyeOutlined />}
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? '编辑' : '预览'}
              </Button>
            </Space>
          } 
          key="content"
        >
          {previewMode ? (
            <div className={styles.preview}>
              <pre>{template.contentTemplate}</pre>
            </div>
          ) : (
            <TextArea
              value={template.contentTemplate}
              onChange={(e) => onChange({ ...template, contentTemplate: e.target.value })}
              rows={12}
              className={styles.codeEditor}
              placeholder="Markdown 内容模板..."
            />
          )}
        </Panel>

        <Panel 
          header={
            <Space>
              <Text strong>AI 生成指导</Text>
              <Tooltip title="让 AI 记录经验时参考的说明">
                <QuestionCircleOutlined style={{ color: '#888' }} />
              </Tooltip>
            </Space>
          } 
          key="prompt"
        >
          <TextArea
            value={template.aiPrompt}
            onChange={(e) => onChange({ ...template, aiPrompt: e.target.value })}
            rows={8}
            placeholder="指导 AI 如何生成这类文档..."
          />
        </Panel>
      </Collapse>
    </div>
  )
}

export function Settings() {
  const [config, setConfig] = useState<NexusTemplateConfig>(DEFAULT_TEMPLATE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('debug')
  const [apiKey, setApiKey] = useState('')
  const [apiKeySaving, setApiKeySaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    const local = localStorage.getItem('zhipu_api_key') || ''
    setApiKey(local)
    if (!local && typeof window.electronAPI?.readFile === 'function') {
      window.electronAPI.readFile('config.json').then((raw: string | null) => {
        if (raw) {
          try {
            const cfg = JSON.parse(raw)
            if (cfg.zhipu_api_key) {
              setApiKey(cfg.zhipu_api_key)
              localStorage.setItem('zhipu_api_key', cfg.zhipu_api_key)
            }
          } catch (_) {}
        }
      })
    }
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const cfg = await window.electronAPI.getTemplateConfig()
      setConfig(cfg)
    } catch (e) {
      console.error('加载模板配置失败:', e)
      message.error('加载配置失败')
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await window.electronAPI.updateTemplateConfig(config)
      if (success) {
        message.success('模板配置已保存')
      } else {
        message.error('保存失败')
      }
    } catch (e) {
      console.error('保存模板配置错误:', e)
      message.error('保存失败')
    }
    setSaving(false)
  }

  const handleReset = async () => {
    setLoading(true)
    try {
      const defaultConfig = await window.electronAPI.resetTemplateConfig()
      setConfig(defaultConfig)
      message.success('已恢复默认配置')
    } catch (e) {
      console.error('重置模板配置错误:', e)
      message.error('重置失败')
    }
    setLoading(false)
  }

  const handleTemplateChange = (templateId: string, template: DocumentTemplate) => {
    setConfig({
      ...config,
      templates: {
        ...config.templates,
        [templateId]: template,
      },
    })
  }

  const handleSaveApiKey = async () => {
    setApiKeySaving(true)
    try {
      localStorage.setItem('zhipu_api_key', apiKey)
      if (typeof window.electronAPI?.readFile === 'function' && typeof window.electronAPI?.writeFile === 'function') {
        let existing: Record<string, unknown> = {}
        try {
          const raw = await window.electronAPI.readFile('config.json')
          if (raw) existing = JSON.parse(raw)
        } catch (_) {}
        existing.zhipu_api_key = apiKey || undefined
        if (apiKey === '') delete existing.zhipu_api_key
        await window.electronAPI.writeFile('config.json', JSON.stringify(existing, null, 2))
      }
      message.success(apiKey ? '智谱 API Key 已保存' : '已清除 API Key')
    } catch (e) {
      message.error('保存失败')
    }
    setApiKeySaving(false)
  }

  const tabItems = Object.entries(config.templates).map(([id, template]) => ({
    key: id,
    label: (
      <Space>
        {TEMPLATE_ICONS[id]}
        {template.name}
      </Space>
    ),
    children: (
      <TemplateEditor
        template={template}
        onChange={(t) => handleTemplateChange(id, t)}
      />
    ),
  }))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title level={2} className={styles.title}>模板设置</Title>
          <Text type="secondary">所有项目共用这一份配置；不改也能用，默认就够。</Text>
        </div>
        <Space>
          <Popconfirm
            title="确定恢复默认配置吗？"
            description="所有自定义修改将丢失"
            onConfirm={handleReset}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<ReloadOutlined />}>恢复默认</Button>
          </Popconfirm>
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      </div>

      {/* 智谱 API Key：分享给他人后对方需在此填写自己的 Key */}
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>智谱 API Key</span>
          </Space>
        }
        className={styles.card}
        style={{ marginBottom: 20 }}
      >
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          用于项目 AI 分析、导入时分类与同步补全等。分享项目给他人时不会包含此 Key，对方需在
          <a href="https://open.bigmodel.cn" target="_blank" rel="noopener noreferrer"> 智谱开放平台 </a>
          申请自己的 Key 后在此填写。
        </Paragraph>
        <Space.Compact style={{ width: '100%', maxWidth: 480 }}>
          <Input.Password
            placeholder="填写后保存，不填则不使用 AI 功能"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            onPressEnter={handleSaveApiKey}
          />
          <Button type="primary" onClick={handleSaveApiKey} loading={apiKeySaving}>
            保存
          </Button>
        </Space.Compact>
      </Card>

      <Alert
        type="info"
        showIcon
        message="无需折腾"
        description="大多数情况用默认即可，只需看下面「常用设置」里的两个开关；想改文档格式或 AI 提示时再点左侧「各类型模板」。"
        style={{ marginBottom: 20 }}
      />

      {/* 常用设置：优先展示，多数用户只动这里 */}
      <Card 
        title="常用设置" 
        className={styles.card}
        loading={loading}
      >
        <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Form.Item 
            label="同步时用 AI 分析" 
            extra="导入经验时让 AI 自动补全标题、标签等（需在上方配置智谱 API Key）"
          >
            <Switch
              checked={config.settings.aiAnalysisEnabled}
              onChange={(checked) => setConfig({
                ...config,
                settings: { ...config.settings, aiAnalysisEnabled: checked }
              })}
            />
          </Form.Item>
          <Form.Item 
            label="自动加时间" 
            extra="新建文档时自动写入创建时间"
          >
            <Switch
              checked={config.settings.autoAddTimestamp}
              onChange={(checked) => setConfig({
                ...config,
                settings: { ...config.settings, autoAddTimestamp: checked }
              })}
            />
          </Form.Item>
          <Form.Item label="默认标签" extra="新建文档时可带的默认标签，不填也行">
            <Select
              mode="tags"
              value={config.settings.defaultTags}
              onChange={(tags) => setConfig({
                ...config,
                settings: { ...config.settings, defaultTags: tags }
              })}
              placeholder="输入后按回车"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 各类型模板：可选，需要改文档格式或 AI 提示时再点 */}
      <Card 
        title="各类型模板（可选）" 
        extra={<Text type="secondary">只有想改文档格式或 AI 提示时再点下面标签</Text>}
        className={styles.card}
        style={{ marginTop: 20 }}
      >
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabPosition="left"
          className={styles.tabs}
        />
      </Card>

      {/* 版本历史与项目使用记录 */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>版本历史与项目记录</span>
            <Badge count={`v${config.version}`} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        className={styles.card}
        style={{ marginTop: 20 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* 版本历史 */}
          <div>
            <Title level={5} style={{ marginBottom: 16 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              版本修改历史
            </Title>
            {config.versionHistory && config.versionHistory.length > 0 ? (
              <Timeline
                mode="left"
                items={[...config.versionHistory].reverse().slice(0, 10).map((record: TemplateVersionRecord) => ({
                  color: 'blue',
                  label: (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </Text>
                  ),
                  children: (
                    <div>
                      <Tag color="blue">v{record.version}</Tag>
                      <Text style={{ fontSize: 13 }}>{record.changes}</Text>
                    </div>
                  ),
                }))}
              />
            ) : (
              <Empty 
                description="暂无修改记录" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  修改模板配置并保存后，会自动记录版本历史
                </Text>
              </Empty>
            )}
          </div>

          {/* 项目使用记录 */}
          <div>
            <Title level={5} style={{ marginBottom: 16 }}>
              <FolderOutlined style={{ marginRight: 8 }} />
              项目使用记录
            </Title>
            {config.projectUsages && config.projectUsages.length > 0 ? (
              <div className={styles.projectUsageList}>
                {[...config.projectUsages].reverse().map((usage: ProjectTemplateUsage, index: number) => (
                  <div key={index} className={styles.projectUsageItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FolderOutlined style={{ color: '#1890ff' }} />
                      <Text strong style={{ flex: 1 }}>{usage.projectName}</Text>
                      <Tag color="green">v{usage.templateVersion}</Tag>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {usage.projectPath}
                      </Text>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        初始化于 {new Date(usage.initializedAt).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                description="暂无项目记录" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: '20px 0' }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  初始化新项目时，会记录使用的模板版本
                </Text>
              </Empty>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Settings
