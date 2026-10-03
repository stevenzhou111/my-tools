import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME } from '@/config'
import { getTool } from '@/tools/registry'
import { useToolPrefs } from '@/utils/prefs'

const { pushRecent } = useToolPrefs()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/tool/:id', name: 'tool', component: () => import('@/views/ToolView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const tool = to.name === 'tool' ? getTool(to.params.id) : null
  if (tool) {
    document.title = `${tool.name} · ${APP_NAME}`
    pushRecent(tool.id)
  } else if (to.name === 'home') {
    document.title = `${APP_NAME} - Vue 3 在线工具集`
  } else {
    document.title = `页面不存在 · ${APP_NAME}`
  }
})

// 路由级 chunk 加载失败(弱网 / 新版本部署后缓存失效)时整页刷新兜底
router.onError((error, to) => {
  if (/Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message)) {
    window.location.href = to ? to.fullPath : '/'
  }
})

export default router
