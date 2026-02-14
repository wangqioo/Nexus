# Nexus v2.0

**全栈项目开发经验管理中枢** - 从项目创建到知识沉淀的完整工作流

## 核心理念

```
Nexus 导入项目 → 智谱AI初始化 → Cursor开发(自动记录) → 回到Nexus一键同步
```

Nexus 打通了项目管理和知识沉淀的完整链路：
- **开发前**：导入项目，AI 自动分析芯片、框架、外设
- **开发中**：Cursor Skills 自动/半自动记录调试经验、代码片段、笔记
- **开发后**：一键同步到全局知识库，下次复用

## 功能特性

### 项目管理
- **GitHub 导入**：一键克隆 + 智谱 AI 分析
- **本地导入**：选择文件夹 + AI 自动识别项目信息
- **项目类型**：MCU、AI、软件、Linux、移动端、远程服务
- **在 Cursor 打开**：直接启动 IDE 开发

### .nexus 目录（项目级知识库）
每个项目的 `.nexus/` 目录存储开发经验：

```
.nexus/
├── project.yaml     # 项目配置
├── debug/           # 调试经验
├── notes/           # 开发笔记
├── snippets/        # 代码片段
└── configs/         # 配置备份
```

### Cursor Skills（开发时自动记录）
在 Cursor 中开发时，AI 可以帮你记录：

| 命令 | 功能 | 保存位置 |
|------|------|----------|
| "帮我记录这个调试经验" | 记录 bug 修复过程 | `.nexus/debug/` |
| "把这段代码保存到 nexus" | 保存代码片段 | `.nexus/snippets/` |
| "记个笔记" | 记录知识点 | `.nexus/notes/` |

### 全局知识库
项目经验同步到 `~/.nexus/knowledge/`，按类型分类：

```
~/.nexus/knowledge/
├── mcu/
│   ├── debug/       # 调试经验
│   ├── snippet/     # 代码片段
│   ├── platform/    # 平台配置
│   ├── peripheral/  # 外设驱动
│   └── config/      # 配置模板
├── ai/
├── software/
└── ...
```

### 智能分析
- **智谱 AI**：自动分析项目、提取标签、生成摘要
- **知识检索**：全局搜索历史经验
- **关联推荐**：相似问题匹配

## 使用流程

### 1. 导入项目

**方式一：从 GitHub 导入**
1. 点击「GitHub 导入」
2. 输入仓库地址（如 `https://github.com/78/xiaozhi-esp32`）
3. AI 自动分析并初始化 `.nexus` 目录

**方式二：本地导入**
1. 点击「本地导入」
2. 选择项目文件夹
3. 点击「AI 分析并添加」

### 2. 开始开发

1. 在 Nexus 中点击「在 Cursor 打开」
2. Cursor 会自动识别 `.nexus` 项目，应用相关规则
3. 开发过程中可以随时记录经验

### 3. 记录开发经验

**解决了一个 bug**：
> "帮我记录一下这个 WS2812 闪烁问题的解决方案"

**写了好用的代码**：
> "把这段 IMU 初始化代码保存到 nexus"

**学到新知识**：
> "记个笔记，I2C 时钟频率限制"

### 4. 同步到知识库

1. 回到 Nexus 应用
2. 找到项目，点击「一键导入」
3. AI 会分析并同步到全局知识库

## 技术栈

- **框架**: Electron + React 18 + TypeScript
- **UI**: Ant Design 5
- **编辑器**: Monaco Editor
- **搜索**: Fuse.js 模糊搜索
- **AI**: 智谱 GLM-4-Flash
- **构建**: Vite + esbuild

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run electron:dev

# 构建 macOS
npm run electron:build:mac
```

## 数据存储

```
~/.nexus/
├── knowledge/       # 全局知识库
│   ├── mcu/
│   ├── ai/
│   └── ...
├── notes/           # 独立笔记
├── projects/        # 项目索引
└── config.json      # 配置（API Key 等）
```

## Cursor Skills

Nexus 提供以下 Cursor Skills（位于 `~/.cursor/skills-cursor/`）：

| Skill | 功能 |
|-------|------|
| `nexus-project-rule` | 自动识别 .nexus 项目 |
| `nexus-record-debug` | 记录调试经验 |
| `nexus-record-snippet` | 记录代码片段 |
| `nexus-record-note` | 记录开发笔记 |

## 支持的平台

### 芯片
- **Espressif**: ESP32, ESP32-S2, ESP32-S3, ESP32-C3, ESP32-C5, ESP32-C6, ESP32-P4
- **SiFli**: SF32LB52X, SF32LB55X, SF32LB56X, SF32LB58X
- **Rockchip**: RK3576, RK3588
- **Canaan**: K230
- **STM**: STM32F103, STM32F407, STM32H750

### 框架
- ESP-IDF, Arduino, RT-Thread, PlatformIO, MicroPython, Zephyr, FreeRTOS

### 预置外设
- **显示**: ST7789, ST7701, WS2812, E-Paper
- **传感器**: QMI8658, MPU6050, BME280
- **音频**: ES8311, MAX98357
- **触摸**: GT911, FT6336
