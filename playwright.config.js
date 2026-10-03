import { defineConfig, devices } from '@playwright/test'

// 本机 vite preview 只监听 IPv6,必须用 localhost,127.0.0.1 连不上
const BASE_URL = 'http://localhost:4173'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // 工具箱不含任何跟踪/外部请求,这里主动拦掉,避免测试因网络波动误报
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 端到端跑的是真正要发布的产物,而不是 dev server
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
  },
})