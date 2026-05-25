﻿/**
 * 设置路由
 * 获取/更新设置、清除缓存、清除全部数据
 */

import { Router, type Request, type Response } from 'express'
import * as cache from '../services/cache.js'

const router = Router()

/**
 * GET /api/settings — 获取设置
 */
router.get('/', (_req: Request, res: Response): void => {
  const settings = cache.loadSettings()
  const historyCache = cache.loadHistoryCache()
  res.json({ success: true, data: { ...settings, cacheCount: Array.isArray(historyCache) ? historyCache.length : 0 } })
})

/**
 * PUT /api/settings — 更新设置
 * Body: { key: value, ... }（合并到现有设置）
 */
router.put('/', (req: Request, res: Response): void => {
  const current = cache.loadSettings()
  const updated = { ...current, ...req.body }
  cache.saveSettings(updated)
  res.json({ success: true, data: updated })
})

/**
 * DELETE /api/settings/cache — 清除缓存（历史数据缓存）
 */
router.delete('/cache', (_req: Request, res: Response): void => {
  cache.clearCache()
  res.json({ success: true, data: { message: '缓存已清除' } })
})

/**
 * DELETE /api/settings/all — 清除全部数据（token + 历史 + 设置）
 */
router.delete('/all', (_req: Request, res: Response): void => {
  cache.clearAll()
  res.json({ success: true, data: { message: '全部数据已清除' } })
})

export default router
