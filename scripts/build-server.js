﻿﻿﻿/**
 * esbuild 打包脚本
 * 将 Express 后端 TS 代码打包为单个 CJS 文件
 */
import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

esbuild.build({
  entryPoints: [path.join(__dirname, '../api/electron-server.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.join(__dirname, '../dist-server/server.cjs'),
  // 不标记 external，所有依赖都打包进单个文件
  // 这样生产环境不需要 node_modules
  // CJS 模式下 import.meta.url 不可用，用 banner 注入替代
  banner: {
    js: `
// esbuild CJS 兼容：模拟 import.meta.url
var __import_meta_url = require('url').pathToFileURL(__filename).href;
var import_meta = { url: __import_meta_url };
`.trim(),
  },
  // 将 import.meta.url 替换为 banner 中定义的变量
  define: {
    'import.meta.url': '__import_meta_url',
  },
  // 忽略 .css 等非 JS 文件
  loader: { '.css': 'empty' },
  // 保留调试信息
  minify: false,
}).then(() => {
  console.log('Server bundled to dist-server/server.cjs');
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
