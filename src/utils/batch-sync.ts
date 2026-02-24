// ============================================================
// 批量同步工具
// 使用分批处理避免阻塞 UI
// ============================================================

export interface BatchSyncOptions {
  batchSize?: number        // 每批处理的项目数，默认 3
  delayBetweenBatches?: number  // 批次间延迟（毫秒），默认 100
  delayBetweenItems?: number    // 项目间延迟（毫秒），默认 300
}

const DEFAULT_OPTIONS: Required<BatchSyncOptions> = {
  batchSize: 3,
  delayBetweenBatches: 100,
  delayBetweenItems: 300,
}

/**
 * 分批处理数组，避免阻塞 UI
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchSyncOptions = {},
  onProgress?: (current: number, total: number, item: T) => void
): Promise<R[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += opts.batchSize) {
    const batch = items.slice(i, i + opts.batchSize)
    
    // 处理当前批次（顺序处理，避免并发过多）
    for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
      const item = batch[batchIndex]
      const globalIndex = i + batchIndex
      
      onProgress?.(globalIndex, items.length, item)
      
      try {
        const result = await processor(item, globalIndex)
        results.push(result)
        
        // 项目间延迟（API 限速）
        if (batchIndex < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, opts.delayBetweenItems))
        }
      } catch (error: any) {
        // 如果处理器抛出 CANCELLED 错误，直接传播
        if (error?.message === 'CANCELLED') {
          throw error
        }
        // 其他错误继续处理下一个
        results.push(error as R)
      }
    }
    
    // 批次间延迟，让出控制权给 UI
    if (i + opts.batchSize < items.length) {
      await yieldToUI()
      await new Promise(resolve => setTimeout(resolve, opts.delayBetweenBatches))
    }
  }
  
  return results
}

/**
 * 使用 requestIdleCallback 或 setTimeout 让出控制权
 */
export function yieldToUI(): Promise<void> {
  return new Promise(resolve => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 0 })
    } else {
      setTimeout(() => resolve(), 0)
    }
  })
}
