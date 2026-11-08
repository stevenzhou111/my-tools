import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME } from '@/config'
import { getTool, TOOLS } from '@/tools/registry'
import { useToolPrefs } from '@/utils/prefs'

const { pushRecent, bumpUsage } = useToolPrefs()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/tool/:id', name: 'tool', component: () => import('@/views/ToolView.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

const HOME_DESC = 'JSON、二维码、PDF、图片处理、文档转换等常用小工具,全部在浏览器本地运行,可离线使用。'

// 同步 meta description:SPA 只换 title 的话,分享到社交平台的卡片描述永远是首页那句
function setMetaDescription(text) {
  let el = document.querySelector('meta[name="description"]')
  if (!el) {
    el = document.createElement('meta')
    el.name = 'description'
    document.head.appendChild(el)
  }
  el.content = text
}

// 结构化数据(JSON-LD):工具页输出 WebApplication 描述供搜索引擎富结果使用。
// SPA 无 SSR,导航时同步更新;离开工具页即移除,避免其它页面挂着上个工具的陈旧数据。
function setJsonLd(tool) {
  let el = document.getElementById('ld-json')
  if (!tool) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'ld-json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${tool.name} · ${APP_NAME}`,
    description: tool.desc,
    url: `${location.origin}/tool/${tool.id}`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  })
}

router.afterEach((to, from) => {
  const tool = to.name === 'tool' ? getTool(to.params.id) : null
  if (tool) {
    document.title = `${tool.name} · ${APP_NAME}`
    // 工具总数从 registry 派生,避免文案与实际数量漂移
    setMetaDescription(`${tool.desc} — ${tool.name} 等 ${TOOLS.length} 个工具全部在浏览器本地运行,免费免登录,支持离线使用。`)
    setJsonLd(tool)
    // useUrlState 同步参数会触发 replace 导航:同一工具内的参数变化不重复记"最近使用"/计数
    if (from.name !== 'tool' || from.params.id !== to.params.id) {
      pushRecent(tool.id)
      bumpUsage(tool.id)
    }
  } else if (to.name === 'home') {
    document.title = `${APP_NAME} - Vue 3 在线工具集`
    setMetaDescription(HOME_DESC)
    setJsonLd(null)
  } else {
    document.title = `页面不存在 · ${APP_NAME}`
    setMetaDescription(HOME_DESC)
    setJsonLd(null)
  }
})

// 路由级 chunk 加载失败(弱网 / 新版本部署后缓存失效)时整页刷新兜底
router.onError((error, to) => {
  if (/Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(error.message)) {
    window.location.href = to ? to.fullPath : '/'
  }
})

export default router
