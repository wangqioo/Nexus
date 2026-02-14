// ============================================================
// Nexus 搜索服务 v3.0
// 基于 Fuse.js 的全局模糊搜索
// 统一使用知识库 API
// ============================================================

import { useCallback } from 'react'
import Fuse from 'fuse.js'
import { storage } from './storage'
import type { SearchResult, KnowledgeEntry, Note } from '../types'
import { KNOWLEDGE_CATEGORIES } from '../types'

const fuseOptions = {
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
}

export function useSearch() {
  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return []

    const results: SearchResult[] = []

    // 搜索知识库 (统一入口)
    const knowledge = await storage.listAllKnowledge()
    const knowledgeFuse = new Fuse(knowledge, {
      ...fuseOptions,
      keys: ['title', 'content', 'tags', 'category']
    })

    // 分类到 SearchResult type 的映射（覆盖所有项目类型的分类）
    const typeMap: Record<string, SearchResult['type']> = {
      // MCU 类型
      platform: 'platform',
      peripheral: 'peripheral',
      snippet: 'snippet',
      debug: 'debug',
      config: 'config',
      // AI 类型
      model: 'config',
      training: 'debug',
      inference: 'snippet',
      dataset: 'config',
      prompt: 'snippet',
      // Software 类型
      architecture: 'platform',
      api: 'snippet',
      database: 'config',
      deployment: 'config',
      // Linux 类型
      system: 'platform',
      driver: 'peripheral',
      network: 'config',
      'cross-compile': 'config',
      // Mobile 类型
      ui: 'snippet',
      native: 'peripheral',
      performance: 'debug',
      // Remote 类型
      connection: 'config',
      monitoring: 'debug',
    }

    knowledgeFuse.search(query).forEach(result => {
      const item = result.item as KnowledgeEntry
      const cats = KNOWLEDGE_CATEGORIES[item.projectType] || []
      const catName = cats.find(c => c.id === item.category)?.name || item.category

      results.push({
        type: typeMap[item.category] || 'platform',
        id: item.id,
        title: item.title,
        subtitle: catName,
        preview: item.content.replace(/[#*`]/g, '').slice(0, 100),
        score: result.score
      })
    })

    // 搜索笔记
    const notes = await storage.listNotes()
    const noteFuse = new Fuse(notes, {
      ...fuseOptions,
      keys: ['title', 'content', 'tags']
    })
    noteFuse.search(query).forEach(result => {
      const item = result.item as Note
      results.push({
        type: 'note',
        id: item.id,
        title: item.title,
        preview: item.content.replace(/[#*`]/g, '').slice(0, 100),
        score: result.score
      })
    })

    // 按分数排序
    results.sort((a, b) => (a.score || 1) - (b.score || 1))

    return results.slice(0, 25)
  }, [])

  return { search }
}
