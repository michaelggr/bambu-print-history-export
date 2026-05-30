﻿﻿﻿﻿﻿﻿import { defineConfig } from '@tarojs/cli';
import path from 'path';

const srcPath = path.resolve(__dirname, '..', 'src');

export default defineConfig({
  projectName: 'bambu-export',
  date: '2026-5-29',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: { enable: false },
  },
  cache: { enable: false },
  alias: {
    '@': srcPath,
  },
  sass: {
    // 指定项目路径用于解析 @ 别名
    projectPath: path.resolve(__dirname, '..'),
  },
  mini: {
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
  },
  copy: {
    patterns: [
      { from: 'project.config.json', to: 'dist/project.config.json' },
    ],
  },
  plugins: ['@tarojs/plugin-framework-react', '@tarojs/plugin-platform-weapp'],
});
