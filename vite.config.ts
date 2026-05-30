﻿﻿﻿﻿﻿﻿﻿﻿import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// 从 package.json 读取版本号，构建时注入
const pkgVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  define: {
    // 构建时注入版本号，前端代码通过 __APP_VERSION__ 访问
    __APP_VERSION__: JSON.stringify(pkgVersion),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: {
      '/bambu-api-cn': {
        target: 'https://api.bambulab.cn',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/bambu-api-cn/, ''),
      },
      '/bambu-api-global': {
        target: 'https://api.bambulab.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/bambu-api-global/, ''),
      },
    },
  },
})
