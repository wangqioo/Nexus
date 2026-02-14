// ============================================================
// Nexus 项目导入服务
// 从现有 MCU 项目中提取经验
// ============================================================

export interface ProjectAnalysis {
  projectPath: string
  projectName: string
  
  // 检测到的项目类型
  detectedType: DetectedProjectType
  
  // 芯片信息 (从配置中提取)
  chip?: {
    name: string
    manufacturer: string
  }
  
  // 框架信息
  framework?: {
    name: string
    version?: string
  }
  
  // 发现的配置文件
  configFiles: ConfigFileInfo[]
  
  // 发现的关键代码文件
  codeFiles: CodeFileInfo[]
  
  // 发现的外设 (从代码/配置中推断)
  detectedPeripherals: string[]
}

export interface DetectedProjectType {
  name: string           // "ESP-IDF", "RT-Thread", "Arduino", "PlatformIO"
  confidence: number     // 0-1
  indicators: string[]   // 检测到的指示文件
}

export interface ConfigFileInfo {
  filename: string
  path: string           // 相对于项目根目录
  type: 'sdkconfig' | 'cmake' | 'kconfig' | 'platformio' | 'makefile' | 'json' | 'other'
  preview: string        // 前几行预览
}

export interface CodeFileInfo {
  filename: string
  path: string
  language: string
  category: 'driver' | 'main' | 'component' | 'include' | 'other'
  linesOfCode: number
}

// 项目类型检测规则
const PROJECT_TYPE_RULES = [
  {
    name: 'ESP-IDF',
    indicators: [
      { file: 'sdkconfig', weight: 0.4 },
      { file: 'sdkconfig.defaults', weight: 0.3 },
      { file: 'CMakeLists.txt', content: 'idf_component_register', weight: 0.3 },
      { file: 'idf_component.yml', weight: 0.3 },
    ]
  },
  {
    name: 'RT-Thread',
    indicators: [
      { file: 'Kconfig', weight: 0.3 },
      { file: 'SConscript', weight: 0.4 },
      { file: 'rtconfig.h', weight: 0.4 },
      { file: 'SConstruct', weight: 0.2 },
    ]
  },
  {
    name: 'PlatformIO',
    indicators: [
      { file: 'platformio.ini', weight: 0.8 },
      { file: '.pio', weight: 0.2 },
    ]
  },
  {
    name: 'Arduino',
    indicators: [
      { file: '*.ino', weight: 0.6 },
      { file: 'libraries', weight: 0.2 },
    ]
  },
  {
    name: 'MicroPython',
    indicators: [
      { file: 'main.py', weight: 0.3 },
      { file: 'boot.py', weight: 0.3 },
      { file: 'micropython.cmake', weight: 0.4 },
    ]
  },
  {
    name: 'Zephyr',
    indicators: [
      { file: 'prj.conf', weight: 0.4 },
      { file: 'CMakeLists.txt', content: 'find_package(Zephyr', weight: 0.4 },
    ]
  },
]

// 外设检测关键词
const PERIPHERAL_KEYWORDS = {
  display: ['lcd', 'oled', 'display', 'st7789', 'st7701', 'st7703', 'ssd1306', 'tft', 'screen', 'lvgl'],
  sensor: ['imu', 'accel', 'gyro', 'qmi8658', 'mpu6050', 'bme280', 'dht', 'temperature', 'humidity'],
  audio: ['i2s', 'audio', 'codec', 'es8311', 'speaker', 'microphone', 'mic'],
  camera: ['camera', 'ov2640', 'ov5647', 'csi', 'capture'],
  touch: ['touch', 'gt911', 'ft6336', 'capacitive'],
  led: ['ws2812', 'neopixel', 'rgb', 'led_strip', 'rmt'],
  wifi: ['wifi', 'esp_wifi', 'network', 'http', 'mqtt'],
  bluetooth: ['bluetooth', 'ble', 'bluedroid', 'nimble'],
}

// 芯片检测规则 (从 sdkconfig 或其他配置文件)
const CHIP_DETECTION_RULES = [
  { pattern: /CONFIG_IDF_TARGET="?(esp32s3|ESP32S3)"?/i, name: 'ESP32-S3', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32s2|ESP32S2)"?/i, name: 'ESP32-S2', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32c3|ESP32C3)"?/i, name: 'ESP32-C3', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32c5|ESP32C5)"?/i, name: 'ESP32-C5', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32c6|ESP32C6)"?/i, name: 'ESP32-C6', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32p4|ESP32P4)"?/i, name: 'ESP32-P4', manufacturer: 'Espressif' },
  { pattern: /CONFIG_IDF_TARGET="?(esp32|ESP32)"?/i, name: 'ESP32', manufacturer: 'Espressif' },
  { pattern: /SOC_SF32LB52/i, name: 'SF32LB52X', manufacturer: 'SiFli' },
  { pattern: /SOC_SF32LB55/i, name: 'SF32LB55X', manufacturer: 'SiFli' },
  { pattern: /SOC_SF32LB56/i, name: 'SF32LB56X', manufacturer: 'SiFli' },
  { pattern: /SOC_SF32LB58/i, name: 'SF32LB58X', manufacturer: 'SiFli' },
  { pattern: /board\s*=\s*esp32/i, name: 'ESP32', manufacturer: 'Espressif' },
  { pattern: /board\s*=\s*esp32s3/i, name: 'ESP32-S3', manufacturer: 'Espressif' },
]

// 框架版本检测
const VERSION_PATTERNS = [
  { pattern: /CONFIG_IDF_TARGET_.*=y/g, framework: 'ESP-IDF' },
  { pattern: /platform\s*=\s*espressif32@([\d.]+)/i, framework: 'PlatformIO', versionGroup: 1 },
  { pattern: /RT-Thread\s+v?([\d.]+)/i, framework: 'RT-Thread', versionGroup: 1 },
]

export class ProjectImporter {
  // 这个类在 Electron 主进程中使用
  // 这里只定义接口，实际实现需要在主进程
}

// 辅助函数：从文件内容推断外设
export function detectPeripheralsFromContent(content: string): string[] {
  const detected: string[] = []
  const lowerContent = content.toLowerCase()
  
  for (const [category, keywords] of Object.entries(PERIPHERAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        if (!detected.includes(category)) {
          detected.push(category)
        }
        break
      }
    }
  }
  
  return detected
}

// 辅助函数：检测芯片类型
export function detectChipFromContent(content: string): { name: string; manufacturer: string } | null {
  for (const rule of CHIP_DETECTION_RULES) {
    if (rule.pattern.test(content)) {
      return { name: rule.name, manufacturer: rule.manufacturer }
    }
  }
  return null
}

// 辅助函数：生成配置模板名称建议
export function suggestTemplateName(
  chip?: { name: string },
  peripherals?: string[]
): string {
  const parts: string[] = []
  
  if (chip) {
    parts.push(chip.name)
  }
  
  if (peripherals && peripherals.length > 0) {
    // 取最重要的几个外设
    const importantPeripherals = peripherals.slice(0, 2).map(p => {
      const nameMap: Record<string, string> = {
        display: '显示',
        sensor: '传感器',
        audio: '音频',
        camera: '摄像头',
        touch: '触摸',
        led: 'LED',
        wifi: 'WiFi',
        bluetooth: '蓝牙',
      }
      return nameMap[p] || p
    })
    parts.push(importantPeripherals.join('+'))
  }
  
  if (parts.length === 0) {
    return '配置模板'
  }
  
  return parts.join(' - ') + ' 配置'
}

// 导出项目类型规则供 UI 使用
export const PROJECT_TYPES = PROJECT_TYPE_RULES.map(r => r.name)

export const DETECTABLE_PERIPHERALS = Object.keys(PERIPHERAL_KEYWORDS)
