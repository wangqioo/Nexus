// ============================================================
// AI API 重试工具 (Electron 主进程版本)
// ============================================================

import { logger } from './logger'

export interface AIRequestOptions {
  url: string
  apiKey: string
  model: string
}

export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
}

/**
 * 带重试的 AI API 调用
 */
export async function callAIWithRetry(
  options: AIRequestOptions,
  prompt: string,
  retryOptions: RetryOptions = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout)

      const response = await fetch(options.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: (retryOptions as any).max_tokens || 2000,
        }),
        signal: controller.signal as any,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API 错误 (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('AI API 返回内容为空')
      }

      return { success: true, data: content }
    } catch (error: any) {
      lastError = error

      if (attempt === opts.maxRetries) {
        break
      }

      if (error.name === 'AbortError') {
        logger.warn(`AI API 超时，${opts.retryDelay}ms 后重试 (${attempt + 1}/${opts.maxRetries})`)
      } else {
        logger.warn(`AI API 调用失败，${opts.retryDelay}ms 后重试 (${attempt + 1}/${opts.maxRetries}):`, error.message)
      }

      await new Promise(resolve => setTimeout(resolve, opts.retryDelay * (attempt + 1)))
    }
  }

  return {
    success: false,
    error: lastError?.message || 'AI API 调用失败',
  }
}
