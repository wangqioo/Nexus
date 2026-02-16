// English translations
import type { Locale } from './zh'

export const en: Locale = {
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    reset: 'Reset',
    refresh: 'Refresh',
    close: 'Close',
    open: 'Open',
    copy: 'Copy',
    paste: 'Paste',
    settings: 'Settings',
  },

  // Menu
  menu: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    knowledge: 'Knowledge',
    notes: 'Notes',
    devLibrary: 'Dev Library',
    templateSettings: 'Templates',
  },

  // Header
  header: {
    search: 'Search',
    searchPlaceholder: 'Search (⌘K)',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'System',
    language: 'Language',
  },

  // Dashboard
  dashboard: {
    title: 'Dev Hub',
    subtitle: 'Manage your development experience, knowledge and projects',
    quickStats: 'Quick Stats',
    totalProjects: 'Projects',
    totalKnowledge: 'Knowledge',
    totalNotes: 'Notes',
    pendingSync: 'Pending',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
  },

  // Projects
  projects: {
    title: 'Projects',
    addProject: 'Add Project',
    importProject: 'Import Project',
    batchImport: 'Batch Import',
    projectName: 'Project Name',
    projectPath: 'Project Path',
    projectType: 'Project Type',
    chip: 'Chip',
    framework: 'Framework',
    description: 'Description',
    tags: 'Tags',
    status: 'Status',
    active: 'Active',
    archived: 'Archived',
    lastActivity: 'Last Activity',
    documentCount: 'Documents',
    initNexus: 'Initialize .nexus',
    syncToKnowledge: 'Sync to Knowledge',
    openInCursor: 'Open in Cursor',
    openInFinder: 'Open in Finder',
    deleteProject: 'Delete Project',
    confirmDelete: 'Are you sure you want to delete this project?',
    noProjects: 'No projects yet',
    addFirstProject: 'Add your first project',
    pathChanged: 'Detected {count} project path changes, auto-updated',
  },

  // Project Types
  projectTypes: {
    all: 'All',
    mcu: 'MCU Embedded',
    ai: 'AI / ML',
    software: 'Software',
    linux: 'Linux',
    other: 'Other',
  },

  // Knowledge
  knowledge: {
    title: 'Knowledge Base',
    searchKnowledge: 'Search knowledge...',
    categories: 'Categories',
    debug: 'Debug Experience',
    snippet: 'Code Snippets',
    note: 'Dev Notes',
    config: 'Config Backup',
    allCategories: 'All Categories',
    noResults: 'No results found',
    totalItems: '{count} items',
  },

  // Notes
  notes: {
    title: 'Notes',
    newNote: 'New Note',
    searchNotes: 'Search notes...',
    untitled: 'Untitled',
    lastModified: 'Last modified',
    confirmDelete: 'Are you sure you want to delete this note?',
  },

  // Dev Library (GitHub)
  devLibrary: {
    title: 'Dev Library',
    subtitle: 'Quick links to chip vendor example code—open or clone with one click.',
    searchRepos: 'Search repositories...',
    starred: 'Starred',
    clone: 'Clone',
    openGitHub: 'Open in GitHub',
    category: 'Category',
    allCategories: 'All',
  },

  // Template Settings
  settings: {
    title: 'Template Settings',
    subtitle: 'Customize document format and content in .nexus directory',
    saveConfig: 'Save Config',
    resetDefault: 'Reset Default',
    confirmReset: 'Reset to default configuration?',
    resetWarning: 'All custom modifications will be lost',
    configSaved: 'Template configuration saved',
    configReset: 'Reset to default configuration',
    frontmatterFields: 'Frontmatter Fields',
    contentTemplate: 'Content Template (Markdown)',
    aiPrompt: 'AI Generation Guide',
    aiPromptTip: 'AI will reference this prompt when recording experiences',
    fieldName: 'Field Name',
    fieldLabel: 'Display Label',
    fieldType: 'Type',
    fieldRequired: 'Required',
    fieldOptional: 'Optional',
    addField: 'Add Field',
    fieldTypes: {
      text: 'Single Text',
      textarea: 'Multi-line Text',
      tags: 'Tags',
      select: 'Dropdown',
      number: 'Number',
      date: 'Date',
      boolean: 'Toggle',
    },
    generalSettings: 'General Settings',
    autoTimestamp: 'Auto Timestamp',
    autoTimestampDesc: 'Auto add created field when creating documents',
    aiAnalysis: 'Enable AI Analysis',
    aiAnalysisDesc: 'Use AI to analyze and enhance documents during sync',
    defaultTags: 'Default Tags',
    defaultTagsPlaceholder: 'Press Enter to add tags',
    versionHistory: 'Version History & Projects',
    currentVersion: 'Current Version',
    modifyHistory: 'Modification History',
    noModifyHistory: 'No modification history',
    modifyHistoryTip: 'History will be recorded when you save template changes',
    projectUsage: 'Project Usage',
    noProjectUsage: 'No project records',
    projectUsageTip: 'Records which template version is used when initializing projects',
    initializedAt: 'Initialized at',
    templateGuide: 'Template Configuration Guide',
    templateGuideItems: [
      'Frontmatter Fields: Define document metadata fields (title, tags, category, etc.)',
      'Content Template: Define the Markdown document structure',
      'AI Generation Guide: AI will reference this prompt when generating content',
    ],
  },

  // Sync
  sync: {
    syncing: 'Syncing...',
    syncComplete: 'Sync complete',
    syncFailed: 'Sync failed',
    cancelSync: 'Cancel Sync',
    imported: 'Imported',
    updated: 'Updated',
  },

  // Onboarding
  onboarding: {
    welcome: 'Welcome to Nexus',
    step1Title: 'Manage Projects',
    step1Desc: 'Import and manage your development projects',
    step2Title: 'Record Experience',
    step2Desc: 'Use .nexus to record debug experiences and code snippets',
    step3Title: 'Sync Knowledge',
    step3Desc: 'Sync project experiences to global knowledge base',
    getStarted: 'Get Started',
    skip: 'Skip',
    next: 'Next',
    prev: 'Previous',
  },

  // Time
  time: {
    justNow: 'Just now',
    minutesAgo: '{n} min ago',
    hoursAgo: '{n} hr ago',
    daysAgo: '{n} days ago',
    monthsAgo: '{n} months ago',
    yearsAgo: '{n} years ago',
  },
}
