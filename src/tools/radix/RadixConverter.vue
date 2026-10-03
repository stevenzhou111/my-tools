<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const BASES = [
  { id: 2, label: '二进制' },
  { id: 8, label: '八进制' },
  { id: 10, label: '十进制' },
  { id: 16, label: '十六进制' },
]

const input = ref('255')
const from = ref(10)
// 输入与进制同步到地址栏,可分享指定进制的转换结果
useUrlState([
  { key: 'q', ref: input, parse: shortString(64) },
  { key: 'base', ref: from, parse: (s) => ([2, 8, 10, 16].includes(Number(s)) ? Number(s) : undefined) },
])
const { copiedKey, copy } = useCopy()

const PREFIX_RE = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i }

const value = computed(() => {
  let s = input.value.trim()
  if (!s) return { empty: true }
  if (PREFIX_RE[from.value]) s = s.replace(PREFIX_RE[from.value], '')
  if (!s) return { empty: true }
  let n = 0n
  const bigBase = BigInt(from.value)
  for (const ch of s.toLowerCase()) {
    const d = parseInt(ch, 36)
    if (Number.isNaN(d) || d >= from.value) {
      return { error: `字符「${ch}」不是 ${from.value} 进制的合法数字` }
    }
    n = n * bigBase + BigInt(d)
  }
  return { n }
})

const results = computed(() => {
  const v = value.value
  if (!v || v.empty || v.error) return []
  return BASES.map((b) => ({ ...b, text: v.n.toString(b.id) }))
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <div class="field" style="margin: 0; flex: 1; min-width: 200px">
      <label class="field-label">数值</label>
      <input v-model="input" v-draft="'radix-input'" class="input" placeholder="输入要转换的数字" spellcheck="false" />
    </div>
    <div class="field" style="margin: 0; width: 160px">
      <label class="field-label">当前进制</label>
      <select v-model.number="from" class="select">
        <option v-for="b in BASES" :key="b.id" :value="b.id">{{ b.label }} ({{ b.id }})</option>
      </select>
    </div>
  </div>

  <div v-if="value && value.error" class="error-box">✗ {{ value.error }}</div>

  <div v-else class="result-grid">
    <div v-for="r in results" :key="r.id" class="panel result-item">
      <div class="result-head">
        <span class="result-label">{{ r.label }} <code>({{ r.id }})</code></span>
        <button class="btn btn-sm" @click="copy(String(r.id), r.text)">
          {{ copiedKey === String(r.id) ? '✓' : '复制' }}
        </button>
      </div>
      <pre class="output result-text">{{ r.text }}</pre>
    </div>
  </div>

  <p class="tip" style="margin-top: 12px">基于 BigInt 实现,支持任意大的整数;支持 0x / 0b / 0o 前缀。</p>
</template>

<style scoped>
.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 720px) {
  .result-grid { grid-template-columns: 1fr; }
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.result-label {
  font-size: 14px;
  color: var(--muted);
  font-weight: 500;
}
.result-text {
  max-height: 120px;
  background: var(--bg-soft);
}
</style>
