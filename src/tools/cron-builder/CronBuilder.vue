<script setup>
import { computed, ref } from 'vue'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/zh_CN'
import { nextRuns } from '@/utils/cron'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const expr = ref('30 9 * * 1')
useUrlState([{ key: 'e', ref: expr, parse: shortString(120) }])
const { copiedKey, copy } = useCopy()

const FIELDS = [
  { key: 'min', label: '分钟', hint: '0-59' },
  { key: 'hour', label: '小时', hint: '0-23' },
  { key: 'dom', label: '日', hint: '1-31' },
  { key: 'mon', label: '月', hint: '1-12' },
  { key: 'dow', label: '周', hint: '0-6(0 是周日,7 也认)' },
]

const PRESETS = [
  { label: '每天 09:30', expr: '30 9 * * *' },
  { label: '每小时第 0 分', expr: '0 * * * *' },
  { label: '每 15 分钟', expr: '*/15 * * * *' },
  { label: '工作日 09:00', expr: '0 9 * * 1-5' },
  { label: '每周一 09:30', expr: '30 9 * * 1' },
  { label: '每月 1 号 00:00', expr: '0 0 1 * *' },
  { label: '每天 8/12/20 点', expr: '0 8,12,20 * * *' },
  { label: '每月 15 号 14:30', expr: '30 14 15 * *' },
]

function setParts(value) {
  const parts = value.trim().split(/\s+/)
  return parts.length === 5 ? parts : null
}
function usePreset(p) {
  expr.value = p.expr
}

const parts = computed(() => setParts(expr.value) ?? expr.value.trim().split(/\s+/))

function setField(i, v) {
  const p = setParts(expr.value)
  if (!p) return
  p[i] = v
  expr.value = p.join(' ')
}

const parsed = computed(() => nextRuns(expr.value, 5))
const desc = computed(() => {
  if (!parsed.value.ok) return ''
  try {
    return cronstrue.toString(expr.value, { locale: 'zh_CN' })
  } catch {
    return ''
  }
})

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
function fmtRun(d) {
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${WEEK[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <button v-for="p in PRESETS" :key="p.expr" class="btn btn-sm" @click="usePreset(p)">{{ p.label }}</button>
  </div>

  <div class="field">
    <label class="field-label" for="cron-expr">Cron 表达式(5 段:分 时 日 月 周)</label>
    <input id="cron-expr" v-model="expr" class="input" style="font-family: var(--mono); font-size: 17px" spellcheck="false" />
  </div>

  <div v-if="setParts(expr)" class="field-grid">
    <label v-for="(f, i) in FIELDS" :key="f.key" class="fgrid-item">
      <span class="field-label" style="margin: 0">{{ f.label }} <span class="tip">({{ f.hint }})</span></span>
      <input
        :value="parts[i]"
        class="input fgrid-input"
        spellcheck="false"
        :aria-label="f.label + '字段'"
        @input="setField(i, $event.target.value)"
      />
    </label>
  </div>

  <template v-if="parsed.ok">
    <div class="panel" style="margin-top: 16px">
      <div class="field-label">含义</div>
      <p style="margin: 0 0 12px; font-size: 16.5px">{{ desc }}</p>
      <div class="field-label">接下来 5 次执行时间</div>
      <div class="run-list">
        <div v-for="(r, i) in parsed.runs" :key="i" class="run-row">
          <span class="run-no">#{{ i + 1 }}</span>
          <span class="run-time">{{ fmtRun(r) }}</span>
        </div>
      </div>
    </div>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-sm btn-primary" @click="copy('cron', expr)">
        {{ copiedKey === 'cron' ? '✓ 已复制' : '复制表达式' }}
      </button>
    </div>
  </template>
  <div v-else class="error-box" style="margin-top: 14px">✗ {{ parsed.error }}</div>

  <details class="panel" style="margin-top: 16px">
    <summary>📖 字段语法速查</summary>
    <p class="tip">
      每个字段支持:<code>*</code>(任意值)、<code>数字</code>、<code>a-b</code> 区间、<code>*/n</code>(每 n 个)、<code>a-b/n</code>(区间内每 n 个)、<code>a,b,c</code> 列表;
      带步进的单个数字(如 <code>5/15</code>)表示从 5 开始每 15。日与周同时受限时按标准 Cron 语义取「或」(命中任一即执行)。
      执行时间按本机时区推算,由过去两年内的日历逐分钟扫描得出,不依赖服务器。表达式会同步到地址栏,复制链接即可分享。
    </p>
  </details>
</template>

<style scoped>
.field-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
@media (max-width: 720px) {
  .field-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.fgrid-input {
  font-family: var(--mono);
  text-align: center;
}
.run-list {
  display: flex;
  flex-direction: column;
}
.run-row {
  display: flex;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
}
.run-row:last-child {
  border-bottom: none;
}
.run-no {
  color: var(--muted);
  font-family: var(--mono);
  width: 30px;
}
.run-time {
  font-family: var(--mono);
}
</style>
