import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 单测环境:不加载 PWA 插件,只保留 vue 编译与 @ 别名
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.js'],
    restoreMocks: true,
    // 复用线程里的 jsdom 环境:默认每文件新建一个 jsdom,环境搭建占了 85% 耗时
    pool: 'vmThreads',
  },
})