import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { SyncProgress } from '../types'

// 扩展进度类型，支持双进度条
interface BatchSyncProgress {
  // 总进度
  totalStep: string           // 总体状态（如"正在同步: 项目名"）
  totalCurrent: number        // 已完成项目数
  totalCount: number          // 总项目数
  // 当前项目进度
  currentStep: string         // 当前项目状态（如"AI 分析中"）
  currentFile: string         // 当前处理的文件
  currentProgress: number     // 当前项目进度 0-100
}

interface SyncContextType {
  syncing: boolean
  syncProgress: SyncProgress | null
  batchProgress: BatchSyncProgress | null
  startSync: (step: string, total?: number, batchMode?: boolean) => void
  updateProgress: (progress: SyncProgress) => void
  updateBatchProgress: (progress: BatchSyncProgress) => void
  endSync: () => void
  cancelSync: () => void
  isCancelled: () => boolean
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [batchProgress, setBatchProgress] = useState<BatchSyncProgress | null>(null)
  const batchModeRef = useRef(false)
  const cancelledRef = useRef(false)

  // 监听后端同步进度
  useEffect(() => {
    if (!window.electronAPI?.onSyncProgress) return
    
    const unsubscribe = window.electronAPI.onSyncProgress((progress) => {
      // 批量模式下，更新当前项目的详细进度
      if (batchModeRef.current) {
        setBatchProgress(prev => prev ? {
          ...prev,
          currentStep: progress.step,
          currentFile: progress.file || '',
          currentProgress: progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
        } : null)
        return
      }
      
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

  const startSync = useCallback((step: string, total: number = 1, batchMode: boolean = false) => {
    batchModeRef.current = batchMode
    cancelledRef.current = false
    setSyncing(true)
    setSyncProgress({ step, current: 0, total })
    if (batchMode) {
      setBatchProgress({
        totalStep: step,
        totalCurrent: 0,
        totalCount: total,
        currentStep: '准备中...',
        currentFile: '',
        currentProgress: 0
      })
    }
  }, [])

  const updateProgress = useCallback((progress: SyncProgress) => {
    setSyncProgress(progress)
  }, [])

  const updateBatchProgress = useCallback((progress: BatchSyncProgress) => {
    setBatchProgress(progress)
  }, [])

  const endSync = useCallback(() => {
    batchModeRef.current = false
    cancelledRef.current = false
    setTimeout(() => {
      setSyncing(false)
      setSyncProgress(null)
      setBatchProgress(null)
    }, 800)
  }, [])

  const cancelSync = useCallback(() => {
    cancelledRef.current = true
    setBatchProgress(prev => prev ? { ...prev, totalStep: '正在取消...', currentStep: '等待当前项目完成' } : null)
  }, [])

  const isCancelled = useCallback(() => cancelledRef.current, [])

  return (
    <SyncContext.Provider value={{ 
      syncing, 
      syncProgress, 
      batchProgress,
      startSync, 
      updateProgress, 
      updateBatchProgress,
      endSync,
      cancelSync,
      isCancelled
    }}>
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
