<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CATEGORIES, TOOLS } from '@/tools/registry'
import { useToolPrefs } from '@/utils/prefs'
import { useTheme } from '@/utils/theme'
import { evalExpression } from '@/utils/calcExpression'
import { useCopy } from '@/utils/useCopy'
import AppIcon from '@/components/AppIcon.vue'

const emit = defineEmits(['open-help'])

const router = useRouter()
const { favorites, recents } = useToolPrefs()
const { theme, toggleTheme } = useTheme()
const { copy } = useCopy()

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const inputEl = ref(null)
const listEl = ref(null)

const catName = computed(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name])))

// 简单打分:名称前缀 > 名称包含 > 关键词/描述包含
function score(tool, q) {
  const name = tool.name.toLowerCase()
  if (name.startsWith(q)) return 0
  if (name.includes(q)) return 1
  if (`${tool.keywords} ${tool.desc}`.toLowerCase().includes(q)) return 2
  return Infinity
}

const ACTIONS = [
  {
    id: 'theme',
    name: '切换深色 / 浅色模式',
    icon: 'moon',
    keywords: 'theme 深色 浅色 暗色 亮色 主题',
    run: () => toggleTheme(),
  },
  {
    id: 'random',
    name: '随机打开一个工具',
    icon: 'shuffle',
    keywords: 'random 随机 逛 换一个',
    run: () => router.push(`/tool/${TOOLS[Math.floor(Math.random() * TOOLS.length)].id}`),
  },
  {
    id: 'home',
    name: '打开工具首页',
    icon: 'house',
    keywords: 'home 首页 主页 返回',
    run: () => router.push('/'),
  },
  {
    id: 'help',
    name: '查看快捷键帮助',
    icon: 'keyboard',
    keywords: '快捷键 help 帮助 keyboard shortcuts',
    run: () => emit('open-help'),
  },
]

function matchActions(q) {
  if (!q) return []
  return ACTIONS.filter((a) => `${a.name} ${a.keywords}`.toLowerCase().includes(q))
}

// 统一条目模型:计算结果 / 动作 / 工具,键盘导航与 Enter 都作用在这一份列表上
const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  const out = []

  if (q) {
    const { value } = evalExpression(query.value.trim())
    if (value !== null) out.push({ kind: 'calc', value })
  }

  const actions = matchActions(q).map((a) => ({ kind: 'action', action: a }))
  let tools
  if (!q) {
    const isFav = (t) => favorites.value.includes(t.id)
    const isRec = (t) => recents.value.includes(t.id)
    tools = [...TOOLS.filter(isFav), ...TOOLS.filter((t) => isRec(t) && !isFav(t)), ...TOOLS.filter((t) => !isFav(t) && !isRec(t))].map((t) => ({
      kind: 'tool',
      tool: t,
      tag: isFav(t) ? '收藏' : isRec(t) ? '最近' : catName.value[t.category],
      tagIcon: isFav(t) ? 'star' : isRec(t) ? 'clock' : CATEGORIES.find((c) => c.id === t.category)?.icon,
    }))
  } else {
    tools = TOOLS.map((t) => ({ t, s: score(t, q) }))
      .filter((x) => x.s < Infinity)
      .sort((a, b) => a.s - b.s)
      .map((x) => ({
        kind: 'tool',
        tool: x.t,
        tag: catName.value[x.t.category],
        tagIcon: CATEGORIES.find((c) => c.id === x.t.category)?.icon,
      }))
  }

  // 空查询时工具优先(收藏/最近直达是面板最高频用法);有查询时计算与动作排在结果前
  return q ? [...out, ...actions, ...tools] : [...tools, ...actions]
})

// 打开前记住焦点来源,关闭时归还;Tab 强制留在面板内(命令面板的惯例交互)
let lastFocused = null
watch(open, async (v) => {
  if (v) {
    lastFocused = document.activeElement
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    inputEl.value?.focus()
  } else if (lastFocused?.focus) {
    lastFocused.focus()
    lastFocused = null
  }
})

watch([query, items], () => (activeIndex.value = 0))

function close() {
  open.value = false
}

function activate(item) {
  if (!item) return
  if (item.kind === 'calc') {
    copy('calc', String(item.value))
    close()
    return
  }
  if (item.kind === 'action') {
    close()
    item.action.run()
    return
  }
  close()
  router.push(`/tool/${item.tool.id}`)
}

function scrollActive() {
  nextTick(() => {
    listEl.value?.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    open.value = !open.value
    return
  }
  if (!open.value) return
  if (e.key === 'Tab') {
    // 唯一可聚焦元素是输入框:按 Tab 时把焦点拉回输入框,防止穿过遮罩落到页面底层
    e.preventDefault()
    inputEl.value?.focus()
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!items.value.length) return
    activeIndex.value = Math.min(activeIndex.value + 1, items.value.length - 1)
    scrollActive()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActive()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    activate(items.value[activeIndex.value])
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

defineExpose({ open: () => (open.value = true) })
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="open" class="palette-mask" @click.self="close">
        <div class="palette" role="dialog" aria-modal="true" aria-label="全局搜索">
          <div class="palette-input-row">
            <AppIcon class="pi-search" name="search" :size="16" />
            <input
              ref="inputEl"
              v-model="query"
              class="palette-input"
              type="search"
              role="combobox"
              aria-label="搜索工具、执行动作或直接输入算式"
              aria-autocomplete="list"
              aria-controls="palette-listbox"
              :aria-activedescendant="items[activeIndex] ? `palette-opt-${activeIndex}` : undefined"
              aria-expanded="true"
              placeholder="搜索工具、执行动作或直接输入算式…(↑↓ 选择)"
            />
            <kbd class="palette-kbd">Esc</kbd>
          </div>
          <div id="palette-listbox" ref="listEl" class="palette-list" role="listbox" aria-label="搜索结果">
            <button
              v-for="(item, i) in items"
              :id="`palette-opt-${i}`"
              :key="item.kind === 'tool' ? `tool-${item.tool.id}` : `${item.kind}-${i}`"
              type="button"
              class="palette-item"
              :class="{ active: i === activeIndex }"
              role="option"
              :aria-selected="i === activeIndex"
              @mouseenter="activeIndex = i"
              @click="activate(item)"
            >
              <template v-if="item.kind === 'calc'">
                <span class="pi-calc">=</span>
                <span class="pi-name">{{ item.value }} <em class="pi-expr">(回车复制)</em></span>
                <span class="pi-tag">计算</span>
              </template>
              <template v-else-if="item.kind === 'action'">
                <AppIcon class="pi-icon" :name="item.action.icon" :size="16" />
                <span class="pi-name">{{ item.action.name }}</span>
                <span class="pi-tag">动作</span>
              </template>
              <template v-else>
                <AppIcon class="pi-icon" :name="item.tool.icon" :size="16" />
                <span class="pi-name">{{ item.tool.name }}</span>
                <span class="pi-tag"><AppIcon :name="item.tagIcon" :size="11" />{{ item.tag }}</span>
              </template>
            </button>
            <div v-if="!items.length" class="palette-empty">没有匹配的工具</div>
          </div>
          <div class="palette-foot">↑↓ 选择 · Enter 打开 · Esc 关闭 · 试试输入 1+2</div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.palette-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(15, 17, 28, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 0;
}
.palette {
  width: 100%;
  max-width: 580px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.palette-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.pi-search {
  color: var(--muted);
  flex-shrink: 0;
}
.palette-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 16px;
  color: var(--text);
}
.palette-input::placeholder {
  color: var(--muted);
}
.palette-kbd {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 7px;
  background: var(--bg-soft);
}
.palette-list {
  max-height: 52vh;
  overflow-y: auto;
  padding: 8px;
}
.palette-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--text);
  font-size: 15px;
}
.palette-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}
.pi-icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.pi-calc {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-weight: 800;
  color: var(--accent);
  font-size: 17px;
}
.pi-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pi-expr {
  font-style: normal;
  font-weight: 400;
  font-size: 12.5px;
  color: var(--muted);
}
.pi-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--muted);
  flex-shrink: 0;
}
.palette-item.active .pi-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
}
.palette-empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 0;
}
.palette-foot {
  padding: 9px 16px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--muted);
  text-align: center;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>