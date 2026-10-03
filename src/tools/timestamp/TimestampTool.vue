<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const { copiedKey, copy } = useCopy()

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 1000)
onUnmounted(() => clearInterval(timer))

const tsInput = ref(String(Math.floor(Date.now() / 1000)))
useUrlState([{ key: 'ts', ref: tsInput, parse: (s) => (/^-?\d{1,16}$/.test(s) ? s : undefined) }])

function pad(x) {
  return String(x).padStart(2, '0')
}

function toLocalInputValue(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const dateValue = ref(toLocalInputValue(new Date()))

function useNow() {
  now.value = Date.now()
  tsInput.value = String(Math.floor(now.value / 1000))
  dateValue.value = toLocalInputValue(new Date(now.value))
}

// 输入超过 10 位数字按毫秒处理
const parsed = computed(() => {
  const raw = tsInput.value.trim()
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  const isSeconds = raw.length <= 10
  const ms = isSeconds ? n * 1000 : n
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return { isSeconds, ms, d }
})

const reverse = computed(() => {
  if (!dateValue.value) return null
  const t = new Date(dateValue.value).getTime()
  if (Number.isNaN(t)) return null
  return { seconds: Math.floor(t / 1000), ms: t }
})

const parsedDisplay = computed(() => {
  if (!parsed.value) return null
  const { d, isSeconds, ms } = parsed.value
  return [
    { key: 'local', label: '本地时间', value: d.toLocaleString('zh-CN', { hour12: false }) },
    { key: 'iso', label: 'ISO (UTC)', value: d.toISOString() },
    { key: 'unit', label: '识别为', value: isSeconds ? '秒级时间戳' : '毫秒级时间戳' },
    { key: 'ms', label: '毫秒时间戳', value: String(ms) },
  ]
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    当前时间戳:<strong class="now">{{ Math.floor(now / 1000) }}</strong> (秒) ·
    {{ now }} (毫秒)
    <button class="btn btn-sm" style="margin-left: 8px" @click="useNow">填入当前时间</button>
  </p>

  <div class="grid-2">
    <div class="panel">
      <h3>时间戳 → 日期</h3>
      <div class="field">
        <label class="field-label">Unix 时间戳</label>
        <input v-model="tsInput" v-draft="'timestamp-ts'" class="input" placeholder="如 1759190400 或 1759190400000" spellcheck="false" />
      </div>
      <template v-if="parsedDisplay">
        <div v-for="row in parsedDisplay" :key="row.key" class="result-row">
          <span class="result-label">{{ row.label }}</span>
          <code class="result-value">{{ row.value }}</code>
          <button class="btn btn-sm" @click="copy(row.key, row.value)">
            {{ copiedKey === row.key ? '✓' : '复制' }}
          </button>
        </div>
      </template>
      <p v-else-if="tsInput.trim()" class="error-box">✗ 请输入纯数字时间戳</p>
    </div>

    <div class="panel">
      <h3>日期 → 时间戳</h3>
      <div class="field">
        <label class="field-label">日期时间</label>
        <input v-model="dateValue" type="datetime-local" step="1" class="input" />
      </div>
      <template v-if="reverse">
        <div class="result-row">
          <span class="result-label">秒级时间戳</span>
          <code class="result-value">{{ reverse.seconds }}</code>
          <button class="btn btn-sm" @click="copy('r-sec', String(reverse.seconds))">
            {{ copiedKey === 'r-sec' ? '✓' : '复制' }}
          </button>
        </div>
        <div class="result-row">
          <span class="result-label">毫秒级时间戳</span>
          <code class="result-value">{{ reverse.ms }}</code>
          <button class="btn btn-sm" @click="copy('r-ms', String(reverse.ms))">
            {{ copiedKey === 'r-ms' ? '✓' : '复制' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.now {
  color: var(--accent);
  font-family: var(--mono);
}
.result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14.5px;
}
.result-row:last-child {
  border-bottom: none;
}
.result-label {
  flex-shrink: 0;
  width: 86px;
  color: var(--muted);
}
.result-value {
  flex: 1;
  word-break: break-all;
}
</style>
