﻿/**
 * 服务端打包入口（esbuild 使用）
 * 将 ESM TypeScript 打包为单个 CJS 文件供 Electron 加载
 *
 * 关键：覆盖 cache.ts 中的 DATA_DIR 为用户数据目录
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── API 路由 ───
import authRoutes from './routes/auth.js'
import historyRoutes from './routes/history.js'
import exportRoutes from './routes/export.js'
import settingsRoutes from './routes/settings.js'

app.use('/api/auth', authRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/settings', settingsRoutes)

// 健康检查
app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

// ─── 生产模式：服务前端静态文件 ───
// Electron 打包后，server.cjs 和前端 dist 都在 app.asar 内
// __dirname = <asar>/dist-server，前端在 <asar>/dist
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '..', 'dist')
app.use(express.static(frontendDist))

// SPA 路由回退：所有非 API 请求返回 index.html
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

// 错误处理
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

/**
 * 启动服务，供 Electron 主进程调用
 * @returns {{ port: number, close: Function }}
 */
function start() {
  const PORT = parseInt(process.env.PORT || '3001', 10)
  const server = app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`)
  })

  return {
    port: PORT,
    close: () => {
      server.close(() => console.log('Server closed'))
    },
  }
}

// esbuild 打包为 CJS 时需要导出
export { start }

// ─── 自动启动：当作为子进程直接运行时 ───
// Electron 主进程通过 fork() 启动 server.cjs
// 判断是否被直接运行（而非被 require）
if (typeof require !== 'undefined' && require.main === module) {
  start()
}
