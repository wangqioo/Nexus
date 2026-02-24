import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Layout as AntLayout, Menu, Input, Typography, Dropdown, Tooltip, Space } from 'antd'
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
  SyncOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  GlobalOutlined,
  CheckOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import { SearchModal } from '../SearchBar/SearchModal'
import { useSync } from '../../contexts/SyncContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme, type ThemeMode } from '../../contexts/ThemeContext'
import styles from './Layout.module.css'

// Nexus Logo - 与系统图标一致的圆角（约 22% 圆角）
const NexusLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <img 
    src="/icon.png" 
    alt="码迹" 
    width={size} 
    height={size} 
    style={{ borderRadius: Math.round(size * 0.28), display: 'block' }} 
  />
)

const { Sider, Content, Header } = AntLayout
const { Title } = Typography

interface LayoutProps {
  children: React.ReactNode
}

// 菜单项由组件内部根据语言动态生成

// 全局同步进度条组件
function GlobalSyncProgress() {
  const { syncing, syncProgress, batchProgress, cancelSync } = useSync()
  
  if (!syncing) return null

  // 批量同步模式 - 双进度条
  if (batchProgress) {
    return createPortal(
      <div style={{
        position: 'fixed',
        top: 70,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 380,
        background: 'rgba(22, 27, 34, 0.98)',
        borderRadius: 12,
        border: '1px solid #333',
        padding: '14px 18px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
        zIndex: 99999,
      }}>
        {/* 总进度 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
              {batchProgress.totalStep}
            </span>
            <span style={{ fontSize: 13, color: '#58a6ff', fontWeight: 500 }}>
              {batchProgress.totalCurrent}/{batchProgress.totalCount}
            </span>
          </div>
          <div style={{ height: 6, background: '#2a3f5f', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1677ff, #52c41a)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
              width: `${Math.min((batchProgress.totalCurrent / batchProgress.totalCount) * 100, 100)}%`
            }} />
          </div>
        </div>
        
        {/* 当前项目进度 */}
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: 8, 
          padding: '10px 12px',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>
              <SyncOutlined spin style={{ marginRight: 6 }} />
              {batchProgress.currentStep}
            </span>
            <span style={{ fontSize: 12, color: '#58a6ff' }}>
              {batchProgress.currentProgress}%
            </span>
          </div>
          <div style={{ height: 3, background: '#1a2332', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: '#58a6ff',
              borderRadius: 2,
              transition: 'width 0.2s ease',
              width: `${batchProgress.currentProgress}%`
            }} />
          </div>
          {batchProgress.currentFile && (
            <div style={{ 
              fontSize: 11, 
              color: '#6e7681', 
              marginTop: 6,
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              📄 {batchProgress.currentFile}
            </div>
          )}
        </div>

        {/* 取消按钮 */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={cancelSync}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 6,
              padding: '6px 20px',
              color: '#8b949e',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#f85149'
              e.currentTarget.style.color = '#f85149'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#444'
              e.currentTarget.style.color = '#8b949e'
            }}
          >
            终止同步
          </button>
        </div>
      </div>,
      document.body
    )
  }
  
  // 单项目同步模式 - 原有样式
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

// 主题切换按钮
function ThemeToggle() {
  const { themeMode, setThemeMode, isDark } = useTheme()
  const { t } = useLanguage()
  
  const items = [
    { 
      key: 'light', 
      icon: <SunOutlined />, 
      label: t.header.themeLight,
      extra: themeMode === 'light' ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      key: 'dark', 
      icon: <MoonOutlined />, 
      label: t.header.themeDark,
      extra: themeMode === 'dark' ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      key: 'auto', 
      icon: <DesktopOutlined />, 
      label: t.header.themeAuto,
      extra: themeMode === 'auto' ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
  ]
  
  return (
    <Dropdown
      menu={{
        items: items.map(item => ({
          key: item.key,
          icon: item.icon,
          label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 80 }}>
            {item.label}
            {item.extra}
          </span>,
        })),
        onClick: ({ key }) => setThemeMode(key as ThemeMode),
      }}
      trigger={['click']}
    >
      <Tooltip title={t.header.theme}>
        <div className={styles.headerBtn}>
          {isDark ? <MoonOutlined /> : <SunOutlined />}
        </div>
      </Tooltip>
    </Dropdown>
  )
}

// 语言切换按钮
function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()
  
  const items = [
    { 
      key: 'zh', 
      label: '中文',
      extra: language === 'zh' ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      key: 'en', 
      label: 'English',
      extra: language === 'en' ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
  ]
  
  return (
    <Dropdown
      menu={{
        items: items.map(item => ({
          key: item.key,
          label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 80 }}>
            {item.label}
            {item.extra}
          </span>,
        })),
        onClick: ({ key }) => setLanguage(key as 'zh' | 'en'),
      }}
      trigger={['click']}
    >
      <Tooltip title={t.header.language}>
        <div className={styles.headerBtn}>
          <GlobalOutlined />
        </div>
      </Tooltip>
    </Dropdown>
  )
}

// 内部 Layout 组件
function LayoutInner({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { t } = useLanguage()

  // 动态菜单项
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: t.menu.dashboard },
    { key: '/projects', icon: <FolderOutlined />, label: t.menu.projects },
    { key: '/knowledge', icon: <BookOutlined />, label: t.menu.knowledge },
    { type: 'divider' as const },
    { key: '/notes', icon: <FileTextOutlined />, label: t.menu.notes },
    { key: '/github', icon: <GithubOutlined />, label: t.menu.devLibrary },
    { type: 'divider' as const },
    { key: '/guide', icon: <QuestionCircleOutlined />, label: '新手指南' },
    { key: '/settings', icon: <SettingOutlined />, label: t.menu.templateSettings },
  ]

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
    if (path.startsWith('/guide')) return ['/guide']
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
                <Title level={4} className={styles.logoText}>Nexus 码迹</Title>
                <span className={styles.version}>v{__APP_VERSION__}</span>
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
              placeholder={t.header.searchPlaceholder}
              className={styles.searchInput}
              onClick={() => setSearchOpen(true)}
              readOnly
              suffix={<span className={styles.shortcut}>⌘K</span>}
            />
            <div className={styles.headerActions}>
              <ThemeToggle />
              <LanguageToggle />
            </div>
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

// 导出的 Layout 组件（SyncProvider 已在 App.tsx 中提供）
export function Layout({ children }: LayoutProps) {
  return <LayoutInner>{children}</LayoutInner>
}
