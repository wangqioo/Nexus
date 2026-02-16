# 码迹（Nexus）v2.0

**项目管理 + 开发经验管理** - 多种方式导入、自动分类、概括名与简介一目了然，从项目创建到知识沉淀的完整工作流

## 核心理念

- **项目管理**：多种灵活方式导入项目（本地 / GitHub / 批量扫描），AI 自动分析类型并分类归档，生成**项目概括名**和**项目简介**，在列表里一目了然。
- **经验管理**：导入 → 智谱 AI 初始化 → Cursor 开发（自动记录）→ 回到码迹一键同步到知识库，下次复用。

```
导入项目（多种方式）→ AI 分类 + 概括名/简介 → Cursor 开发(自动记录) → 一键同步知识库
```

## 功能特性

### 项目管理
- **多种导入方式**：本地文件夹、GitHub 仓库、批量扫描父目录，灵活适配你的习惯
- **AI 自动分类**：识别项目类型（MCU、AI、软件、Linux、移动端、远程等），自动归档；无法归类时可创建新类型或按推荐占比选择
- **概括名与简介**：导入时 AI 生成项目概括名和项目简介，卡片上一目了然
- **在 Cursor 打开**：从码迹直接启动 IDE 开发

### .nexus 目录（项目级知识库）
每个项目的 `.nexus/` 目录存储开发经验（所有项目共用同一份模板配置）：

```
.nexus/
├── project.yaml     # 项目配置（含 projectType）
├── notes/           # 开发笔记（仅同步到笔记库，在笔记面板展示）
├── debug/           # 调试经验
├── snippets/        # 代码片段
├── configs/         # 配置模板
└── other/           # 其他
```

### Cursor Skills（开发时自动记录）
在 Cursor 中开发时，AI 可以帮你记录：

| 命令 | 功能 | 保存位置 |
|------|------|----------|
| "帮我记录这个调试经验" | 记录 bug 修复过程 | `.nexus/debug/` |
| "把这段代码保存到 nexus" | 保存代码片段 | `.nexus/snippets/` |
| "记个笔记" | 记录知识点 | `.nexus/notes/` |

### 全局知识库
项目经验同步到 `~/.nexus/knowledge/`，按**项目类型**分目录、**扁平**存放（固定 4 类：调试经验、代码片段、配置模板、其他）：

```
~/.nexus/knowledge/
├── mcu/             # 各类型下直接为 *.json，不再分子目录
├── ai/
├── software/
├── linux/
├── mobile/
├── remote/
└── ...              # 自定义类型同理会自动建目录
```
笔记单独存放在 `~/.nexus/notes/`，仅在笔记面板展示。

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

**方式三：批量扫描**
1. 点击「批量扫描」
2. 选择包含多个项目的父目录
3. 确认列表后点击「开始导入」（每个项目都会经 AI 分析后归档）

三种方式均会先 AI 分析项目类型；若无法归类会提示「创建新类型」或「按推荐占比归属到已有类型」。

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

## 发布到 GitHub

项目可直接推送到 GitHub 分享给他人：

1. **在 GitHub 新建仓库**（如 `your-username/nexus`），不要勾选「Add .gitignore」等（本仓库自带）。
2. **本地初始化并推送**（若尚未 git init）：
   ```bash
   cd /path/to/Nexus
   git init
   git add .
   git commit -m "feat: Nexus v2.0"
   git branch -M main
   git remote add origin https://github.com/your-username/nexus.git
   git push -u origin main
   ```
3. **他人使用**：clone 后 `npm install`，首次打开在「设置」中配置智谱 API Key，然后 `npm run electron:dev` 或按下面构建安装包。

注意：智谱 API Key、`~/.nexus/` 下的数据均不会进仓库，他人需自行申请 Key 并在应用内填写。

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run electron:dev

# 构建 macOS
npm run electron:build:mac
```

调试时若终端出现 **TSM AdjustCapsLockLED** 等 macOS 系统提示，可忽略，不影响功能。

## 数据存储

```
~/.nexus/
├── knowledge/       # 全局知识库
│   ├── mcu/
│   ├── ai/
│   └── ...
├── notes/           # 独立笔记
├── projects/        # 项目索引
└── config.json      # 配置（智谱 API Key 等，不随项目分享；他人 clone 后需在「设置」中填写自己的 Key）
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

## 开源与隐私

- **个人数据与配置**（API Key、项目列表、开发库配置等）均存放在 `~/.nexus/`，**不会随仓库提交**。
- 仓库中已去除个人路径，类型目录与开发库路径均基于 `os.homedir()` 与默认 `~/Workshop/...`，克隆后可在本机直接使用。
- 若曾将 `*_analysis.json`、`docs/wq-projects-overview.md` 等提交过，可执行 `git rm --cached` 后不再跟踪。
