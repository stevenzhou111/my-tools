<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { APP_NAME, APP_TAGLINE } from '@/config'
import { CATEGORIES, TOOLS, getTool } from '@/tools/registry'
import { useRouter } from 'vue-router'
import { useToolPrefs } from '@/utils/prefs'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const query = ref('')
const searchEl = ref(null)
const { favorites, recents } = useToolPrefs()

const favTools = computed(() =>
  favorites.value.map((id) => getTool(id)).filter(Boolean),
)
const recentTools = computed(() =>
  recents.value.map((id) => getTool(id)).filter(Boolean),
)

function onKey(e) {
  if (e.key === '/' && document.activeElement !== searchEl.value) {
    // 焦点已在任意输入框(含命令面板)时不抢焦点
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    e.preventDefault()
    searchEl.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return CATEGORIES.map((cat) => ({
    ...cat,
    tools: TOOLS.filter(
      (t) =>
        t.category === cat.id &&
        (!q || `${t.name} ${t.desc} ${t.keywords}`.toLowerCase().includes(q)),
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
      detectError.value = '没有识别出已知类型(支持 JSON / JWT / URL / 颜色 / Base64 / 时间戳)'
    }
  } catch {
    detectError.value = '读取剪贴板被拒绝或失败,请手动复制后重试'
  }
}
function openRandom() {
  router.push(`/tool/${TOOLS[Math.floor(Math.random() * TOOLS.length)].id}`)
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
      <div class="search-wrap">
        <AppIcon class="search-icon" name="search" :size="18" />
        <input
          ref="searchEl"
          v-model="query"
          class="input search-input"
          type="search"
          placeholder="搜索工具,如 JSON、二维码、时间戳…(按 / 快速聚焦)"
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

    <section v-if="favTools.length && !query.trim()" class="cat-section">
      <h2 class="cat-title"><AppIcon class="cat-icon" name="star" :size="20" />我的收藏</h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in favTools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
        >
          <AppIcon class="tool-icon" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}</span>
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
        >
          <AppIcon class="tool-icon" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}</span>
          <span class="tool-desc">{{ tool.desc }}</span>
        </router-link>
      </div>
    </section>

    <section v-for="cat in filtered" :key="cat.id" class="cat-section">
      <h2 class="cat-title"><AppIcon class="cat-icon" :name="cat.icon" :size="20" />{{ cat.name }}</h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in cat.tools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
        >
          <AppIcon class="tool-icon" :name="tool.icon" :size="22" />
          <span class="tool-name">{{ tool.name }}</span>
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
}
.cat-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 19px;
  font-weight: 700;
  margin-bottom: 14px;
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
.tool-icon {
  display: block;
  width: 34px;
  height: 34px;
  padding: 6px;
  margin-bottom: 6px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
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
