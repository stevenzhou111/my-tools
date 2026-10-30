<script setup>
import { computed, ref } from 'vue'
import { diffJson, renderDiff } from '@/utils/jsonDiff'
import { useCopy } from '@/utils/useCopy'

const textA = ref('{\n  "name": "工具箱",\n  "version": 1,\n  "tags": ["dev", "tools"]\n}')
const textB = ref('{\n  "name": "工具箱",\n  "version": 2,\n  "tags": ["dev"],\n  "author": "me"\n}')
const error = ref('')
const { copiedKey, copy } = useCopy()

const result = computed(() => {
  error.value = ''
  try {
    const a = JSON.parse(textA.value)
    const b = JSON.parse(textB.value)
    return diffJson(a, b)
  } catch (e) {
    error.value = 'JSON 解析失败:' + e.message
    return null
  }
})

const counts = computed(() => {
  const r = result.value
  if (!r) return null
  const c = { add: 0, remove: 0, change: 0 }
  for (const e of r.entries) c[e.type]++
  return c
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    结构化对比两份 JSON:递归展平为<b>路径级</b>差异(新增 / 删除 / 变更),数组按下标对齐,类型不同(如 1 与 "1"、对象与数组)按整体变更处理。比逐行文本对比更能看清改了什么。
  </p>

  <div class="row" style="margin-bottom: 12px; align-items: flex-start">
    <div class="field" style="flex: 1">
      <label class="field-label" for="jd-a">JSON A(旧)</label>
      <textarea id="jd-a" v-model="textA" class="textarea mono" style="min-height: 160px; font-family: var(--mono); font-size: 13px" spellcheck="false"></textarea>
    </div>
    <div class="field" style="flex: 1">
      <label class="field-label" for="jd-b">JSON B(新)</label>
      <textarea id="jd-b" v-model="textB" class="textarea mono" style="min-height: 160px; font-family: var(--mono); font-size: 13px" spellcheck="false"></textarea>
    </div>
  </div>

  <div v-if="error" class="error-box">✗ {{ error }}</div>

  <template v-else-if="result">
    <div class="row" style="flex-wrap: wrap; gap: 14px">
      <strong :style="{ color: result.total ? 'var(--warning)' : 'var(--success)' }">
        {{ result.total ? `共 ${result.total} 处差异` : '两份 JSON 完全一致' }}
      </strong>
      <span v-if="counts" class="tip">
        <span style="color: var(--success)">新增 {{ counts.add }}</span> ·
        <span style="color: var(--danger)">删除 {{ counts.remove }}</span> ·
        <span style="color: var(--warning)">变更 {{ counts.change }}</span>
      </span>
      <span v-if="result.truncated" class="tip">⚠️ 差异过多,仅展示前 {{ result.entries.length }} 条</span>
      <button v-if="result.total" class="btn btn-sm" @click="copy('jd', renderDiff(result.entries))">
        {{ copiedKey === 'jd' ? '✓ 已复制' : '复制差异' }}
      </button>
    </div>
    <pre v-if="result.entries.length" class="output diff-pre">{{ renderDiff(result.entries) }}</pre>
  </template>
</template>

<style scoped>
.diff-pre {
  margin-top: 10px;
  max-height: 420px;
  font-size: 13px;
  user-select: all;
}
</style>
