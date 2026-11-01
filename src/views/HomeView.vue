<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { APP_NAME, APP_TAGLINE } from '@/config'
import { CATEGORIES, TOOLS, getTool } from '@/tools/registry'
import { useRoute, useRouter } from 'vue-router'
import { useToolPrefs } from '@/utils/prefs'
import { ensurePinyinIndex, pinyinHit } from '@/utils/pinyinSearch'
import { useToast } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const query = ref('')
const searchEl = ref(null)
const { favorites, recents } = useToolPrefs()

// 工具页的分类徽章会带 ?cat= 回首页:滚到对应分类并短暂高亮
function revealCat(id) {
  const el = document.getElementById(`cat-${id}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.add('cat-flash')
  setTimeout(() => el.classList.remove('cat-flash'), 1600)
}
onMounted(() => {
  const cat = route.query.cat
  if (typeof cat === 'string' && CATEGORIES.some((c) => c.id === cat)) {
    setTimeout(() => revealCat(cat), 60)
  }
})

const favTools = computed(() =>
  favorites.value.map((id) => getTool(id)).filter(Boolean),
)
const recentTools = computed(() =>
  recents.value.map((id) => getTool(id)).filter(Boolean),
)

// registry 里带 fresh 标记的最新一批工具,首页置顶展示;下批新工具上线时把标记挪过去
const freshTools = computed(() => TOOLS.filter((t) => t.fresh))

// "/" 快捷键由 App.vue 统一分发(按当前路由决定聚焦首页搜索还是侧栏搜索),
// 这里通过 data-hero-search 标记自己的搜索框供其定位,不再重复注册监听

// 拼音索引在首次搜索时才动态加载词典;就绪后 ref 触发 filtered 重算
watch(query, (v) => {
  if (v.trim()) ensurePinyinIndex()
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return CATEGORIES.map((cat) => ({
    ...cat,
    tools: TOOLS.filter(
      (t) =>
        t.category === cat.id &&
        (!q || `${t.name} ${t.desc} ${t.keywords}`.toLowerCase().includes(q) || pinyinHit(t, q)),
    ),
  })).filter((cat) => cat.tools.length > 0)
})

const matchedCount = computed(() =>
  filtered.value.reduce((n, cat) => n + cat.tools.length, 0),
)

// ---------- 剪贴板智能推荐 ----------
const suggestion = ref(null)
const detectError = ref('')

function detectContentType(text) {
  const t = text.trim()
  if (!t || t.length > 100000) return null
  try {
    JSON.parse(t)
    return { label: 'JSON 数据', toolId: 'json' }
  } catch { /* 继续尝试其他类型 */ }
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(t)) return { label: 'JWT Token', toolId: 'jwt' }
  if (/^https?:\/\/\S+$/i.test(t)) return { label: 'URL 链接', toolId: 'url-parser' }
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t)) return { label: '颜色值', toolId: 'color' }
  if (
    /^[A-Za-z0-9+/=\s]+$/.test(t) &&
    t.replace(/\s/g, '').length % 4 === 0 &&
    t.replace(/\s/g, '').length > 8 &&
    /[A-Za-z]/.test(t) &&
    /[+/=]/.test(t)
  ) {
    return { label: '疑似 Base64 文本', toolId: 'base64' }
  }
  if (/^\d{13}$/.test(t)) return { label: '毫秒时间戳', toolId: 'timestamp' }
  if (/^\d{10}$/.test(t)) return { label: '秒级时间戳', toolId: 'timestamp' }
  // 图片 dataURL(截图/复制的图片以文本形式出现)→ 二维码解析与图片工具都常用,先推荐解析
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(t)) return { label: '图片 Data URL', toolId: 'qr-decode' }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(t)) return { label: 'IPv4 地址', toolId: 'subnet-calc' }
  return null
}

async function detectClipboard() {
  detectError.value = ''
  suggestion.value = null
  if (!navigator.clipboard?.readText) {
    detectError.value = '当前浏览器不支持读取剪贴板'
    return
  }
  try {
    const text = await navigator.clipboard.readText()
    const hit = detectContentType(text || '')
    if (hit) {
      const tool = getTool(hit.toolId)
      suggestion.value = { ...hit, tool, preview: text.trim().slice(0, 80) }
    } else {
      detectError.value = '没有识别出已知类型(支持 JSON / JWT / URL / 颜色 / Base64 / 时间戳 / IP / 图片链接)'
    }
  } catch {
    detectError.value = '读取剪贴板被拒绝或失败,请手动复制后重试'
  }
}
function openRandom() {
  router.push(`/tool/${TOOLS[Math.floor(Math.random() * TOOLS.length)].id}`)
}

// 悬停预热工具 chunk:点击后异步组件几乎零等待;重复悬停靠浏览器缓存,无额外开销
function prefetch(tool) {
  tool.component?.prefetch?.()
}

// ---------- 收藏导入导出(换机迁移) ----------
const { exportPrefs, importPrefs } = useToolPrefs()
const { showToast } = useToast()
const importInput = ref(null)

function exportFavs() {
  const blob = new Blob([exportPrefs()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `toolbox-favorites-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const r = importPrefs(String(reader.result || ''))
      showToast(`导入完成:新增 ${r.added} 个收藏`)
    } catch (err) {
      showToast(err.message || '导入失败')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// ---------- 收藏拖拽排序 ----------
const { reorderFav } = useToolPrefs()
const dragFavId = ref(null)

function onFavDragStart(e, tool) {
  dragFavId.value = tool.id
  e.dataTransfer.effectAllowed = 'move'
  // Firefox 需要有数据才真正启动拖拽
  e.dataTransfer.setData('text/plain', tool.id)
}
function onFavDragOver(e, tool) {
  if (!dragFavId.value || dragFavId.value === tool.id) return
  e.preventDefault() // 允许放置
  e.dataTransfer.dropEffect = 'move'
  // 悬停即实时重排,favorites 顺序驱动卡片跟着走
  reorderFav(dragFavId.value, favTools.value.findIndex((f) => f.id === tool.id))
}
function onFavDrop(e) {
  e.preventDefault()
  dragFavId.value = null
}

// 搜索时按 Enter 直达第一个匹配的工具;Esc 清空回到全量列表
function onSearchKeydown(e) {
  if (e.key === 'Enter') {
    const first = filtered.value[0]?.tools[0]
    if (first && query.value.trim()) router.push(`/tool/${first.id}`)
  } else if (e.key === 'Escape' && query.value) {
    query.value = ''
  }
}
</script>

<template>
  <div>
    <section class="hero">
      <h1 class="hero-title"><AppIcon name="layout-grid" :size="30" />{{ APP_NAME }}</h1>
      <p class="tagline">
        <template v-if="query.trim()">匹配到 {{ matchedCount }} 个工具</template>
        <template v-else>共 {{ TOOLS.length }} 个常用工具 · {{ APP_TAGLINE }}</template>
      </p>
      <div v-if="!query.trim()" class="hero-stats">
        <span class="hero-chip"><AppIcon name="layout-grid" :size="13" />{{ TOOLS.length }} 个工具</span>
        <span class="hero-chip"><AppIcon name="folder" :size="13" />{{ CATEGORIES.length }} 大分类</span>
        <span class="hero-chip"><AppIcon name="shield-check" :size="13" />100% 本地运行</span>
        <span class="hero-chip"><AppIcon name="wifi-off" :size="13" />离线可用</span>
      </div>
      <div class="search-wrap">
        <AppIcon class="search-icon" name="search" :size="18" />
        <input
          ref="searchEl"
          v-model="query"
          data-hero-search
          class="input search-input"
          type="search"
          aria-label="搜索工具"
          placeholder="搜索工具,Enter 直达第一个结果(按 / 快速聚焦)"
          @keydown="onSearchKeydown"
        />
      </div>
      <div v-if="!query.trim()" class="detect-row">
        <button class="btn btn-sm" @click="detectClipboard"><AppIcon name="clipboard" :size="15" />识别剪贴板内容,推荐工具</button>
        <button class="btn btn-sm" @click="openRandom"><AppIcon name="shuffle" :size="15" />随机逛一个工具</button>
      </div>
      <div v-if="suggestion" class="panel suggest-panel">
        检测到<strong> {{ suggestion.label }}</strong>
        <code v-if="suggestion.preview" class="suggest-preview">{{ suggestion.preview }}</code>
        <router-link :to="`/tool/${suggestion.tool.id}`" class="btn btn-sm btn-primary">
          用「{{ suggestion.tool.name }}」打开 <AppIcon name="arrow-right" :size="14" />
        </router-link>
      </div>
      <p v-if="detectError" class="tip">{{ detectError }}</p>
    </section>

    <!-- 移动端没有侧栏:sticky 分类条快速跳转,桌面端隐藏 -->
    <nav v-if="!query.trim()" class="mobile-cats" aria-label="分类快捷导航">
      <button v-for="cat in CATEGORIES" :key="cat.id" class="m-chip" type="button" @click="revealCat(cat.id)">
        <AppIcon :name="cat.icon" :size="13" />{{ cat.name }}
      </button>
    </nav>

    <section v-if="!query.trim() && freshTools.length" class="cat-section">
      <h2 class="cat-title">
        <AppIcon class="cat-icon" name="sparkles" :size="20" />最新上线
        <span class="count-hint">共 {{ freshTools.length }} 个</span>
      </h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in freshTools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
          @mouseenter="prefetch(tool)"
        >
          <AppIcon class="tool-icon" :class="`cat-tint-${tool.category}`" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}<span class="new-badge">新</span><AppIcon v-if="tool.online" class="online-mark" name="wifi" :size="13" /></span>
          <span class="tool-desc">{{ tool.desc }}</span>
        </router-link>
      </div>
    </section>

    <section v-if="favTools.length && !query.trim()" class="cat-section">
      <h2 class="cat-title">
        <AppIcon class="cat-icon" name="star" :size="20" />我的收藏
        <span class="count-hint">拖动卡片可排序</span>
        <span class="fav-ops">
          <button class="op-btn" type="button" title="导出收藏(含最近使用)为 JSON 文件" aria-label="导出收藏" @click="exportFavs">
            <AppIcon name="download" :size="14" />
          </button>
          <button class="op-btn" type="button" title="从 JSON 文件导入收藏" aria-label="导入收藏" @click="importInput?.click()">
            <AppIcon name="upload" :size="14" />
          </button>
          <input ref="importInput" type="file" accept=".json,application/json" class="sr-only" @change="onImportFile" />
        </span>
      </h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in favTools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
          :class="{ 'fav-dragging': dragFavId === tool.id }"
          draggable="true"
          @mouseenter="prefetch(tool)"
          @dragstart="onFavDragStart($event, tool)"
          @dragover="onFavDragOver($event, tool)"
          @drop="onFavDrop($event, tool)"
          @dragend="dragFavId = null"
        >
          <AppIcon class="tool-icon" :class="`cat-tint-${tool.category}`" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}<span v-if="tool.fresh" class="new-badge">新</span><AppIcon v-if="tool.online" class="online-mark" name="wifi" :size="13" /></span>
          <span class="tool-desc">{{ tool.desc }}</span>
        </router-link>
      </div>
    </section>

    <section v-if="recentTools.length && !query.trim()" class="cat-section">
      <h2 class="cat-title"><AppIcon class="cat-icon" name="clock" :size="20" />最近使用</h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in recentTools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
          @mouseenter="prefetch(tool)"
        >
          <AppIcon class="tool-icon" :class="`cat-tint-${tool.category}`" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}<span v-if="tool.fresh" class="new-badge">新</span><AppIcon v-if="tool.online" class="online-mark" name="wifi" :size="13" /></span>
          <span class="tool-desc">{{ tool.desc }}</span>
        </router-link>
      </div>
    </section>

    <section v-for="cat in filtered" :key="cat.id" :id="`cat-${cat.id}`" class="cat-section">
      <h2 class="cat-title"><AppIcon class="cat-icon" :name="cat.icon" :size="20" />{{ cat.name }}</h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in cat.tools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
          @mouseenter="prefetch(tool)"
        >
          <AppIcon class="tool-icon" :class="`cat-tint-${tool.category}`" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}<span v-if="tool.fresh" class="new-badge">新</span><AppIcon v-if="tool.online" class="online-mark" name="wifi" :size="13" /></span>
          <span class="tool-desc">{{ tool.desc }}</span>
        </router-link>
      </div>
    </section>

    <div v-if="!filtered.length" class="empty panel">没有找到与「{{ query }}」相关的工具</div>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 36px;
}
.hero-title {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: var(--accent-grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}
.tagline {
  color: var(--muted);
  font-size: 15.5px;
  margin-bottom: 22px;
}
.search-wrap {
  position: relative;
  max-width: 560px;
  margin: 0 auto;
}
.search-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}
.search-input {
  padding-left: 42px;
  height: 50px;
  font-size: 16px;
  border-radius: 14px;
  box-shadow: var(--shadow);
}
.detect-row {
  margin-top: 12px;
}
.suggest-panel {
  max-width: 560px;
  margin: 14px auto 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  text-align: left;
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.suggest-preview {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--muted);
  background: var(--bg-soft);
  border-radius: 6px;
  padding: 2px 8px;
}
.cat-section {
  margin-bottom: 32px;
  scroll-margin-top: 76px; /* sticky header 高度,锚点定位不被盖住 */
}
/* 从工具页点分类徽章跳回时的高亮反馈 */
.cat-section.cat-flash {
  animation: cat-flash 1.6s ease-out;
}
@keyframes cat-flash {
  0%, 40% {
    background: var(--accent-soft);
    border-radius: var(--radius);
    box-shadow: 0 0 0 8px var(--accent-soft);
  }
  100% {
    background: transparent;
    box-shadow: none;
  }
}
.cat-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 14px;
}
.count-hint {
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}
/* 联网工具小标:与本地工具区分 */
.online-mark {
  color: var(--warning);
  vertical-align: 1px;
  margin-left: 5px;
}
/* 「新」徽章:最新上线的工具在卡片上常显,下批上线后随 fresh 标记消失 */
.new-badge {
  display: inline-block;
  vertical-align: 2px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--on-accent);
  background: var(--accent-grad);
  border-radius: 999px;
  padding: 3px 8px;
}
.cat-icon {
  display: inline-flex;
  align-items: center;
  color: var(--accent);
}
.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.tool-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 18px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  text-decoration: none;
  color: var(--text);
  transition: transform 0.16s, border-color 0.16s, box-shadow 0.16s;
}
.tool-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: var(--shadow-lg);
}
/* 收藏拖拽排序:被拖起的卡片半透明,其余卡片可承接 */
.fav-dragging {
  opacity: 0.45;
}
.fav-ops {
  display: inline-flex;
  gap: 6px;
  margin-left: auto;
}
.op-btn {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--muted);
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}
.op-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.hero-stats {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
}
/* 移动端分类快捷条:窄屏才出现,吸顶横向滚动 */
.mobile-cats {
  display: none;
}
@media (max-width: 900px) {
  .mobile-cats {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    position: sticky;
    top: 60px;
    z-index: 60;
    padding: 10px 16px;
    margin: 0 -16px 18px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
    scrollbar-width: none;
  }
  .mobile-cats::-webkit-scrollbar {
    display: none;
  }
  .m-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    font-size: 13px;
    color: var(--muted);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 6px 13px;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
  }
  .m-chip:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
}
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--muted);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 12px;
}
.tool-icon {
  display: block;
  width: 34px;
  height: 34px;
  padding: 6px;
  margin-bottom: 6px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--cat-color, var(--accent)) 13%, transparent);
  color: var(--cat-color, var(--accent));
}
.tool-name {
  font-weight: 600;
  font-size: 16.5px;
}
.tool-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 44px 16px;
  font-size: 16px;
}
</style>
