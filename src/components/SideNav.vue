<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, TOOLS, getTool } from '@/tools/registry'
import { useToolPrefs } from '@/utils/prefs'
import AppIcon from '@/components/AppIcon.vue'

const emit = defineEmits(['navigate'])

const route = useRoute()
const query = ref('')
// 分类默认全部折叠;以"已展开集合"持久化(空集 = 默认态,新增分类自动折叠),
// 否则每次导航折叠状态重置,收藏/浏览时反复展开收起
const EXPANDED_KEY = 'toolbox-nav-expanded'
const CAT_IDS = new Set(CATEGORIES.map((c) => c.id))
function loadExpanded() {
  try {
    const arr = JSON.parse(localStorage.getItem(EXPANDED_KEY))
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string' && CAT_IDS.has(id)) : []
  } catch {
    return []
  }
}
const expanded = reactive(new Set(loadExpanded()))
watch(
  () => [...expanded],
  (v) => {
    try {
      localStorage.setItem(EXPANDED_KEY, JSON.stringify(v))
    } catch {
      /* 隐私模式下忽略 */
    }
  },
)
const { favorites, reorderFav } = useToolPrefs()
const dragFavId = ref(null)

function onFavDragStart(e, tool) {
  dragFavId.value = tool.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', tool.id) // Firefox 需有数据才启动拖拽
}
function onFavDragOver(e, tool) {
  if (!dragFavId.value || dragFavId.value === tool.id) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  reorderFav(dragFavId.value, favTools.value.findIndex((f) => f.id === tool.id))
}
function onFavDrop(e) {
  e.preventDefault()
  dragFavId.value = null
}

const favTools = computed(() => favorites.value.map((id) => getTool(id)).filter(Boolean))

const currentTool = computed(() => getTool(route.params.id))

// 当前工具所在分类自动展开
watch(
  currentTool,
  (tool) => {
    if (tool) expanded.add(tool.category)
  },
  { immediate: true },
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return CATEGORIES.map((cat) => ({
    ...cat,
    tools: TOOLS.filter(
      (t) => t.category === cat.id && (!q || `${t.name} ${t.keywords}`.toLowerCase().includes(q)),
    ),
  })).filter((cat) => cat.tools.length > 0)
})

// 搜索时强制展开所有命中分类:否则结果被折叠态藏住,又因 filtered 非空不显示空态,
// 搜索看起来"什么都搜不到"
const searching = computed(() => query.value.trim().length > 0)

function toggle(catId) {
  if (expanded.has(catId)) expanded.delete(catId)
  else expanded.add(catId)
}

function emitNavigate() {
  emit('navigate')
}
</script>

<template>
  <nav class="side-nav">
    <input v-model="query" class="input side-search" type="search" placeholder="搜索工具…" aria-label="搜索工具" />

    <router-link to="/" class="side-link side-home" :class="{ active: route.name === 'home' }" @click="emitNavigate">
      <AppIcon class="side-tool-icon" name="house" :size="16" />工具首页
    </router-link>

    <div v-if="favTools.length" class="side-cat">
      <div class="side-cat-head side-cat-static"><AppIcon name="star" :size="14" />收藏</div>
      <div class="side-tools">
        <router-link
          v-for="tool in favTools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="side-link"
          :class="{ active: route.params.id === tool.id, 'side-fav-dragging': dragFavId === tool.id }"
          draggable="true"
          @click="emitNavigate"
          @dragstart="onFavDragStart($event, tool)"
          @dragover="onFavDragOver($event, tool)"
          @drop="onFavDrop($event)"
          @dragend="dragFavId = null"
        >
          <AppIcon class="side-tool-icon" :name="tool.icon" :size="16" />{{ tool.name }}
        </router-link>
      </div>
    </div>

    <div v-for="cat in filtered" :key="cat.id" class="side-cat">
      <button
        class="side-cat-head"
        type="button"
        :aria-expanded="searching || expanded.has(cat.id)"
        @click="toggle(cat.id)"
      >
        <span class="side-cat-name"><AppIcon :name="cat.icon" :size="15" />{{ cat.name }}</span>
        <span class="chev">{{ expanded.has(cat.id) ? '▾' : '▸' }}</span>
      </button>
      <div v-show="searching || expanded.has(cat.id)" class="side-tools">
        <router-link
          v-for="tool in cat.tools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="side-link"
          :class="{ active: route.params.id === tool.id }"
          @click="emitNavigate"
        >
          <AppIcon class="side-tool-icon" :name="tool.icon" :size="16" />{{ tool.name }}
        </router-link>
      </div>
    </div>

    <div v-if="!filtered.length" class="tip side-empty">没有匹配的工具</div>
  </nav>
</template>

<style scoped>
.side-nav {
  padding: 14px 12px 26px;
}
.side-search {
  margin-bottom: 12px;
  font-size: 15px;
  padding: 9px 13px;
}
.side-fav-dragging {
  opacity: 0.45;
}
.side-cat {
  margin-top: 6px;
}
.side-cat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.5px;
}
.side-cat-static {
  cursor: default;
}
.side-cat-head:hover .side-cat-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--accent);
}
.chev {
  font-size: 12px;
  opacity: 0.7;
}
.side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 9px;
  font-size: 15px;
  color: var(--text);
  text-decoration: none;
  border-left: 3px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s, color 0.12s;
}
.side-link:hover {
  background: var(--bg-soft);
}
.side-link.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
  border-left-color: var(--accent);
}
.side-home {
  font-weight: 600;
  margin-bottom: 6px;
}
.side-home.active {
  border-left-color: var(--accent);
}
.side-tool-icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  /* 跟随链接文字色:默认正文色,选中时才变主题色,避免整列图标过于抢眼 */
}
.side-empty {
  padding: 14px 12px;
}
</style>
