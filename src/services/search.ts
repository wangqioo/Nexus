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

    // 知识库条目统一映射为 'knowledge' 类型
    knowledgeFuse.search(query).forEach(result => {
      const item = result.item as KnowledgeEntry
      const cats = KNOWLEDGE_CATEGORIES[item.projectType] || []
      const catName = cats.find(c => c.id === item.category)?.name || item.category

      results.push({
        type: 'knowledge',
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
