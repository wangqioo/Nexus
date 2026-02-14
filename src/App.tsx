import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { message } from 'antd'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Platforms } from './pages/Platforms'
import { Peripherals } from './pages/Peripherals'
import { Snippets } from './pages/Snippets'
import { Debug } from './pages/Debug'
import { Configs } from './pages/Configs'
import { Notes } from './pages/Notes'
import { GitHub } from './pages/GitHub'
import { Projects } from './pages/Projects'
import { Knowledge } from './pages/Knowledge'
import { Onboarding } from './components/Onboarding'

// 配置全局消息提示位置
message.config({
  top: 70, // 距离顶部 70px，避开标题栏
  maxCount: 3,
})

const ONBOARDING_KEY = 'nexus_onboarding_completed'

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
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
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/knowledge" element={<Knowledge />} />
          {/* 旧页面保留（从知识库可跳转） */}
          <Route path="/platforms" element={<Platforms />} />
          <Route path="/peripherals" element={<Peripherals />} />
          <Route path="/snippets" element={<Snippets />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/configs" element={<Configs />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/github" element={<GitHub />} />
        </Routes>
      </Layout>
      
      {/* 首次使用引导 */}
      <Onboarding 
        open={showOnboarding} 
        onFinish={handleOnboardingFinish} 
      />
    </HashRouter>
  )
}

export default App
