import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Layout as AntLayout, Menu, Input, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  BookOutlined,
  FileTextOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GithubOutlined,
  FolderOutlined,
  AppstoreOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { SearchModal } from '../SearchBar/SearchModal'
import { SyncProvider, useSync } from '../../contexts/SyncContext'
import styles from './Layout.module.css'

// Nexus Logo - 直接使用 app 图标
const NexusLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <img 
    src="/icon.png" 
    alt="Nexus" 
    width={size} 
    height={size} 
    style={{ borderRadius: size * 0.2, display: 'block' }} 
  />
)

const { Sider, Content, Header } = AntLayout
const { Title } = Typography

interface LayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '仪表盘' },
  { key: '/projects', icon: <FolderOutlined />, label: '项目管理' },
  { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { type: 'divider' as const },
  { key: '/notes', icon: <FileTextOutlined />, label: '笔记' },
  { key: '/github', icon: <GithubOutlined />, label: '开发库' },
]

// 全局同步进度条组件
function GlobalSyncProgress() {
  const { syncing, syncProgress } = useSync()
  
  if (!syncing) return null
  
  return createPortal(
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
  )
}

// 内部 Layout 组件
function LayoutInner({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  // 快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 高亮当前菜单
  const getSelectedKeys = () => {
    const path = location.pathname
    if (path.startsWith('/knowledge')) return ['/knowledge']
    if (path.startsWith('/projects')) return ['/projects']
    return [path]
  }

  return (
    <AntLayout className={styles.layout}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        trigger={null}
        width={200}
        collapsedWidth={64}
        className={styles.sider}
      >
        <div className={styles.logo}>
          {!collapsed ? (
            <>
              <div className={styles.logoIcon}><NexusLogo size={28} /></div>
              <div className={styles.logoTextContainer}>
                <Title level={4} className={styles.logoText}>Nexus</Title>
                <span className={styles.version}>v5.0</span>
              </div>
            </>
          ) : (
            <div className={styles.logoIconCollapsed}><NexusLogo size={24} /></div>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          className={styles.menu}
        />
        
        <div 
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </Sider>
      
      <AntLayout>
        <Header className={styles.header}>
          <div className={styles.titlebarDrag} />
          <div className={styles.headerContent}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索 (⌘K)"
              className={styles.searchInput}
              onClick={() => setSearchOpen(true)}
              readOnly
              suffix={<span className={styles.shortcut}>⌘K</span>}
            />
          </div>
        </Header>
        
        <Content className={styles.content}>
          {children}
        </Content>
      </AntLayout>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <GlobalSyncProgress />
    </AntLayout>
  )
}

// 导出的 Layout 组件，包含 SyncProvider
export function Layout({ children }: LayoutProps) {
  return (
    <SyncProvider>
      <LayoutInner>{children}</LayoutInner>
    </SyncProvider>
  )
}
