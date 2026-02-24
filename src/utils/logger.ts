// ============================================================
// Nexus 统一日志工具
// 支持开发/生产环境，自动过滤生产环境的调试日志
// ============================================================

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private prefix: string
  private minLevel: LogLevel

  constructor(prefix: string = '[Nexus]', minLevel: LogLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO) {
    this.prefix = prefix
    this.minLevel = minLevel
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatMessage(level: string, ...args: any[]): any[] {
    return [`${this.prefix} [${level}]`, ...args]
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(...this.formatMessage('DEBUG', ...args))
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(...this.formatMessage('INFO', ...args))
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage('WARN', ...args))
    }
  }

  error(...args: any[]): void {
    // 错误始终记录
    console.error(...this.formatMessage('ERROR', ...args))
  }
}

// 导出默认 logger 实例
export const logger = new Logger()

// 导出创建自定义 logger 的函数
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix)
}
