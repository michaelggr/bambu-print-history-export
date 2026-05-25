﻿/**
 * Bambu Cloud API 服务
 * 负责与 Bambu Cloud API 通信：登录、发送验证码、获取打印历史、数据转换、统计计算
 */

import https from 'https'
import zlib from 'zlib'

// ---------------------------------------------------------------------------
// API 常量
// ---------------------------------------------------------------------------

const API_CN = 'https://api.bambulab.cn'
const API_GLOBAL = 'https://api.bambulab.com'
const PAGE_SIZE = 20

// 模拟 BambuStudio 客户端请求头
const HEADERS: Record<string, string> = {
  'User-Agent': 'BambuStudio',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-BBL-Client-Type': 'slicer',
  'X-BBL-Language': 'zh-CN',
}

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface BambuHistoryItem {
  id: string
  designId?: number | string
  designTitle?: string
  title?: string
  designTitleTranslated?: string
  status: number // 2=成功, 3=失败, 1=打印中, 4=取消
  deviceName?: string
  deviceModel?: string
  deviceId?: string
  startTime?: string
  endTime?: string
  costTime?: number // 秒
  weight?: number // 克
  length?: number // 毫米
  cover?: string
  snapShot?: string
  nozzleInfos?: Array<{ diameter: number; type: string }>
  amsDetailMapping?: Array<{
    filamentType: string
    sourceColor: string
    weight: number
    length: number
  }>
  mode?: string // cloud_slice / local
  bedType?: string
  useAms?: boolean
  modelId?: string
  profileId?: string
  progress?: number
  filament?: Record<string, { type: string; color: string; weight: number; length: number }>
  filamentType?: string
  filamentColor?: string
  nozzleSize?: string | number
  [key: string]: unknown
}

/** HA printer_analytics v3 导入格式 — 完整字段对齐 */
export interface HARecord {
  // 核心标识
  task_name: string
  status: string                     // finish / failed / cancelled
  design_id: number | string
  printer_serial: string
  // 时间
  start_time: string                 // YYYY-MM-DD HH:mm
  end_time: string
  duration_hours: number             // v3 用小时（老格式 duration_minutes 会自动迁移）
  prepare_time_minutes: number | null
  // 耗材
  filament_type: string
  filament_color: string             // #RRGGBB
  total_weight: number               // 克
  total_length: number               // 米
  colors_used: string[]
  types_used: string[]
  total_colors: number
  multi_color: boolean
  over_500g: boolean
  color_usage: Array<{
    color: string                    // #RRGGBB
    type: string                     // 耗材类型
    weight_g: number
    length_m: number
  }>
  // 能耗
  energy_kwh: number | null
  // 打印参数
  nozzle_type: string
  nozzle_size: string
  print_bed_type: string
  speed_profile: string | null
  slice_mode: string                 // cloud / local
  ams_used: boolean
  total_layer_count: number | null
  // 进度
  progress: number
  // 图片
  cover_image_url: string
}

export interface HAFormat {
  version: 3
  history: HARecord[]
}

export interface PeriodStats {
  total_prints: number
  successful_prints: number
  failed_prints: number
  cancelled_prints: number
  success_rate: number
  total_weight_g: number
  total_duration_hours: number
  devices: Record<string, { count: number; success: number; failed: number; weight_g: number }>
  filaments: Record<string, { count: number; weight_g: number; success: number; failed: number }>
  monthly: Record<string, number>
  duration_distribution: Record<string, number>
  failure_stage_distribution: Record<string, number>
  extremes: {
    longest: { name: string; hours: number }
    shortest: { name: string; hours: number }
    heaviest: { name: string; weight_g: number }
    lightest: { name: string; weight_g: number }
  }
  /** 喷嘴尺寸分布：如 { "0.4": 250, "0.2": 10 } */
  nozzle_size_distribution: Record<string, number>
  /** 超500g模型数 */
  over_500g_count: number
  /** 超500g模型占比(%) */
  over_500g_rate: number
  /** 切片模式分布：如 { "cloud_slice": 300, "local": 50 } */
  slice_mode_distribution: Record<string, number>
  /** 多色模型数 */
  multi_color_count: number
  /** 多色模型占比(%) */
  multi_color_rate: number
}

export interface StatsResult {
  stats_lifetime: PeriodStats
  stats_7d: PeriodStats
  stats_30d: PeriodStats
  activity_heatmap: Record<string, number>
  filament_success_stats: Record<string, {
    total: number; success: number; failed: number; cancelled: number
    success_rate: number; weight_g: number
  }>
  /** 颜色使用量对比：如 { "#FFFFFF": 15000, "#000000": 8000 } 单位：克 */
  color_usage_stats: Record<string, number>
}

// ---------------------------------------------------------------------------
// 1. HTTP 请求层
// ---------------------------------------------------------------------------

/** 安全解码响应体：处理 gzip 压缩和编码（utf-8 优先，gbk 回退） */
function decodeResponse(buffer: Buffer): string {
  // 检测 gzip 压缩（magic bytes: 1F 8B）
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    buffer = zlib.gunzipSync(buffer)
  }
  // utf-8 优先，gbk 回退
  try {
    return buffer.toString('utf-8')
  } catch {
    // Node.js 默认不支持 GBK，使用 TextDecoder
    try {
      const decoder = new TextDecoder('gbk')
      return decoder.decode(buffer)
    } catch {
      return buffer.toString('latin1')
    }
  }
}

/** 发送 HTTPS 请求，返回响应 Buffer 和 HTTP 状态码 */
function httpsRequest(
  url: string,
  options: https.RequestOptions,
  body?: Buffer
): Promise<{ buffer: Buffer; statusCode: number }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), statusCode: res.statusCode ?? 0 }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
    if (body) req.write(body)
    req.end()
  })
}

/** 发送 POST 请求，返回解析后的 JSON 或 null */
async function post(url: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const body = Buffer.from(JSON.stringify(data), 'utf-8')
  const urlObj = new URL(url)
  const options: https.RequestOptions = {
    hostname: urlObj.hostname,
    port: 443,
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: { ...HEADERS, 'Content-Length': body.length },
  }

  try {
    const { buffer, statusCode } = await httpsRequest(url, options, body)
    const text = decodeResponse(buffer)
    // 写日志到文件，便于调试
    const logLine = `[${new Date().toISOString()}] POST ${urlObj.pathname} HTTP=${statusCode} => ${text?.slice(0, 500)}\n`
    try {
      const fs = await import('fs')
      const path = await import('path')
      const logDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data')
      fs.appendFileSync(path.join(logDir, 'api_debug.log'), logLine)
    } catch { /* ignore */ }
    if (!text) {
      // 空响应体：HTTP 2xx 视为成功，其他视为失败
      if (statusCode >= 200 && statusCode < 300) return {}
      console.error(`POST ${url} 失败: HTTP ${statusCode}, 空响应体`)
      return null
    }
    return JSON.parse(text) as Record<string, unknown>
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`POST ${url} 失败:`, msg)
    return null
  }
}

/** 发送 GET 请求（带 Bearer token），返回解析后的 JSON 或 null */
async function get(url: string, token: string): Promise<Record<string, unknown> | null> {
  const urlObj = new URL(url)
  const options: https.RequestOptions = {
    hostname: urlObj.hostname,
    port: 443,
    path: urlObj.pathname + urlObj.search,
    method: 'GET',
    headers: { ...HEADERS, Authorization: `Bearer ${token}` },
  }

  try {
    const { buffer } = await httpsRequest(url, options)
    const text = decodeResponse(buffer)
    if (!text) return null
    return JSON.parse(text) as Record<string, unknown>
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`GET ${url} 失败:`, msg)
    return null
  }
}

// ---------------------------------------------------------------------------
// 2. 登录模块
// ---------------------------------------------------------------------------

/** 判断是否为手机号（不含 @） */
function isPhone(account: string): boolean {
  return !account.includes('@')
}

/** 获取 API 基础 URL */
function getBaseUrl(account: string): string {
  return isPhone(account) ? API_CN : API_GLOBAL
}

/**
 * 登录 Bambu Lab 账号
 * - 手机号 → 中国区 API (api.bambulab.cn)
 * - 邮箱   → 全球区 API (api.bambulab.com)
 * 返回 accessToken 或 null
 */
export async function login(
  account: string,
  password?: string,
  code?: string
): Promise<string | null> {
  if (!account) {
    console.warn('登录失败: 账号为空')
    return null
  }

  const base = getBaseUrl(account)
  const url = `${base}/v1/user-service/user/login`

  const body: Record<string, unknown> = { account }
  if (password) {
    body.password = password
    body.apiError = ''
  } else if (code) {
    body.code = code
  } else {
    console.warn('登录失败: 未提供密码或验证码')
    return null
  }

  console.info(`尝试登录: ${account.slice(0, 3)}*** (${isPhone(account) ? 'CN' : 'Global'})`)
  const result = await post(url, body)

  if (!result) {
    console.error('登录请求失败: 网络错误')
    return null
  }

  // 打印完整响应便于调试
  console.info(`登录响应: statusCode=${result.statusCode}, hasAccessToken=${'accessToken' in result}, keys=${Object.keys(result).join(',')}`)

  const statusCode = result.statusCode as number | undefined
  // Bambu API 成功时 statusCode 可能为 0、200 或无此字段
  const isSuccess = (statusCode === undefined || statusCode === 0 || statusCode === 200) && 'accessToken' in result

  if (isSuccess) {
    console.info('登录成功')
    return result.accessToken as string
  }

  const errorMsg = (result.message ?? result.error ?? '') as string
  console.warn(`登录失败: statusCode=${statusCode}, message=${errorMsg}`)
  return null
}

/**
 * 发送验证码（短信或邮箱）
 * - 手机号 → 发送短信验证码
 * - 邮箱   → 发送邮箱验证码
 */
export async function sendCode(account: string): Promise<boolean> {
  if (!account) {
    console.warn('发送验证码失败: 账号为空')
    return false
  }

  const base = getBaseUrl(account)
  let url: string
  let body: Record<string, unknown>

  if (isPhone(account)) {
    url = `${base}/v1/user-service/user/sendsmscode`
    body = { phone: account, type: 'codeLogin' }
  } else {
    url = `${base}/v1/user-service/user/sendemail/code`
    body = { email: account, type: 'codeLogin' }
  }

  console.info(`发送验证码: ${account.slice(0, 3)}***`)
  const result = await post(url, body)

  if (!result) {
    console.error('发送验证码: API 无响应')
    return false
  }

  // 打印完整响应便于调试
  console.info(`发送验证码响应: statusCode=${result.statusCode}, error=${result.error ?? ''}, keys=${Object.keys(result).join(',')}`)

  // Bambu API 成功时 statusCode 可能为 0、200 或无此字段
  // 检查明确的错误信号：statusCode 错误码 或 error/captchaId 字段存在
  const statusCode = result.statusCode as number | undefined
  const hasStatusError = statusCode !== undefined && statusCode !== 0 && statusCode !== 200
  const hasErrorMsg = !!(result.error || result.captchaId)

  if (hasStatusError || hasErrorMsg) {
    const errorMsg = (result.message ?? result.error ?? '验证码发送失败') as string
    console.warn(`发送验证码失败: statusCode=${statusCode}, message=${errorMsg}`)
    return false
  }

  console.info('验证码发送成功')
  return true
}

// ---------------------------------------------------------------------------
// 3. 打印历史获取
// ---------------------------------------------------------------------------

/** 获取单页打印历史 */
async function fetchHistoryPage(
  token: string,
  baseUrl: string,
  offset = 0
): Promise<{ items: BambuHistoryItem[] | null; total: number }> {
  const url = `${baseUrl}/v1/user-service/my/tasks?limit=${PAGE_SIZE}&offset=${offset}`
  const result = await get(url, token)

  if (!result) return { items: null, total: 0 }
  // 401 表示 token 失效
  if (result.statusCode === 401) return { items: null, total: -1 }

  const hits = (result.hits ?? result.tasks ?? []) as BambuHistoryItem[]
  const total = (result.total ?? result.count ?? 0) as number
  return { items: hits, total }
}

/**
 * 分页获取全部打印历史
 * existingIds: 已存在的记录 ID 集合，获取时跳过这些记录
 * onProgress: 进度回调 (fetched, total)
 */
export async function fetchHistory(
  token: string,
  existingIds?: Set<string>,
  onProgress?: (fetched: number, total: number) => void
): Promise<BambuHistoryItem[]> {
  if (!token) {
    console.warn('fetchHistory: token 为空')
    return []
  }

  let allItems: BambuHistoryItem[] = []

  // 按优先级尝试两个区域
  for (const baseUrl of [API_CN, API_GLOBAL]) {
    console.info(`尝试从 ${baseUrl} 获取历史记录`)

    // 先获取第一页确定总数
    const { items, total } = await fetchHistoryPage(token, baseUrl, 0)
    if (items === null) {
      if (total === -1) {
        console.warn('Token 已失效，需要重新登录')
        return []
      }
      console.warn(`从 ${baseUrl} 获取第一页失败，尝试下一个区域`)
      continue
    }

    allItems = allItems.concat(items)
    console.info(`获取第一页: ${items.length} 条, 总计 ${total} 条`)
    onProgress?.(allItems.length, total)

    // 继续分页获取
    let offset = PAGE_SIZE
    let retryCount = 0
    const maxRetries = 3

    while (offset < total) {
      const page = await fetchHistoryPage(token, baseUrl, offset)
      if (page.items === null) {
        if (page.total === -1) {
          console.warn('Token 已失效（分页获取时），需要重新登录')
          return []
        }
        retryCount++
        if (retryCount >= maxRetries) {
          console.warn(`连续 ${maxRetries} 次获取失败，停止分页`)
          break
        }
        console.warn(`获取 offset=${offset} 失败，重试 (${retryCount}/${maxRetries})`)
        continue
      }
      retryCount = 0
      allItems = allItems.concat(page.items)
      onProgress?.(allItems.length, total)
      offset += PAGE_SIZE
    }

    // 成功获取到数据就不再尝试另一个域名
    if (allItems.length > 0) break
  }

  // 过滤已存在的记录
  if (existingIds && existingIds.size > 0) {
    const beforeCount = allItems.length
    allItems = allItems.filter(item => !existingIds.has(item.id ?? ''))
    console.info(`增量过滤: ${beforeCount} → ${allItems.length} 条`)
  }

  console.info(`共获取 ${allItems.length} 条记录`)
  return allItems
}

// ---------------------------------------------------------------------------
// 4. 数据转换（Bambu Cloud → HA 插件格式）
// ---------------------------------------------------------------------------

/** Bambu 状态码 → HA 状态字符串 */
function parseStatus(statusCode: number): string {
  const mapping: Record<number, string> = { 2: 'finish', 3: 'failed', 1: 'cancelled', 4: 'cancelled' }
  return mapping[statusCode] ?? 'cancelled'
}

/** ISO 8601 时间字符串 → 本地时间 'YYYY-MM-DD HH:mm' */
function parseTime(isoStr?: string): string {
  if (!isoStr) return ''
  try {
    const dt = new Date(isoStr)
    if (isNaN(dt.getTime())) return isoStr.slice(0, 16)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    const h = String(dt.getHours()).padStart(2, '0')
    const min = String(dt.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}`
  } catch {
    return isoStr.slice(0, 16)
  }
}

/**
 * 颜色字符串 → hex 格式 '#RRGGBB'
 * 支持: 1F79E5FF (无#前缀RGBA) → #1F79E5
 */
function parseColor(colorStr?: string | null): string {
  if (!colorStr) return ''
  const s = String(colorStr).trim()

  // 已经是 #hex 格式
  if (s.startsWith('#')) {
    const hex = s.slice(1)
    return hex.length >= 6 ? `#${hex.slice(0, 6).toUpperCase()}` : s.toUpperCase()
  }

  // rgba(r,g,b,a) 或 rgb(r,g,b)
  if (s.startsWith('rgb')) {
    try {
      const inner = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')'))
      const parts = inner.split(',').map(p => p.trim())
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2])
      return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`
    } catch {
      return s
    }
  }

  // 逗号分隔的 RGBA 值
  if (s.includes(',')) {
    try {
      const parts = s.split(',').map(p => p.trim())
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2])
      return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`
    } catch { /* 继续尝试 */ }
  }

  // 无#前缀的 hex 字符串（如 "1F79E5FF" RGBA 或 "1F79E5" RGB）
  if (s.length >= 6) {
    try {
      parseInt(s.slice(0, 6), 16)
      return `#${s.slice(0, 6).toUpperCase()}`
    } catch { /* 继续回退 */ }
  }

  return s
}

/** 从记录中提取使用的颜色列表 */
function extractColorsUsed(item: BambuHistoryItem): string[] {
  const colors: string[] = []

  // 优先从 amsDetailMapping 提取
  const amsList = item.amsDetailMapping
  if (Array.isArray(amsList)) {
    for (const ams of amsList) {
      if (ams?.sourceColor) {
        const parsed = parseColor(ams.sourceColor)
        if (parsed && !colors.includes(parsed)) colors.push(parsed)
      }
    }
  }

  // 回退：从 filament 提取
  if (colors.length === 0 && item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      if (fil?.color) {
        const parsed = parseColor(fil.color)
        if (parsed && !colors.includes(parsed)) colors.push(parsed)
      }
    }
  }

  // 再回退：从 filamentColor 提取
  if (colors.length === 0 && item.filamentColor) {
    for (const c of String(item.filamentColor).split(';')) {
      const parsed = parseColor(c.trim())
      if (parsed && !colors.includes(parsed)) colors.push(parsed)
    }
  }

  return colors
}

/** 提取耗材类型和颜色（取第一个耗材） */
function extractFilamentInfo(item: BambuHistoryItem): { type: string; color: string } {
  let filamentType = ''
  let filamentColor = ''

  // 优先从 amsDetailMapping 提取
  const amsList = item.amsDetailMapping
  if (Array.isArray(amsList) && amsList.length > 0) {
    const first = amsList[0]
    filamentType = first?.filamentType ?? ''
    filamentColor = first?.sourceColor ? parseColor(first.sourceColor) : ''
  }

  // 回退：从 filament 字段提取
  if (!filamentType && item.filament && typeof item.filament === 'object') {
    for (const key of Object.keys(item.filament).sort()) {
      const fil = item.filament[key]
      if (!filamentType) filamentType = fil?.type ?? ''
      if (!filamentColor) filamentColor = fil?.color ? parseColor(fil.color) : ''
      if (filamentType && filamentColor) break
    }
  }

  // 再回退到顶层字段
  if (!filamentType) filamentType = item.filamentType ?? ''
  if (!filamentColor) filamentColor = parseColor(item.filamentColor)

  return { type: filamentType, color: filamentColor }
}

/** 提取总重量(g)和总长度(m) */
function extractWeightAndLength(item: BambuHistoryItem): { weight: number; length: number } {
  let totalWeight = 0
  let totalLength = 0

  // 从 filament 字段汇总
  if (item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      totalWeight += Number(fil?.weight ?? 0) || 0
      totalLength += (Number(fil?.length ?? 0) || 0) / 1000 // mm → m
    }
  }

  // 回退到顶层字段
  if (totalWeight === 0) totalWeight = Number(item.weight ?? 0) || 0
  if (totalLength === 0) totalLength = (Number(item.length ?? 0) || 0) / 1000

  return { weight: Math.round(totalWeight * 10) / 10, length: Math.round(totalLength * 10) / 10 }
}

/** 提取耗材类型列表（去重） */
function extractTypesUsed(item: BambuHistoryItem): string[] {
  const types: string[] = []
  // 从 amsDetailMapping 提取
  const amsList = item.amsDetailMapping
  if (Array.isArray(amsList)) {
    for (const ams of amsList) {
      if (ams?.filamentType && !types.includes(ams.filamentType)) {
        types.push(ams.filamentType)
      }
    }
  }
  // 回退：从 filament 提取
  if (types.length === 0 && item.filament && typeof item.filament === 'object') {
    for (const fil of Object.values(item.filament)) {
      if (fil?.type && !types.includes(fil.type)) types.push(fil.type)
    }
  }
  // 再回退到顶层字段
  if (types.length === 0 && item.filamentType) {
    types.push(item.filamentType)
  }
  return types
}

/** 提取 color_usage 详情 */
function extractColorUsage(item: BambuHistoryItem): HARecord['color_usage'] {
  const amsList = item.amsDetailMapping
  if (!Array.isArray(amsList) || amsList.length === 0) return []

  return amsList.map(ams => ({
    color: parseColor(ams.sourceColor),
    type: ams.filamentType ?? '',
    weight_g: Math.round((Number(ams.weight ?? 0) || 0) * 100) / 100,
    length_m: Math.round(((Number(ams.length ?? 0) || 0) / 1000) * 100) / 100,
  }))
}

/** 提取打印机序列号 */
function extractPrinterSerial(item: BambuHistoryItem): string {
  return String(item.deviceId ?? '')
}

/** 提取喷嘴类型 */
function extractNozzleType(item: BambuHistoryItem): string {
  if (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0) {
    return item.nozzleInfos[0].type ?? ''
  }
  return ''
}

/**
 * 将 Bambu Cloud 数据转为 HA printer_analytics v3 导入格式
 * 完整对齐插件所有字段，缺失字段填充默认值
 */
export function convertToHAFormat(history: BambuHistoryItem[]): HAFormat {
  const haRecords: HARecord[] = history.map(item => {
    const { type: filamentType, color: filamentColor } = extractFilamentInfo(item)
    const { weight: totalWeight, length: totalLength } = extractWeightAndLength(item)
    const colorsUsed = extractColorsUsed(item)
    const typesUsed = extractTypesUsed(item)
    const colorUsage = extractColorUsage(item)

    // costTime 秒 → 小时（v3 用 duration_hours）
    const costSeconds = Number(item.costTime ?? 0) || 0
    const durationHours = Math.round(costSeconds / 3600 * 100) / 100

    // 优先从 nozzleInfos[0].diameter 提取，回退到顶层 nozzleSize，默认 '0.4'
    const nozzleSize = (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0 && item.nozzleInfos[0].diameter)
      ? String(item.nozzleInfos[0].diameter)
      : String(item.nozzleSize ?? '0.4')
    const taskName = item.designTitle ?? item.title ?? ''
    const totalColors = colorsUsed.length

    return {
      // 核心标识
      task_name: taskName,
      status: parseStatus(item.status ?? 0),
      design_id: item.designId ?? '',
      printer_serial: extractPrinterSerial(item),
      // 时间
      start_time: parseTime(item.startTime),
      end_time: parseTime(item.endTime),
      duration_hours: durationHours,
      prepare_time_minutes: null,    // Bambu Cloud 无此数据
      // 耗材
      filament_type: filamentType,
      filament_color: filamentColor,
      total_weight: totalWeight,
      total_length: totalLength,
      colors_used: colorsUsed,
      types_used: typesUsed,
      total_colors: totalColors,
      multi_color: totalColors > 1,
      over_500g: totalWeight > 500,
      color_usage: colorUsage,
      // 能耗
      energy_kwh: null,              // Bambu Cloud 无此数据
      // 打印参数
      nozzle_type: extractNozzleType(item),
      nozzle_size: nozzleSize,
      print_bed_type: item.bedType ?? '',
      speed_profile: null,           // Bambu Cloud 无此数据
      slice_mode: item.mode ?? '',
      ams_used: item.useAms ?? false,
      total_layer_count: null,       // Bambu Cloud 无此数据
      // 进度
      progress: item.status === 2 ? 100 : (Number(item.progress ?? 0) || 0),
      // 图片
      cover_image_url: item.cover ?? '',
    }
  })

  return { version: 3, history: haRecords }
}

// ---------------------------------------------------------------------------
// 5. 统计计算
// ---------------------------------------------------------------------------

/** 分钟数 → 时长分布桶名称 */
function durationBucket(minutes: number): string {
  if (minutes < 30) return '0-30分钟'
  if (minutes < 60) return '30-60分钟'
  if (minutes < 180) return '1-3小时'
  if (minutes < 360) return '3-6小时'
  if (minutes < 720) return '6-12小时'
  return '12小时+'
}

/** 判断失败阶段 */
function failureStage(item: BambuHistoryItem): string {
  const progress = Number(item.progress ?? 0) || 0
  if (progress < 30) return '早期(0-30%)'
  if (progress < 70) return '中期(30-70%)'
  return '后期(70-99%)'
}

/** 计算指定时间段内的统计摘要 */
function calcPeriodStats(history: BambuHistoryItem[]): PeriodStats {
  const total = history.length
  let success = 0
  let failed = 0
  let cancelled = 0
  let totalWeightG = 0
  let totalDurationMinutes = 0

  const devices: PeriodStats['devices'] = {}
  const filaments: PeriodStats['filaments'] = {}
  const monthly: Record<string, number> = {}
  const durationDistribution: Record<string, number> = {
    '0-30分钟': 0, '30-60分钟': 0, '1-3小时': 0,
    '3-6小时': 0, '6-12小时': 0, '12小时+': 0,
  }
  const failureStageDist: Record<string, number> = {
    '早期(0-30%)': 0, '中期(30-70%)': 0, '后期(70-99%)': 0,
  }

  // 新增统计项
  const nozzleSizeDist: Record<string, number> = {}
  let over500gCount = 0
  const sliceModeDist: Record<string, number> = {}
  let multiColorCount = 0

  let longest = { name: '', hours: 0 }
  let shortest = { name: '', hours: Infinity }
  let heaviest = { name: '', weight_g: 0 }
  let lightest = { name: '', weight_g: Infinity }

  for (const item of history) {
    const status = item.status ?? 0
    const taskName = item.designTitle ?? item.title ?? '未命名'
    const isCancelled = status === 1 || status === 4

    if (status === 2) success++
    else if (status === 3) failed++
    else if (isCancelled) cancelled++

    const costSeconds = Number(item.costTime ?? 0) || 0
    const costMinutes = costSeconds / 60
    totalDurationMinutes += costMinutes

    const weight = Number(item.weight ?? 0) || 0
    // 取消的记录不计入重量
    if (!isCancelled) totalWeightG += weight

    // 设备统计
    const deviceName = item.deviceName ?? '未知设备'
    if (!devices[deviceName]) {
      devices[deviceName] = { count: 0, success: 0, failed: 0, weight_g: 0 }
    }
    const dev = devices[deviceName]
    dev.count++
    if (!isCancelled) dev.weight_g = Math.round((dev.weight_g + weight) * 10) / 10
    if (status === 2) dev.success++
    else if (status === 3) dev.failed++

    // 耗材统计
    const { type: filamentType } = extractFilamentInfo(item)
    if (filamentType) {
      if (!filaments[filamentType]) {
        filaments[filamentType] = { count: 0, weight_g: 0, success: 0, failed: 0 }
      }
      const ft = filaments[filamentType]
      ft.count++
      if (!isCancelled) ft.weight_g = Math.round((ft.weight_g + weight) * 10) / 10
      if (status === 2) ft.success++
      else if (status === 3) ft.failed++
    }

    // 月度统计
    const startTime = item.startTime ?? ''
    if (startTime) {
      const monthKey = startTime.slice(0, 7) // "YYYY-MM"
      monthly[monthKey] = (monthly[monthKey] ?? 0) + 1
    }

    // 时长分布
    durationDistribution[durationBucket(costMinutes)]++

    // 失败阶段
    if (status === 3 || isCancelled) {
      failureStageDist[failureStage(item)]++
    }

    // 喷嘴尺寸分布
    const nSize = (Array.isArray(item.nozzleInfos) && item.nozzleInfos.length > 0 && item.nozzleInfos[0].diameter)
      ? String(item.nozzleInfos[0].diameter)
      : (item.nozzleSize ? String(item.nozzleSize) : '0.4')
    nozzleSizeDist[nSize] = (nozzleSizeDist[nSize] ?? 0) + 1

    // 超500g模型
    if (weight > 500) over500gCount++

    // 切片模式分布
    const sliceMode = item.mode || 'unknown'
    sliceModeDist[sliceMode] = (sliceModeDist[sliceMode] ?? 0) + 1

    // 多色模型
    const colorsUsed = extractColorsUsed(item)
    if (colorsUsed.length > 1) multiColorCount++

    // 极值追踪（仅成功的记录参与）
    if (status === 2) {
      const costHours = costMinutes / 60
      if (costHours > longest.hours) longest = { name: taskName, hours: Math.round(costHours * 10) / 10 }
      if (costHours < shortest.hours && costHours > 0) shortest = { name: taskName, hours: Math.round(costHours * 10) / 10 }
      if (weight > heaviest.weight_g) heaviest = { name: taskName, weight_g: Math.round(weight * 10) / 10 }
      if (weight < lightest.weight_g && weight > 0) lightest = { name: taskName, weight_g: Math.round(weight * 10) / 10 }
    }
  }

  // 处理没有数据时极值为 Infinity 的情况
  if (shortest.hours === Infinity) shortest = { name: '', hours: 0 }
  if (lightest.weight_g === Infinity) lightest = { name: '', weight_g: 0 }

  const successRate = total > 0 ? Math.round(success / total * 1000) / 10 : 0
  const totalDurationHours = Math.round(totalDurationMinutes / 60 * 10) / 10

  return {
    total_prints: total,
    successful_prints: success,
    failed_prints: failed,
    cancelled_prints: cancelled,
    success_rate: successRate,
    total_weight_g: Math.round(totalWeightG * 10) / 10,
    total_duration_hours: totalDurationHours,
    devices,
    filaments,
    monthly,
    duration_distribution: durationDistribution,
    failure_stage_distribution: failureStageDist,
    extremes: { longest, shortest, heaviest, lightest },
    nozzle_size_distribution: nozzleSizeDist,
    over_500g_count: over500gCount,
    over_500g_rate: total > 0 ? Math.round(over500gCount / total * 1000) / 10 : 0,
    slice_mode_distribution: sliceModeDist,
    multi_color_count: multiColorCount,
    multi_color_rate: total > 0 ? Math.round(multiColorCount / total * 1000) / 10 : 0,
  }
}

/**
 * 计算统计摘要，对齐 printer_analytics 插件的统计项
 */
export function calculateStats(history: BambuHistoryItem[]): StatsResult {
  const now = new Date()

  // 按时间范围筛选记录
  function filterByDays(days: number): BambuHistoryItem[] {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return history.filter(item => {
      const startTime = item.startTime
      if (!startTime) return false
      try {
        const dt = new Date(startTime)
        return dt >= cutoff
      } catch {
        return false
      }
    })
  }

  const history7d = filterByDays(7)
  const history30d = filterByDays(30)

  const statsLifetime = calcPeriodStats(history)
  const stats7d = calcPeriodStats(history7d)
  const stats30d = calcPeriodStats(history30d)

  // 活动热力图：按日期统计每天打印次数
  const activityHeatmap: Record<string, number> = {}
  for (const item of history) {
    const startTime = item.startTime ?? ''
    if (startTime) {
      const dateKey = startTime.slice(0, 10) // "YYYY-MM-DD"
      activityHeatmap[dateKey] = (activityHeatmap[dateKey] ?? 0) + 1
    }
  }

  // 耗材成功率统计
  const filamentSuccessStats: StatsResult['filament_success_stats'] = {}
  for (const item of history) {
    const { type: filamentType } = extractFilamentInfo(item)
    if (!filamentType) continue

    const status = item.status ?? 0
    const isCancelled = status === 1 || status === 4
    const weight = Number(item.weight ?? 0) || 0

    if (!filamentSuccessStats[filamentType]) {
      filamentSuccessStats[filamentType] = { total: 0, success: 0, failed: 0, cancelled: 0, success_rate: 0, weight_g: 0 }
    }
    const fs = filamentSuccessStats[filamentType]
    fs.total++
    if (status === 2) fs.success++
    else if (status === 3) fs.failed++
    else if (isCancelled) fs.cancelled++
    if (!isCancelled) fs.weight_g += weight
  }

  // 计算成功率并取整
  for (const fs of Object.values(filamentSuccessStats)) {
    fs.success_rate = fs.total > 0 ? Math.round(fs.success / fs.total * 1000) / 10 : 0
    fs.weight_g = Math.round(fs.weight_g * 10) / 10
  }

  // 颜色使用量统计：按颜色汇总重量(g)
  const colorUsageStats: Record<string, number> = {}
  for (const item of history) {
    const amsList = item.amsDetailMapping
    if (Array.isArray(amsList)) {
      for (const ams of amsList) {
        if (ams?.sourceColor) {
          const parsed = parseColor(ams.sourceColor)
          if (parsed) {
            const w = Number(ams.weight ?? 0) || 0
            colorUsageStats[parsed] = Math.round(((colorUsageStats[parsed] ?? 0) + w) * 10) / 10
          }
        }
      }
    }
  }

  return {
    stats_lifetime: statsLifetime,
    stats_7d: stats7d,
    stats_30d: stats30d,
    activity_heatmap: activityHeatmap,
    filament_success_stats: filamentSuccessStats,
    color_usage_stats: colorUsageStats,
  }
}
