<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const { copiedKey, copy } = useCopy()

const last = ref(null)
const history = ref([])

// 特殊键的展示名,避免 key 值太生硬
const KEY_NAMES = {
  ' ': 'Space',
  Control: 'Ctrl',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
}

function onKeyDown(e) {
  const info = {
    key: e.key,
    name: KEY_NAMES[e.key] ?? e.key,
    code: e.code,
    keyCode: e.keyCode,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: e.metaKey,
    caps: e.getModifierState?.('CapsLock') ?? false,
  }
  last.value = info
  history.value.unshift({ ...info, t: Date.now() })
  if (history.value.length > 24) history.value.length = 24
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

function toJson(info) {
  const { key, code, keyCode, ctrl, alt, shift, meta } = info
  return JSON.stringify({ key, code, keyCode, ctrlKey: ctrl, altKey: alt, shiftKey: shift, metaKey: meta }, null, 2)
}

const MODS = [
  { label: 'Ctrl', prop: 'ctrl' },
  { label: 'Alt', prop: 'alt' },
  { label: 'Shift', prop: 'shift' },
  { label: 'Meta / Win', prop: 'meta' },
  { label: 'CapsLock', prop: 'caps' },
]
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    按下键盘上任意一个键,这里会实时显示它对应的
    <code>event.key</code>、<code>event.code</code> 与旧的 <code>keyCode</code>,写快捷键逻辑或排查键盘问题时用。
    工具只监听不拦截,不会影响你的任何组合键。
  </p>

  <div v-if="!last" class="panel keyhint-empty">⌨️ 请按下任意键开始</div>

  <template v-else>
    <div class="panel" style="text-align: center; padding: 26px 18px">
      <kbd class="big-key">{{ last.name }}</kbd>
      <div class="mod-row">
        <span v-for="m in MODS" :key="m.prop" class="mod-chip" :class="{ on: last[m.prop] }">{{ m.label }}</span>
      </div>
      <div class="row" style="justify-content: center; margin-top: 14px">
        <button class="btn btn-sm btn-primary" @click="copy('json', toJson(last))">
          {{ copiedKey === 'json' ? '✓ 已复制 JSON' : '复制 JSON' }}
        </button>
      </div>
    </div>

    <div class="panel prop-panel" style="margin-top: 14px">
      <div class="prop-grid">
        <div class="prop-item">
          <span class="prop-label">event.key</span>
          <code>{{ last.key === ' ' ? '(空格字符)' : last.key }}</code>
        </div>
        <div class="prop-item">
          <span class="prop-label">event.code(物理键位)</span>
          <code>{{ last.code || '—' }}</code>
        </div>
        <div class="prop-item">
          <span class="prop-label">event.keyCode(已废弃)</span>
          <code>{{ last.keyCode }}</code>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="row" style="justify-content: space-between; margin-bottom: 8px">
        <span class="field-label" style="margin: 0">按键历史(最近 {{ history.length }} 条)</span>
        <button class="btn btn-sm" @click="history = []">清空</button>
      </div>
      <div class="history-list">
        <div v-for="(h, i) in history" :key="h.t + '-' + i" class="history-row">
          <kbd class="mini-key">{{ h.name }}</kbd>
          <span class="hist-code">{{ h.code || '—' }}</span>
          <span class="hist-kc">{{ h.keyCode }}</span>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.keyhint-empty {
  text-align: center;
  padding: 46px 18px;
  color: var(--muted);
  font-size: 17px;
}
.big-key {
  display: inline-block;
  min-width: 130px;
  padding: 18px 30px;
  font-size: 34px;
  font-weight: 700;
  border-radius: 12px;
  border: 1px solid var(--border);
  border-bottom-width: 4px;
  background: var(--bg-soft);
  box-shadow: var(--shadow);
}
.mod-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 16px;
}
.mod-chip {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 13.5px;
  color: var(--muted);
}
.mod-chip.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.prop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 720px) {
  .prop-grid {
    grid-template-columns: 1fr;
  }
}
.prop-item code {
  display: block;
  margin-top: 4px;
  font-size: 15px;
  word-break: break-all;
}
.prop-label {
  font-size: 13.5px;
  color: var(--muted);
}
.history-list {
  max-height: 300px;
  overflow: auto;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 14.5px;
}
.history-row:last-child {
  border-bottom: none;
}
.mini-key {
  min-width: 90px;
  padding: 2px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hist-code {
  flex: 1;
}
.hist-kc {
  width: 70px;
  text-align: right;
  color: var(--muted);
}
</style>
