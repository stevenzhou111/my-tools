import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // 不配 includeAssets:public 下的文件已被下面的 glob 全覆盖,
      // 两边同时收会生成重复的预缓存条目(favicon 与 pwa 图标各登记两次)
      manifest: {
        name: '我的工具箱 - Vue 3 在线工具集',
        short_name: '工具箱',
        // 不写工具数量:registry 会增删,写死必然漂移
        description: 'JSON、二维码、PDF、图片处理、文档转换等常用小工具,全部在浏览器本地运行,可离线使用。',
        lang: 'zh-CN',
        theme_color: '#6366f1',
        background_color: '#f4f5fb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 全部本地计算,预缓存所有产物即可完整离线使用。
        // mjs 必须包含:pdf.worker(pdfjs-dist)是 .mjs,漏掉会导致离线时 PDF 工具失败。
        // png 不在 glob 里:PWA 图标由插件按 manifest 自动收录,再进 glob 会重复登记
        globPatterns: ['**/*.{js,mjs,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
