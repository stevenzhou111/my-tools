import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'
import { vDraft } from './utils/draft'
import './assets/base.css'

// 检测到新版本时自动刷新,避免旧 SW 缓存的页面引用已被替换的 chunk。
// 仅在页面此前已被旧 SW 控制时刷新;首次安装(无 controller)不刷新,避免打断浏览。
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => {
    if (navigator.serviceWorker.controller) window.location.reload()
  },
})

// 页面切回前台 / 每分钟主动检查一次更新,保证已打开的页面尽快升级到新版
if ('serviceWorker' in navigator) {
  setInterval(() => updateSW?.(), 60_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateSW?.()
  })
}

createApp(App).use(router).directive('draft', vDraft).mount('#app')
