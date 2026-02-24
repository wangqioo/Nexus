// ============================================================
// Nexus 统一错误处理类型
// 使用 Result<T> 模式统一错误返回格式
// ============================================================

/**
 * 统一的结果类型
 * success: true 表示成功，data 包含结果数据
 * success: false 表示失败，error 包含错误信息
 */
export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

/**
 * 创建成功结果
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data }
}

/**
 * 创建失败结果
 */
export function failure(error: string, code?: string): Result<never> {
  return { success: false, error, code }
}

/**
 * 从 Promise 创建 Result（捕获异常）
 */
export async function fromPromise<T>(
  promise: Promise<T>,
  errorMessage?: string
): Promise<Result<T>> {
  try {
    const data = await promise
    return success(data)
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : String(error))
    return failure(message)
  }
}

/**
 * 从同步函数创建 Result（捕获异常）
 */
export function fromSync<T>(
  fn: () => T,
  errorMessage?: string
): Result<T> {
  try {
    const data = fn()
    return success(data)
  } catch (error) {
    const message = errorMessage || (error instanceof Error ? error.message : String(error))
    return failure(message)
  }
}

/**
 * 检查 Result 是否成功
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success
}

/**
 * 检查 Result 是否失败
 */
export function isFailure<T>(result: Result<T>): result is { success: false; error: string; code?: string } {
  return !result.success
}
