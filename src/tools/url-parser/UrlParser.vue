<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref('https://example.com:8443/docs/list?kw=%E5%B7%A5%E5%85%B7%E7%AE%B1&page=2&tag=vue#top')
const error = ref('')
const { copiedKey, copy } = useCopy()

const parsed = computed(() => {
  const s = input.value.trim()
  if (!s) return null
  try {
    return new URL(s)
  } catch {
    return null
  }
})

const params = computed(() => {
  const u = parsed.value
  if (!u) return []
  return [...u.searchParams.entries()].map(([k, v]) => ({ k, v }))
})

const basics = computed(() => {
  const u = parsed.value
  if (!u) return []
  return [
    { key: 'protocol', label: '协议', value: u.protocol.replace(':', '') },
    { key: 'host', label: '主机名', value: u.hostname },
    { key: 'port', label: '端口', value: u.port || (u.protocol === 'https:' ? '443(默认)' : u.protocol === 'http:' ? '80(默认)' : '—') },
    { key: 'pathname', label: '路径', value: u.pathname },
    { key: 'search', label: '查询字符串', value: u.search || '(无)' },
    { key: 'hash', label: '锚点', value: u.hash || '(无)' },
    { key: 'origin', label: '源 Origin', value: u.origin },
  ]
})
</script>

<template>
  <div class="field">
    <label class="field-label">输入 URL</label>
    <input v-model="input" class="input" spellcheck="false" placeholder="https://…" />
  </div>

  <div v-if="input.trim() && !parsed" class="error-box">✗ 无法解析,请检查 URL 格式</div>

  <template v-if="parsed">
    <label class="field-label">基本信息</label>
    <div class="panel" style="padding: 6px 14px">
      <div v-for="b in basics" :key="b.key" class="row-line">
        <span class="line-label">{{ b.label }}</span>
        <code class="line-value">{{ b.value }}</code>
        <button v-if="b.value && !b.value.startsWith('(')" class="btn btn-sm" @click="copy(b.key, b.value.replace(/\s*\(默认\)$/, ''))">
          {{ copiedKey === b.key ? '✓' : '复制' }}
        </button>
      </div>
    </div>

    <label class="field-label" style="margin-top: 16px">查询参数({{ params.length }} 个)</label>
    <div v-if="params.length" class="panel" style="padding: 6px 14px">
      <div v-for="(p, i) in params" :key="i" class="row-line">
        <code class="param-key">{{ p.k }}</code>
        <span class="eq">=</span>
        <code class="line-value">{{ p.v }}</code>
        <button class="btn btn-sm" @click="copy('p' + i, p.v)">
          {{ copiedKey === 'p' + i ? '✓' : '复制' }}
        </button>
      </div>
    </div>
    <p v-else class="tip">该 URL 没有查询参数。</p>
  </template>
</template>

<style scoped>
.row-line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14.5px;
}
.row-line:last-child {
  border-bottom: none;
}
.line-label {
  width: 80px;
  flex-shrink: 0;
  color: var(--muted);
}
.line-value {
  flex: 1;
  word-break: break-all;
}
.param-key {
  color: var(--accent);
}
.eq {
  color: var(--muted);
}
</style>
