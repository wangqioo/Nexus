# Nexus - 全栈项目开发经验管理中枢

## 项目概述

**Nexus** 是一个跨平台桌面应用，专为全栈开发者设计，用于管理和积累跨多种项目类型的开发经验。它解决了开发者在多个项目间频繁切换时，经验难以沉淀和复用的痛点。

### 核心价值

> **"在项目中记录经验，在知识库中复用经验"**

- 🎯 **统一管理** - 一个应用管理 MCU、AI、Web、Linux、移动端等所有类型项目
- 🔄 **双向同步** - 项目 `.nexus` 目录 ↔ 全局知识库
- 🤖 **AI 驱动** - 智谱 AI 自动分析项目、生成文档、分类笔记
- 🔍 **快速检索** - 全局模糊搜索，⌘K 快捷键即达

---

## 技术架构

### 技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                      Nexus 技术架构                          │
├─────────────────────────────────────────────────────────────┤
│  前端 (Renderer Process)                                    │
│  ├── React 18 + TypeScript                                  │
│  ├── Ant Design 5 (UI 组件库)                               │
│  ├── React Router 6 (路由)                                  │
│  ├── Fuse.js (模糊搜索)                                     │
│  └── CSS Modules (样式隔离)                                 │
├─────────────────────────────────────────────────────────────┤
│  后端 (Main Process)                                        │
│  ├── Electron 28 (桌面框架)                                 │
│  ├── Node.js 文件系统 API                                   │
│  ├── 智谱 AI API (glm-4-flash)                              │
│  └── Git 命令行集成                                         │
├─────────────────────────────────────────────────────────────┤
│  构建工具                                                   │
│  ├── Vite 5 (开发/构建)                                     │
│  ├── esbuild (Electron 代码编译)                            │
│  └── electron-builder (打包分发)                            │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
Nexus/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口 (IPC、文件操作、AI调用)
│   └── preload.ts               # 预加载脚本 (安全暴露API)
├── src/                         # 前端源码
│   ├── App.tsx                  # 应用入口
│   ├── main.tsx                 # React 挂载点
│   ├── types/index.ts           # 类型定义 (核心数据模型)
│   ├── contexts/                # React Context
│   │   └── SyncContext.tsx      # 全局同步状态管理
│   ├── services/                # 服务层
│   │   ├── storage.ts           # 数据存储 (知识库/笔记 CRUD)
│   │   ├── search.ts            # 全局搜索服务
│   │   └── importer.ts          # 项目导入服务
│   ├── components/              # 通用组件
│   │   ├── Layout/              # 应用布局 (侧边栏+内容区)
│   │   ├── SearchBar/           # 全局搜索模态框
│   │   ├── Onboarding/          # 新手引导
│   │   └── Icons/               # 项目类型图标
│   └── pages/                   # 页面组件
│       ├── Dashboard/           # 仪表盘 (概览+一键同步)
│       ├── Projects/            # 项目管理 (核心页面)
│       ├── Knowledge/           # 知识库
│       ├── Notes/               # 笔记
│       ├── GitHub/              # GitHub 仓库管理
│       └── Settings/            # 模板配置
└── ~/.nexus/                    # 用户数据目录
    ├── knowledge/               # 知识库存储
    │   ├── mcu/                 # MCU 类型知识
    │   ├── ai/                  # AI 类型知识
    │   ├── software/            # 软件类型知识
    │   └── ...
    ├── notes/                   # 笔记存储
    ├── local-projects.json      # 项目列表
    └── config.json              # 应用配置
```

---

## 核心功能模块

### 1. 项目管理 (Projects)

**功能**：导入、管理、同步本地项目

```
┌─────────────────────────────────────────────────────────────┐
│                     项目管理流程                             │
├─────────────────────────────────────────────────────────────┤
│  1. 导入项目                                                │
│     ├── 本地文件夹导入                                      │
│     ├── GitHub 仓库克隆                                     │
│     └── AI 自动分析 (芯片/框架/外设/项目类型)               │
│                                                             │
│  2. 初始化 .nexus 目录                                      │
│     project/                                                │
│     └── .nexus/                                             │
│         ├── project.yaml       # 项目配置                   │
│         ├── debug/             # 调试经验 (.md)             │
│         ├── notes/             # 开发笔记 (.md)             │
│         ├── snippets/          # 代码片段 (.md)             │
│         └── configs/           # 配置模板 (.md)             │
│                                                             │
│  3. 同步到知识库                                            │
│     .nexus/*.md  ──AI分析──>  ~/.nexus/knowledge/           │
│                  ──AI分析──>  ~/.nexus/notes/               │
└─────────────────────────────────────────────────────────────┘
```

**支持的项目类型**：

| 类型 | 图标 | 知识分类 |
|------|------|----------|
| MCU/嵌入式 | 🎛️ | 调试经验、代码片段、外设驱动、芯片平台、配置模板 |
| AI/ML | 🤖 | 模型配置、训练经验、推理部署、数据处理、Prompt工程 |
| 软件/Web | 💻 | 架构设计、API设计、数据库、部署配置、调试经验 |
| Linux平台 | 🐧 | 系统配置、驱动开发、网络配置、交叉编译、调试经验 |
| 移动端 | 📱 | UI组件、原生能力、网络通信、性能优化、调试经验 |
| 远程设备 | 🌐 | 连接配置、部署脚本、监控运维、排障经验 |

### 2. 知识库 (Knowledge)

**功能**：浏览、搜索、管理所有项目类型的开发经验

**特点**：
- 按项目类型一级筛选 (MCU/AI/Web...)
- 按知识分类二级筛选 (调试/代码/配置...)
- 全文模糊搜索
- Markdown 内容渲染
- 双向索引 (知识 ↔ 项目)

### 3. 笔记 (Notes)

**功能**：管理独立于项目的开发笔记

**分类体系**：

| 分类 | 图标 | 说明 |
|------|------|------|
| 学习笔记 | 📖 | 技术学习、文档阅读、课程记录 |
| 开发总结 | 📋 | 项目复盘、阶段总结、功能开发记录 |
| 方案设计 | 🏗️ | 架构设计、技术选型、方案对比 |
| 问题记录 | ⚠️ | 踩坑记录、升级迁移、兼容性问题 |
| 参考手册 | 📚 | 速查表、API参考、配置说明 |

### 4. 一键同步 (Dashboard)

**功能**：批量同步所有待同步项目的经验到知识库

```
┌─────────────────────────────────────────────────────────────┐
│                     同步流程                                 │
├─────────────────────────────────────────────────────────────┤
│  1. 检测待同步                                              │
│     扫描所有项目的 .nexus 目录，检测未同步的文档            │
│                                                             │
│  2. AI 分析                                                 │
│     对每个文档调用智谱 AI：                                 │
│     - 提取标题、标签、分类                                  │
│     - 笔记自动分类 (learning/summary/design/issue/reference)│
│     - 知识自动归类到对应项目类型                            │
│                                                             │
│  3. 写入知识库                                              │
│     - 知识条目 → ~/.nexus/knowledge/{type}/{category}/      │
│     - 笔记 → ~/.nexus/notes/                                │
│     - 建立项目双向索引 (projectPath, projectName)           │
│                                                             │
│  4. 进度显示                                                │
│     全局进度条 (双层：总进度 + 当前项目进度)                │
└─────────────────────────────────────────────────────────────┘
```

### 5. 全局搜索

**快捷键**：`⌘K` / `Ctrl+K`

**实现**：基于 Fuse.js 的模糊搜索
- 搜索范围：知识库 + 笔记
- 搜索字段：标题、内容、标签
- 结果排序：按匹配分数

---

## 数据模型

### 核心类型定义

```typescript
// 项目类型
type ProjectType = 'mcu' | 'ai' | 'software' | 'linux' | 'mobile' | 'remote'

// 本地项目
interface LocalProject {
  id: string
  name: string
  path: string
  description?: string
  summary?: string                // AI 生成的详细介绍
  features?: string[]             // 主要功能特性
  projectType: ProjectType
  // MCU 特有
  chip?: string
  framework?: string
  peripherals?: string[]
  // 通用
  tags: string[]
  hasSil: boolean                 // 是否已初始化 .nexus
  documentCount: number
  pendingCount?: number           // 待同步文档数
  status: 'active' | 'archived'
}

// 知识条目
interface KnowledgeEntry {
  id: string
  title: string
  content: string                 // Markdown
  projectType: ProjectType
  category: string                // 分类 ID
  tags: string[]
  severity?: 'critical' | 'major' | 'minor' | 'trivial'
  // 双向索引
  projectName?: string
  projectPath?: string
  // 时间
  createdAt: string
  updatedAt: string
  isNew?: boolean                 // 未读标记
}

// 笔记
interface Note {
  id: string
  title: string
  content: string                 // Markdown
  category?: string               // learning/summary/design/issue/reference
  tags: string[]
  // 双向索引
  projectName?: string
  projectPath?: string
  createdAt: string
  updatedAt: string
  isNew?: boolean
}
```

---

## 进程通信 (IPC)

### 架构图

```
┌─────────────────┐         IPC          ┌─────────────────┐
│  Renderer       │  ←──────────────────→ │  Main Process   │
│  (React UI)     │                       │  (Node.js)      │
├─────────────────┤                       ├─────────────────┤
│ window.         │  ipcRenderer.invoke   │ ipcMain.handle  │
│ electronAPI.    │ ──────────────────→   │                 │
│ readFile()      │                       │ fs.readFileSync │
│ syncFromProject │                       │ AI API 调用     │
│ ...             │  ←──────────────────  │ Git 操作        │
└─────────────────┘   Promise<Result>     └─────────────────┘
```

### 主要 IPC 接口

| 接口 | 功能 |
|------|------|
| `fs:readFile` | 读取 ~/.nexus 目录下的文件 |
| `fs:writeFile` | 写入文件 |
| `fs:listFiles` | 列出目录内容 |
| `project:analyze` | 分析项目结构 |
| `sil:syncFrom` | 从项目同步到知识库 |
| `sil:checkPending` | 检测待同步文档 |
| `ai:analyzeLocalProject` | AI 分析本地项目 |
| `git:clone` | 克隆 GitHub 仓库 |
| `shell:openInCursor` | 在 Cursor 中打开项目 |

---

## 状态管理

### SyncContext (全局同步状态)

```typescript
interface SyncContextType {
  syncing: boolean                        // 是否正在同步
  syncProgress: SyncProgress | null       // 单项目进度
  batchProgress: BatchSyncProgress | null // 批量同步进度
  startSync: (step: string, total?: number, batchMode?: boolean) => void
  updateProgress: (progress: SyncProgress) => void
  updateBatchProgress: (progress: BatchSyncProgress) => void
  endSync: () => void
  cancelSync: () => void                  // 取消同步
  isCancelled: () => boolean
}
```

---

## 工作流示例

### 典型使用场景

```
1. 开发者在 ESP32 项目中遇到 I2C 通信问题
   ↓
2. 在项目 .nexus/debug/ 目录写一篇 i2c-issue.md
   ↓
3. 打开 Nexus，点击"同步"按钮
   ↓
4. AI 自动分析：
   - 标题：ESP32 I2C 通信超时问题
   - 分类：debug (调试经验)
   - 标签：ESP32, I2C, 超时
   ↓
5. 知识同步到 ~/.nexus/knowledge/mcu/debug/
   ↓
6. 下次遇到类似问题，⌘K 搜索 "I2C 超时" 即可找到
```

---

## 特色功能

### 1. AI 智能分析

- **项目分析**：自动识别芯片型号、开发框架、外设列表、项目类型
- **文档分析**：提取标题、标签、分类
- **笔记分类**：根据内容自动归类到 5 种笔记类型

### 2. 双向索引

- 从知识库/笔记可以快速跳转到关联项目
- 从项目详情可以查看所有已同步的文档

### 3. 模板系统

- 可自定义文档模板 (调试经验、代码片段、笔记、配置)
- 支持自定义 frontmatter 字段
- AI 生成时使用自定义 prompt

### 4. 多类型支持

- 单一应用管理 6 种不同类型的项目
- 每种类型有专属的知识分类体系
- 统一的搜索和浏览体验

---

## 部署与使用

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run electron:dev
```

### 打包发布

```bash
# macOS
npm run electron:build:mac

# Windows
npm run electron:build:win

# Linux
npm run electron:build:linux
```

### 数据存储

所有用户数据存储在 `~/.nexus/` 目录：
- 知识库：`knowledge/{projectType}/{category}/*.json`
- 笔记：`notes/*.json`
- 项目列表：`local-projects.json`
- 配置：`config.json`

---

## 版本信息

- **当前版本**：v2.0.0
- **UI 版本**：v5.0
- **Electron**：28.x
- **React**：18.x
- **Ant Design**：5.x

---

## 总结

Nexus 是一个面向全栈开发者的**个人知识管理工具**，通过：

1. **项目级经验记录** (.nexus 目录)
2. **AI 智能分析** (智谱 glm-4-flash)
3. **全局知识库** (统一存储和检索)
4. **双向索引** (项目 ↔ 知识)

实现了**在项目中积累经验，在知识库中复用经验**的核心目标。
