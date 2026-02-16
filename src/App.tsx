import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { ConfigProvider, message, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { Layout } from './components/Layout'
import { SyncProvider } from './contexts/SyncContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { Dashboard } from './pages/Dashboard'
import { Notes } from './pages/Notes'
import { GitHub } from './pages/GitHub'
import { Projects } from './pages/Projects'
import { Knowledge } from './pages/Knowledge'
import { Settings } from './pages/Settings'
import { Guide } from './pages/Guide'
import { Onboarding } from './components/Onboarding'

// 配置全局消息提示位置
message.config({
  top: 70, // 距离顶部 70px，避开标题栏
  maxCount: 3,
})

const ONBOARDING_KEY = 'nexus_onboarding_completed'

// 内部 App 组件，使用主题和语言
function AppInner() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { language } = useLanguage()
  const { isDark } = useTheme()

  useEffect(() => {
    // 支持通过 ?resetOnboarding=1 进入首次使用模式
    const params = new URLSearchParams(window.location.search)
    if (params.get('resetOnboarding') === '1') {
      localStorage.removeItem(ONBOARDING_KEY)
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      setShowOnboarding(true)
      return
    }
    // 检查是否首次打开
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setShowOnboarding(true)
    }
  }, [])

  const handleOnboardingFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShowOnboarding(false)
  }

  return (
    <ConfigProvider
      locale={language === 'zh' ? zhCN : enUS}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          ...(isDark ? {
            colorBgContainer: '#161b22',
            colorBgElevated: '#1c2128',
            colorBgLayout: '#0d1117',
            colorBorder: '#30363d',
            colorText: '#e6edf3',
            colorTextSecondary: '#8b949e',
          } : {
            colorBgContainer: '#ffffff',
            colorBgElevated: '#f6f8fa',
            colorBgLayout: '#f0f2f5',
            colorBorder: '#d0d7de',
            colorText: '#1f2328',
            colorTextSecondary: '#656d76',
          }),
        },
      }}
    >
      <SyncProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/github" element={<GitHub />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/guide" element={<Guide />} />
            </Routes>
          </Layout>
          
          {/* 首次使用引导 */}
          <Onboarding 
            open={showOnboarding} 
            onFinish={handleOnboardingFinish} 
          />
        </HashRouter>
      </SyncProvider>
    </ConfigProvider>
  )
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </LanguageProvider>
  )
}

export default App
