// ============================================================
// 项目删除时的数据清理服务
// 删除项目时清理关联的知识库条目和笔记
// ============================================================

import { storage } from './storage'
import { logger } from '../utils/logger'
import type { KnowledgeEntry, Note } from '../types'

/**
 * 删除项目时清理关联的知识库条目和笔记
 */
export async function cleanupProjectData(projectPath: string, projectName: string): Promise<{
  deletedKnowledge: number
  deletedNotes: number
  errors: string[]
}> {
  const errors: string[] = []
  let deletedKnowledge = 0
  let deletedNotes = 0

  try {
    // 获取项目关联的所有文档
    const docs = await storage.getDocumentsByProject(projectPath)

    // 删除知识库条目
    for (const entry of docs.knowledge) {
      try {
        await storage.deleteKnowledgeEntry(entry)
        deletedKnowledge++
      } catch (error: any) {
        const errorMsg = `删除知识库条目失败: ${entry.id} - ${error.message}`
        errors.push(errorMsg)
        logger.error(errorMsg)
      }
    }

    // 删除笔记
    for (const note of docs.notes) {
      try {
        await storage.deleteNote(note.id)
        deletedNotes++
      } catch (error: any) {
        const errorMsg = `删除笔记失败: ${note.id} - ${error.message}`
        errors.push(errorMsg)
        logger.error(errorMsg)
      }
    }

    logger.info(`项目数据清理完成: ${projectName} - 删除 ${deletedKnowledge} 条知识, ${deletedNotes} 条笔记`)
  } catch (error: any) {
    const errorMsg = `清理项目数据失败: ${error.message}`
    errors.push(errorMsg)
    logger.error(errorMsg)
  }

  return {
    deletedKnowledge,
    deletedNotes,
    errors,
  }
}
