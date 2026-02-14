import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { SyncProgress } from '../types'

interface SyncContextType {
  syncing: boolean
  syncProgress: SyncProgress | null
  startSync: (step: string, total?: number) => void
  updateProgress: (progress: SyncProgress) => void
  endSync: () => void
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  // 监听后端同步进度
  useEffect(() => {
    if (!window.electronAPI?.onSyncProgress) return
    
    const unsubscribe = window.electronAPI.onSyncProgress((progress) => {
      setSyncProgress(progress)
      if (progress.step === '同步完成' || progress.step === '同步失败') {
        setTimeout(() => {
          setSyncing(false)
          setSyncProgress(null)
        }, 1000)
      }
    })
    
    return () => unsubscribe()
  }, [])

  const startSync = useCallback((step: string, total: number = 1) => {
    setSyncing(true)
    setSyncProgress({ step, current: 0, total })
  }, [])

  const updateProgress = useCallback((progress: SyncProgress) => {
    setSyncProgress(progress)
  }, [])

  const endSync = useCallback(() => {
    setTimeout(() => {
      setSyncing(false)
      setSyncProgress(null)
    }, 800)
  }, [])

  return (
    <SyncContext.Provider value={{ syncing, syncProgress, startSync, updateProgress, endSync }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}
