﻿/**
 * 导出路由
 * 支持导出为 JSON / CSV / HA 插件格式
 */

import { Router, type Request, type Response } from 'express'
import * as bambu from '../services/bambu.js'
import * as cache from '../services/cache.js'

const router = Router()

/**
 * POST /api/export — 导出数据
 * Body: { format: 'json'|'csv'|'ha', filters?: { status?, device?, dateFrom?, dateTo?, search? } }
 */
router.post('/', (req: Request, res: Response): void => {
  const { format, filters } = req.body

  if (!format || !['json', 'csv', 'ha'].includes(format)) {
    res.status(400).json({ success: false, error: '不支持的导出格式，请使用 json/csv/ha' })
    return
  }

  let history = cache.loadHistoryCache() as bambu.BambuHistoryItem[]

  // 应用筛选条件
  if (filters) {
    if (filters.status) {
      const statuses = String(filters.status).split(',').map((s: string) => Number(s.trim()))
      history = history.filter(item => statuses.includes(item.status))
    }
    if (filters.device) {
      const deviceLower = String(filters.device).toLowerCase()
      history = history.filter(item =>
        (item.deviceName ?? '').toLowerCase().includes(deviceLower)
      )
    }
    if (filters.dateFrom) {
      history = history.filter(item => (item.startTime ?? '') >= filters.dateFrom)
    }
    if (filters.dateTo) {
      const to = filters.dateTo + 'T23:59:59'
      history = history.filter(item => (item.startTime ?? '') <= to)
    }
    if (filters.search) {
      const searchLower = String(filters.search).toLowerCase()
      history = history.filter(item => {
        const title = (item.designTitle ?? item.title ?? '').toLowerCase()
        return title.includes(searchLower)
      })
    }
  }

  // 按格式导出
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="bambu_history.json"')
    res.json(history)
    return
  }

  if (format === 'csv') {
    const csv = generateCSV(history)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    // BOM 头确保 Excel 正确识别 UTF-8
    res.setHeader('Content-Disposition', 'attachment; filename="bambu_history.csv"')
    res.send('\uFEFF' + csv)
    return
  }

  if (format === 'ha') {
    const haData = bambu.convertToHAFormat(history)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="bambu_ha_import.json"')
    res.json(haData)
    return
  }
})

// ---------------------------------------------------------------------------
// CSV 生成
// ---------------------------------------------------------------------------

/** 状态码 → 中文 */
const STATUS_MAP: Record<number, string> = {
  1: '打印中',
  2: '成功',
  3: '失败',
  4: '已取消',
}

/** 生成 CSV 字符串 */
function generateCSV(history: bambu.BambuHistoryItem[]): string {
  const columns = [
    'id', 'designTitle', 'status', 'deviceName', 'deviceModel',
    'startTime', 'endTime', 'weight', 'length', 'costTime',
    'filamentType', 'mode', 'bedType',
  ]

  // 表头行
  const header = columns.join(',')

  // 数据行
  const rows = history.map(item => {
    const statusRaw = item.status
    const statusStr = typeof statusRaw === 'number'
      ? (STATUS_MAP[statusRaw] ?? String(statusRaw))
      : String(statusRaw)

    return columns.map(col => {
      let val: unknown
      if (col === 'status') {
        val = statusStr
      } else if (col === 'filamentType') {
        // 从 amsDetailMapping 提取耗材类型
        const ams = item.amsDetailMapping
        val = Array.isArray(ams) && ams.length > 0 ? ams[0].filamentType : (item.filamentType ?? '')
      } else {
        val = (item as Record<string, unknown>)[col] ?? ''
      }

      // CSV 转义：包含逗号、引号、换行时用双引号包裹
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })

  return [header, ...rows].join('\n')
}

export default router
