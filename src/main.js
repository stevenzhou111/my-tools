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

// 新 SW 激活并接管页面(controllerchange)时主动刷新一次:
// autoUpdate 模式下新 SW 会跳过等待直接接管,但已加载的页面仍跑旧代码,
// 不刷新的话用户会一直停在旧版本(表现为"部署了却搜不到新工具")。
let hadController = !!navigator.serviceWorker?.controller
let reloaded = false
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    window.location.reload()
  })
  setInterval(() => updateSW?.(), 60_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateSW?.()
  })
}

createApp(App).use(router).directive('draft', vDraft).mount('#app')
