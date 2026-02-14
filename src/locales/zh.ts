// 中文翻译
export const zh = {
  // 通用
  common: {
    save: '保存',
    cancel: '取消',
    confirm: '确定',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '提示',
    yes: '是',
    no: '否',
    all: '全部',
    none: '无',
    reset: '重置',
    refresh: '刷新',
    close: '关闭',
    open: '打开',
    copy: '复制',
    paste: '粘贴',
    settings: '设置',
  },

  // 菜单
  menu: {
    dashboard: '仪表盘',
    projects: '项目管理',
    knowledge: '知识库',
    notes: '笔记',
    devLibrary: '开发库',
    templateSettings: '模板设置',
  },

  // 头部
  header: {
    search: '搜索',
    searchPlaceholder: '搜索 (⌘K)',
    theme: '主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeAuto: '跟随系统',
    language: '语言',
  },

  // 仪表盘
  dashboard: {
    title: '开发中枢',
    subtitle: '统一管理开发经验、知识和项目',
    quickStats: '快速统计',
    totalProjects: '项目总数',
    totalKnowledge: '知识条目',
    totalNotes: '笔记数量',
    pendingSync: '待同步',
    recentActivity: '最近活动',
    quickActions: '快捷操作',
  },

  // 项目管理
  projects: {
    title: '项目管理',
    addProject: '添加项目',
    importProject: '导入项目',
    batchImport: '批量导入',
    projectName: '项目名称',
    projectPath: '项目路径',
    projectType: '项目类型',
    chip: '芯片',
    framework: '框架',
    description: '描述',
    tags: '标签',
    status: '状态',
    active: '活跃',
    archived: '归档',
    lastActivity: '最后活动',
    documentCount: '文档数',
    initNexus: '初始化 .nexus',
    syncToKnowledge: '同步到知识库',
    openInCursor: '在 Cursor 中打开',
    openInFinder: '在访达中打开',
    deleteProject: '删除项目',
    confirmDelete: '确定要删除此项目吗？',
    noProjects: '暂无项目',
    addFirstProject: '添加你的第一个项目',
    pathChanged: '检测到 {count} 个项目路径变化，已自动更新',
  },

  // 项目类型
  projectTypes: {
    all: '全部',
    mcu: 'MCU 嵌入式',
    ai: 'AI / ML',
    software: '软件开发',
    linux: 'Linux',
    other: '其他',
  },

  // 知识库
  knowledge: {
    title: '知识库',
    searchKnowledge: '搜索知识库...',
    categories: '分类',
    debug: '调试经验',
    snippet: '代码片段',
    note: '开发笔记',
    config: '配置备份',
    allCategories: '全部分类',
    noResults: '没有找到相关内容',
    totalItems: '共 {count} 条',
  },

  // 笔记
  notes: {
    title: '笔记',
    newNote: '新建笔记',
    searchNotes: '搜索笔记...',
    untitled: '无标题',
    lastModified: '最后修改',
    confirmDelete: '确定删除这条笔记吗？',
  },

  // 开发库 (GitHub)
  devLibrary: {
    title: '开发库',
    searchRepos: '搜索仓库...',
    starred: '已收藏',
    clone: '克隆',
    openGitHub: '在 GitHub 打开',
    category: '分类',
    allCategories: '全部',
  },

  // 模板设置
  settings: {
    title: '模板设置',
    subtitle: '自定义 .nexus 目录中文档的格式和内容',
    saveConfig: '保存配置',
    resetDefault: '恢复默认',
    confirmReset: '确定恢复默认配置吗？',
    resetWarning: '所有自定义修改将丢失',
    configSaved: '模板配置已保存',
    configReset: '已恢复默认配置',
    frontmatterFields: 'Frontmatter 字段',
    contentTemplate: '内容模板 (Markdown)',
    aiPrompt: 'AI 生成指导',
    aiPromptTip: '当用户让 AI 记录经验时，AI 会参考这个 prompt',
    fieldName: '字段名(英文)',
    fieldLabel: '显示名',
    fieldType: '类型',
    fieldRequired: '必填',
    fieldOptional: '可选',
    addField: '添加字段',
    fieldTypes: {
      text: '单行文本',
      textarea: '多行文本',
      tags: '标签',
      select: '下拉选择',
      number: '数字',
      date: '日期',
      boolean: '开关',
    },
    generalSettings: '通用设置',
    autoTimestamp: '自动添加时间戳',
    autoTimestampDesc: '创建文档时自动添加 created 字段',
    aiAnalysis: '启用 AI 分析',
    aiAnalysisDesc: '同步时使用 AI 自动分析和补充文档',
    defaultTags: '默认标签',
    defaultTagsPlaceholder: '输入标签后按回车',
    versionHistory: '版本历史与项目记录',
    currentVersion: '当前版本',
    modifyHistory: '版本修改历史',
    noModifyHistory: '暂无修改记录',
    modifyHistoryTip: '修改模板配置并保存后，会自动记录版本历史',
    projectUsage: '项目使用记录',
    noProjectUsage: '暂无项目记录',
    projectUsageTip: '初始化新项目时，会记录使用的模板版本',
    initializedAt: '初始化于',
    templateGuide: '模板配置说明',
    templateGuideItems: [
      'Frontmatter 字段：定义文档的元数据字段（如标题、标签、分类等）',
      '内容模板：定义 Markdown 文档的结构',
      'AI 生成指导：当你让 AI 记录经验时，AI 会参考这个 prompt 生成内容',
    ],
  },

  // 同步
  sync: {
    syncing: '同步中...',
    syncComplete: '同步完成',
    syncFailed: '同步失败',
    cancelSync: '终止同步',
    imported: '已导入',
    updated: '已更新',
  },

  // 引导
  onboarding: {
    welcome: '欢迎使用 Nexus',
    step1Title: '管理项目',
    step1Desc: '导入和管理你的开发项目',
    step2Title: '记录经验',
    step2Desc: '在项目中使用 .nexus 记录调试经验和代码片段',
    step3Title: '同步知识',
    step3Desc: '将项目经验同步到全局知识库',
    getStarted: '开始使用',
    skip: '跳过',
    next: '下一步',
    prev: '上一步',
  },

  // 时间
  time: {
    justNow: '刚刚',
    minutesAgo: '{n} 分钟前',
    hoursAgo: '{n} 小时前',
    daysAgo: '{n} 天前',
    monthsAgo: '{n} 个月前',
    yearsAgo: '{n} 年前',
  },
}

export type Locale = typeof zh
