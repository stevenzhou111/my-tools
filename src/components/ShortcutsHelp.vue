<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const panelEl = ref(null)
let lastFocused = null

const GROUPS = [
  {
    title: '全局',
    items: [
      ['Ctrl + K', '打开 / 关闭全局搜索面板(mac 用 ⌘K)'],
      ['/', '聚焦侧栏搜索框(移动端打开搜索面板)'],
      ['?', '打开本快捷键帮助'],
    ],
  },
  {
    title: '面板内',
    items: [
      ['↑ / ↓', '在结果间移动'],
      ['Enter', '打开选中项;计算结果则复制'],
      ['Esc', '关闭面板'],
    ],
  },
  {
    title: '其他',
    items: [
      ['Esc', '关闭移动端抽屉 / 各类弹层'],
      ['直接输入算式', '面板里输入如 12*8+2,回车复制结果'],
    ],
  },
]

watch(
  () => props.open,
  async (v) => {
    if (v) {
      lastFocused = document.activeElement
      await nextTick()
      panelEl.value?.focus()
    } else if (lastFocused?.focus) {
      lastFocused.focus()
      lastFocused = null
    }
  },
)

function onKeydown(e) {
  if (e.key === 'Escape' && props.open) {
    e.stopPropagation()
    emit('close')
  }
}
window.addEventListener('keydown', onKeydown)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div v-if="open" class="sc-mask" @click.self="emit('close')">
        <div
          ref="panelEl"
          class="sc-panel"
          role="dialog"
          aria-modal="true"
          aria-label="快捷键帮助"
          tabindex="-1"
        >
          <div class="sc-head">
            <AppIcon name="keyboard" :size="18" />
            <h3>快捷键</h3>
            <button class="sc-close" type="button" aria-label="关闭帮助" @click="emit('close')">
              <AppIcon name="x" :size="16" />
            </button>
          </div>
          <div v-for="g in GROUPS" :key="g.title" class="sc-group">
            <div class="sc-group-title">{{ g.title }}</div>
            <div v-for="[keys, desc] in g.items" :key="keys" class="sc-row">
              <kbd>{{ keys }}</kbd>
              <span>{{ desc }}</span>
            </div>
          </div>
          <div class="sc-foot">按 <kbd>Esc</kbd> 或点击空白处关闭</div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.sc-mask {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: rgba(15, 17, 28, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.sc-panel {
  width: 100%;
  max-width: 460px;
  max-height: 80vh;
  overflow-y: auto;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  padding: 18px 20px;
  outline: none;
}
.sc-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
  margin-bottom: 12px;
}
.sc-head h3 {
  margin: 0;
  font-size: 17px;
}
.sc-close {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: var(--bg-soft);
  color: var(--muted);
  cursor: pointer;
}
.sc-close:hover {
  color: var(--text);
}
.sc-group {
  margin-bottom: 14px;
}
.sc-group-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.sc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 14.5px;
}
.sc-row kbd {
  flex-shrink: 0;
  min-width: 74px;
  text-align: center;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--text);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 6px;
  padding: 3px 8px;
  background: var(--bg-soft);
}
.sc-row span {
  color: var(--text);
}
.sc-foot {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  font-size: 12.5px;
  color: var(--muted);
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