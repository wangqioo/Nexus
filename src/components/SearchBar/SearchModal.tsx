import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Input, List, Tag, Typography, Empty } from 'antd'
import { 
  SearchOutlined, CloudServerOutlined, UsbOutlined, 
  CodeOutlined, BugOutlined, SettingOutlined, FileTextOutlined 
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../../services/search'
import type { SearchResult } from '../../types'
import styles from './SearchModal.module.css'

const { Text } = Typography

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string; route: string }> = {
  platform: { icon: <CloudServerOutlined />, color: 'blue', label: '平台', route: '/platforms' },
  peripheral: { icon: <UsbOutlined />, color: 'cyan', label: '外设', route: '/peripherals' },
  snippet: { icon: <CodeOutlined />, color: 'green', label: '代码', route: '/snippets' },
  debug: { icon: <BugOutlined />, color: 'red', label: '调试', route: '/debug' },
  config: { icon: <SettingOutlined />, color: 'orange', label: '配置', route: '/configs' },
  note: { icon: <FileTextOutlined />, color: 'purple', label: '笔记', route: '/notes' },
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const { search } = useSearch()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  const handleSearch = useCallback(async (value: string) => {
    setQuery(value)
    if (value.trim()) {
      const searchResults = await search(value)
      setResults(searchResults)
    } else {
      setResults([])
    }
  }, [search])

  const handleResultClick = (result: SearchResult) => {
    const config = typeConfig[result.type]
    navigate(config?.route || '/', { state: { selectedId: result.id } })
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={640}
      className={styles.modal}
      styles={{ body: { padding: 0 } }}
    >
      <div className={styles.searchContainer}>
        <Input
          prefix={<SearchOutlined className={styles.searchIcon} />}
          placeholder="搜索平台、外设、代码片段、调试经验..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
          autoFocus
          bordered={false}
          size="large"
        />
      </div>
      
      <div className={styles.results}>
        {results.length > 0 ? (
          <List
            dataSource={results}
            renderItem={(item) => {
              const config = typeConfig[item.type]
              return (
                <List.Item 
                  className={styles.resultItem}
                  onClick={() => handleResultClick(item)}
                >
                  <div className={styles.resultContent}>
                    <div className={styles.resultHeader}>
                      <Tag icon={config?.icon} color={config?.color}>
                        {config?.label}
                      </Tag>
                      <Text strong className={styles.resultTitle}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text type="secondary" className={styles.resultSubtitle}>
                          {item.subtitle}
                        </Text>
                      )}
                    </div>
                    <Text type="secondary" className={styles.resultPreview}>
                      {item.preview}
                    </Text>
                  </div>
                </List.Item>
              )
            }}
          />
        ) : query ? (
          <Empty 
            description="没有找到相关内容" 
            className={styles.empty}
          />
        ) : (
          <div className={styles.tips}>
            <Text type="secondary">输入关键词搜索</Text>
            <div className={styles.tipTags}>
              <Tag>ESP32</Tag>
              <Tag>ST7789</Tag>
              <Tag>IMU</Tag>
              <Tag>WiFi</Tag>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
