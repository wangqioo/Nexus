import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type Theme = 'light' | 'dark'

interface ThemeContextType {
  themeMode: ThemeMode        // 用户选择的模式
  theme: Theme                // 实际应用的主题
  setThemeMode: (mode: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_KEY = 'nexus_theme'

// 检测系统主题
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

// 根据模式获取实际主题
const getActualTheme = (mode: ThemeMode): Theme => {
  if (mode === 'auto') {
    return getSystemTheme()
  }
  return mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'auto') {
      return saved
    }
    return 'dark'  // 默认深色
  })

  const [theme, setTheme] = useState<Theme>(() => getActualTheme(themeMode))

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    localStorage.setItem(THEME_KEY, mode)
    setTheme(getActualTheme(mode))
  }, [])

  // 监听系统主题变化（仅在 auto 模式下生效）
  useEffect(() => {
    if (themeMode !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    
    // 更新 body 背景色
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0d1117'
      document.body.style.color = '#e6edf3'
    } else {
      document.body.style.backgroundColor = '#ffffff'
      document.body.style.color = '#1f2328'
    }
  }, [theme])

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ themeMode, theme, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
