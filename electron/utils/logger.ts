// ============================================================
// Nexus Electron 主进程日志工具
// ============================================================

const isDev = process.env.NODE_ENV !== 'production' && !require('electron').app.isPackaged

enum LogLevel {
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

export const logger = new Logger()
export const createLogger = (prefix: string): Logger => new Logger(prefix)
