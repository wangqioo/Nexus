import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { zh, en, type Locale } from '../locales'

export type Language = 'zh' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Locale  // 翻译对象
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const LANGUAGE_KEY = 'nexus_language'

// 获取翻译对象
const getLocale = (lang: Language): Locale => {
  return lang === 'zh' ? zh : en
}

// 获取系统语言
const getSystemLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase()
  return browserLang.startsWith('zh') ? 'zh' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved === 'zh' || saved === 'en') {
      return saved
    }
    return getSystemLanguage()
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_KEY, lang)
    // 更新 HTML lang 属性
    document.documentElement.lang = lang
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = getLocale(language)

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// 辅助函数：模板字符串替换
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? key))
}
