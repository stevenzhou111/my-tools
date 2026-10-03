<script setup>
import { computed, ref } from 'vue'

const input = ref(`Vue 是一款渐进式 JavaScript 框架。
Vue 的核心库只关注视图层,Vue 也完全能够为复杂的单页应用提供驱动。
工具箱使用 Vue 3 构建。`)

const tab = ref('word')
const topN = ref(20)

const wordItems = computed(() => {
  const words = (input.value.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || [])
  const map = new Map()
  for (const w of words) map.set(w, (map.get(w) || 0) + 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word, count]) => ({ word, count }))
})

const charItems = computed(() => {
  const chars = input.value.match(/[\u4e00-\u9fa5]/g) || []
  const map = new Map()
  for (const c of chars) map.set(c, (map.get(c) || 0) + 1)
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([char, count]) => ({ word: char, count }))
})

const items = computed(() => (tab.value === 'word' ? wordItems.value : charItems.value))
const total = computed(() => items.value.reduce((n, it) => n + it.count, 0))
const shown = computed(() => items.value.slice(0, topN.value))
const max = computed(() => (shown.value[0]?.count ?? 1))
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="tab" type="radio" value="word" />英文单词频率(共 {{ wordItems.length }} 个词)</label>
    <label class="check"><input v-model="tab" type="radio" value="char" />中文字符频率(共 {{ charItems.length }} 个字)</label>
    <select v-model.number="topN" class="select" style="width: auto">
      <option :value="10">Top 10</option>
      <option :value="20">Top 20</option>
      <option :value="50">Top 50</option>
      <option :value="100">Top 100</option>
      <option :value="100000">全部</option>
    </select>
  </div>

  <div v-if="!items.length" class="tip">没有可统计的内容。</div>

  <div v-else class="panel freq-panel">
    <div v-for="it in shown" :key="it.word" class="freq-row">
      <code class="freq-word">{{ it.word }}</code>
      <div class="freq-bar-wrap">
        <div class="freq-bar" :style="{ width: (it.count / max) * 100 + '%' }"></div>
      </div>
      <span class="freq-count">{{ it.count }} 次({{ ((it.count / total) * 100).toFixed(1) }}%)</span>
    </div>
  </div>
</template>

<style scoped>
.freq-panel {
  max-height: 460px;
  overflow: auto;
  display: grid;
  gap: 8px;
}
.freq-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}
.freq-word {
  width: 150px;
  flex-shrink: 0;
  color: var(--accent);
  word-break: break-all;
}
.freq-bar-wrap {
  flex: 1;
  height: 10px;
  background: var(--bg-soft);
  border-radius: 6px;
  overflow: hidden;
}
.freq-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #8b5cf6);
  border-radius: 6px;
  transition: width 0.2s;
}
.freq-count {
  width: 110px;
  flex-shrink: 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 720px) {
  .freq-word { width: 90px; }
  .freq-count { width: auto; }
}
</style>
