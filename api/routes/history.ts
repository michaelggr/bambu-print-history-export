﻿﻿/**
 * 历史数据路由
 * 分页获取、统计、增量更新、全量下载
 */

import { Router, type Request, type Response } from 'express'
import * as bambu from '../services/bambu.js'
import * as cache from '../services/cache.js'

const router = Router()

// ---------------------------------------------------------------------------
// 工具：确保已登录，返回 token 或响应错误
// ---------------------------------------------------------------------------

function ensureToken(res: Response): string | null {
  const token = cache.loadToken()
  if (!token) {
    res.status(401).json({ success: false, error: '未登录，请先登录' })
    return null
  }
  return token
}

// ---------------------------------------------------------------------------
// 筛选与分页辅助
// ---------------------------------------------------------------------------

interface FilterParams {
  status?: string
  device?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

/** 对历史记录应用筛选条件 */
function applyFilters(
  history: bambu.BambuHistoryItem[],
  filters: FilterParams
): bambu.BambuHistoryItem[] {
  let result = history

  if (filters.status) {
    // 支持逗号分隔的多个状态值
    const statuses = filters.status.split(',').map(s => Number(s.trim()))
    result = result.filter(item => statuses.includes(item.status))
  }

  if (filters.device) {
    const deviceLower = filters.device.toLowerCase()
    result = result.filter(item =>
      (item.deviceName ?? '').toLowerCase().includes(deviceLower)
    )
  }

  if (filters.dateFrom) {
    result = result.filter(item => (item.startTime ?? '') >= filters.dateFrom!)
  }

  if (filters.dateTo) {
    // dateTo 包含当天，所以比较到当天末尾
    const to = filters.dateTo + 'T23:59:59'
    result = result.filter(item => (item.startTime ?? '') <= to)
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(item => {
      const title = (item.designTitle ?? item.title ?? '').toLowerCase()
      return title.includes(searchLower)
    })
  }

  return result
}

/** 分页处理 */
function paginate<T>(items: T[], page: number, pageSize: number): {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const data = items.slice(start, start + pageSize)

  return { data, total, page: safePage, pageSize, totalPages }
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------

/**
 * GET /api/history — 分页获取历史
 * Query: page, pageSize, status, device, dateFrom, dateTo, search
 */
router.get('/', (_req: Request, res: Response): void => {
  const history = cache.loadHistoryCache() as bambu.BambuHistoryItem[]

  // 解析筛选参数
  const filters: FilterParams = {
    status: _req.query.status as string | undefined,
    device: _req.query.device as string | undefined,
    dateFrom: _req.query.dateFrom as string | undefined,
    dateTo: _req.query.dateTo as string | undefined,
    search: _req.query.search as string | undefined,
  }

  // 应用筛选
  const filtered = applyFilters(history, filters)

  // 按时间倒序排列（最新的在前）
  filtered.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''))

  // 分页
  const page = Number(_req.query.page) || 1
  const pageSize = Number(_req.query.pageSize) || 20
  const result = paginate(filtered, page, pageSize)

  // 提取全部设备列表（从完整历史中，非筛选后）
  const deviceSet = new Set<string>()
  for (const item of history) {
    if (item.deviceName) deviceSet.add(item.deviceName)
  }

  res.json({ success: true, data: result, devices: Array.from(deviceSet).sort() })
})

/**
 * GET /api/history/stats — 获取统计数据
 */
router.get('/stats', (_req: Request, res: Response): void => {
  const history = cache.loadHistoryCache() as bambu.BambuHistoryItem[]
  const stats = bambu.calculateStats(history)
  res.json({ success: true, data: stats })
})

/**
 * POST /api/history/refresh — 增量更新
 * Body: { existingIds?: string[] }（可选，默认从缓存加载）
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const token = ensureToken(res)
  if (!token) return

  // 合并 existingIds：请求传入 + 缓存中的
  const requestIds = (req.body.existingIds as string[] | undefined) ?? []
  const cachedIds = cache.loadExistingIds()
  const allIds = new Set([...cachedIds, ...requestIds])

  const newItems = await bambu.fetchHistory(token, allIds)
  if (newItems.length === 0) {
    res.json({ success: true, data: { added: 0, message: '没有新记录' } })
    return
  }

  // 合并到缓存
  const existing = cache.loadHistoryCache() as bambu.BambuHistoryItem[]
  const merged = [...newItems, ...existing]
  cache.saveHistoryCache(merged)

  res.json({ success: true, data: { added: newItems.length, total: merged.length } })
})

/**
 * POST /api/history/full-download — 全量下载
 */
router.post('/full-download', async (_req: Request, res: Response): Promise<void> => {
  const token = ensureToken(res)
  if (!token) return

  const allItems = await bambu.fetchHistory(token)
  cache.saveHistoryCache(allItems)

  res.json({ success: true, data: { total: allItems.length } })
})

export default router
