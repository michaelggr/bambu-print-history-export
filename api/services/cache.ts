﻿﻿﻿/**
 * 缓存服务
 * 使用 JSON 文件存储 token、历史数据、设置等
 * 数据目录默认: bambu-export-web/data/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ESM 下获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据目录：优先使用环境变量（Electron 打包模式），否则项目根目录下的 data/
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data')

// 缓存文件名
const TOKEN_FILE = 'token_cache.json'
const HISTORY_FILE = 'history_cache.json'
const SETTINGS_FILE = 'settings.json'

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 确保数据目录存在 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

/** 读取 JSON 文件，解析失败返回 null */
function readJsonFile<T>(filename: string): T | null {
  const filepath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filepath)) return null
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 写入 JSON 文件，UTF-8 编码无 BOM */
function writeJsonFile(filename: string, data: unknown): void {
  ensureDataDir()
  const filepath = path.join(DATA_DIR, filename)
  const json = JSON.stringify(data, null, 2)
  fs.writeFileSync(filepath, json, 'utf-8')
}

/** 删除文件（忽略不存在的错误） */
function deleteFile(filename: string): void {
  const filepath = path.join(DATA_DIR, filename)
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
  } catch { /* 忽略删除失败 */ }
}

// ---------------------------------------------------------------------------
// Token 缓存
// ---------------------------------------------------------------------------

interface TokenData {
  token: string
  saved_at: number
  account: string
}

export function saveToken(token: string, account = ''): void {
  writeJsonFile(TOKEN_FILE, { token, saved_at: Date.now(), account })
}

export function loadToken(): string | null {
  const data = readJsonFile<TokenData>(TOKEN_FILE)
  return data?.token ?? null
}

export function clearToken(): void {
  deleteFile(TOKEN_FILE)
}

// ---------------------------------------------------------------------------
// 历史数据缓存
// ---------------------------------------------------------------------------

interface HistoryCacheData {
  ids: string[]
  history: unknown[]
  saved_at: number
}

export function saveHistoryCache(history: unknown[]): void {
  const ids = history
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => String(item.id ?? ''))
    .filter(id => id !== '')

  writeJsonFile(HISTORY_FILE, { ids, history, saved_at: Date.now() })
}

export function loadHistoryCache(): unknown[] {
  const data = readJsonFile<HistoryCacheData>(HISTORY_FILE)
  if (data?.history) return data.history
  // 兼容旧格式（直接是数组）
  const arr = readJsonFile<unknown[]>(HISTORY_FILE)
  if (Array.isArray(arr)) return arr
  return []
}

export function loadExistingIds(): Set<string> {
  const data = readJsonFile<HistoryCacheData>(HISTORY_FILE)
  if (data?.ids) return new Set(data.ids)
  // 兼容旧格式
  const arr = readJsonFile<unknown[]>(HISTORY_FILE)
  if (Array.isArray(arr)) {
    const ids = arr
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(item => String(item.id ?? ''))
      .filter(id => id !== '')
    return new Set(ids)
  }
  return new Set()
}

// ---------------------------------------------------------------------------
// 设置缓存
// ---------------------------------------------------------------------------

export function saveSettings(settings: Record<string, unknown>): void {
  writeJsonFile(SETTINGS_FILE, settings)
}

export function loadSettings(): Record<string, unknown> {
  return readJsonFile<Record<string, unknown>>(SETTINGS_FILE) ?? {}
}

// ---------------------------------------------------------------------------
// 清除操作
// ---------------------------------------------------------------------------

export function clearCache(): void {
  deleteFile(HISTORY_FILE)
}

export function clearAll(): void {
  deleteFile(TOKEN_FILE)
  deleteFile(HISTORY_FILE)
  deleteFile(SETTINGS_FILE)
}

/** 获取数据目录路径（供外部使用） */
export function getDataDir(): string {
  return DATA_DIR
}
