﻿﻿﻿/**
 * 认证路由
 * 处理 Bambu Lab 账号登录、验证码发送、登录状态检查、登出
 */

import { Router, type Request, type Response } from 'express'
import * as bambu from '../services/bambu.js'
import * as cache from '../services/cache.js'

const router = Router()

/**
 * POST /api/auth/login — 登录
 * Body: { account: string, password?: string, code?: string }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { account, password, code } = req.body

  if (!account) {
    res.status(400).json({ success: false, error: '账号不能为空' })
    return
  }

  if (!password && !code) {
    res.status(400).json({ success: false, error: '请提供密码或验证码' })
    return
  }

  const token = await bambu.login(account, password, code)
  if (!token) {
    res.status(401).json({ success: false, error: '登录失败，请检查账号和密码/验证码' })
    return
  }

  // 保存 token 到缓存
  cache.saveToken(token, account)

  res.json({ success: true, data: { token } })
})

/**
 * POST /api/auth/send-code — 发送验证码
 * Body: { account: string }
 */
router.post('/send-code', async (req: Request, res: Response): Promise<void> => {
  const { account } = req.body

  if (!account) {
    res.status(400).json({ success: false, error: '账号不能为空' })
    return
  }

  const ok = await bambu.sendCode(account)
  if (!ok) {
    res.status(500).json({ success: false, error: '验证码发送失败' })
    return
  }

  res.json({ success: true, data: { message: '验证码已发送' } })
})

/**
 * GET /api/auth/status — 检查登录状态
 * 从缓存加载 token，判断是否已登录
 */
router.get('/status', (_req: Request, res: Response): void => {
  const token = cache.loadToken()
  res.json({ success: true, data: { loggedIn: !!token } })
})

/**
 * POST /api/auth/logout — 登出
 * 清除 token 缓存
 */
router.post('/logout', (_req: Request, res: Response): void => {
  cache.clearToken()
  res.json({ success: true, data: { message: '已登出' } })
})

export default router
