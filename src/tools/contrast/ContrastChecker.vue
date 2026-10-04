<script setup>
import { computed, ref } from 'vue'
import { contrastRatio, hex, parseHex, wcagLevels } from '@/utils/contrast'
import { useUrlState } from '@/utils/urlState'
import { useCopy } from '@/utils/useCopy'

// 状态同步到地址栏,可分享指定配色方案
const fg = ref('#1c2130')
const bg = ref('#f4f5fb')
useUrlState([
  { key: 'fg', ref: fg, parse: (s) => (/^#?[0-9a-fA-F]{3,6}$/.test(s) ? normalize(s) : undefined) },
  { key: 'bg', ref: bg, parse: (s) => (/^#?[0-9a-fA-F]{3,6}$/.test(s) ? normalize(s) : undefined) },
])

function normalize(s) {
  const h = s.startsWith('#') ? s : '#' + s
  // 3 位展开为 6 位,便于对比展示
  if (/^#[0-9a-fA-F]{3}$/.test(h)) return '#' + [...h.slice(1)].map((c) => c + c).join('')
  return h
}

const { copiedKey, copy } = useCopy()

const PRESETS = [
  { name: '正文(本站)', fg: '#1c2130', bg: '#f4f5fb' },
  { name: '灰字白底', fg: '#777777', bg: '#ffffff' },
  { name: '主色按钮', fg: '#ffffff', bg: '#6366f1' },
  { name: '深色模式', fg: '#e5e7eb', bg: '#0f1117' },
  { name: '红字白底', fg: '#dc2626', bg: '#ffffff' },
]

const ratio = computed(() => contrastRatio(fg.value, bg.value))
const levels = computed(() => (ratio.value === null ? null : wcagLevels(ratio.value)))
const ratioText = computed(() => (ratio.value === null ? '—' : ratio.value.toFixed(2)))

const sampleStyle = computed(() => {
  const f = parseHex(fg.value)
  const b = parseHex(bg.value)
  if (!f || !b) return {}
  return { color: hex(...f), background: hex(...b) }
})

function onFgInput(e) {
  const v = e.target.value
  if (/^#[0-9a-fA-F]{6}$/.test(v)) fg.value = v
}
function onBgInput(e) {
  const v = e.target.value
  if (/^#[0-9a-fA-F]{6}$/.test(v)) bg.value = v
}

function swap() {
  ;[fg.value, bg.value] = [bg.value, fg.value]
}

const RESULTS = computed(() => {
  if (!levels.value) return []
  return [
    { label: '普通文字 AA(≥4.5)', ok: levels.value.aa },
    { label: '普通文字 AAA(≥7)', ok: levels.value.aaa },
    { label: '大文字 AA(≥3)', ok: levels.value.aaLarge },
    { label: '大文字 AAA(≥4.5)', ok: levels.value.aaaLarge },
  ]
})
</script>

<template>
  <div class="grid-2">
    <section class="panel">
      <h3>颜色设置</h3>
      <div class="field">
        <label class="field-label">前景色(文字)</label>
        <div class="row" style="gap: 8px">
          <input :value="fg" type="color" class="input color-input" aria-label="前景色选择器" @input="onFgInput" />
          <input v-model="fg" class="input" spellcheck="false" aria-label="前景色十六进制值" />
        </div>
      </div>
      <div class="field">
        <label class="field-label">背景色</label>
        <div class="row" style="gap: 8px">
          <input :value="bg" type="color" class="input color-input" aria-label="背景色选择器" @input="onBgInput" />
          <input v-model="bg" class="input" spellcheck="false" aria-label="背景色十六进制值" />
        </div>
      </div>
      <div class="row">
        <button class="btn btn-sm" @click="swap">⇄ 交换</button>
        <button v-for="p in PRESETS" :key="p.name" class="btn btn-sm" @click="fg = p.fg; bg = p.bg">{{ p.name }}</button>
      </div>
    </section>

    <section class="panel">
      <h3>结果</h3>
      <div v-if="ratio === null" class="error-box">✗ 请输入合法的 HEX 颜色(3 或 6 位)</div>
      <template v-else>
        <div class="score">
          <span class="score-num" :class="{ pass: levels.aa, warn: !levels.aa }">{{ ratioText }}</span>
          <span class="score-label">对比度(1 ~ 21)</span>
        </div>
        <div class="wcag-grid">
          <div v-for="r in RESULTS" :key="r.label" class="wcag-row">
            <span>{{ r.label }}</span>
            <span class="wcag-badge" :class="r.ok ? 'pass' : 'fail'">{{ r.ok ? '✓ 通过' : '✗ 未通过' }}</span>
          </div>
        </div>
        <div class="sample" :style="sampleStyle">
          <p style="font-size: 16px; margin: 4px 0">普通文字:文本与背景的搭配是否易读,肉眼确认一遍最稳妥。</p>
          <p style="font-size: 22px; font-weight: 700; margin: 4px 0">大文字 22px Bold 适用于 ≥18pt 标准。</p>
        </div>
        <div class="row" style="margin-top: 12px">
          <button class="btn btn-sm" @click="copy('cc', `${fg} on ${bg} = ${ratioText}:1`)">
            {{ copiedKey === 'cc' ? '✓ 已复制' : '复制结果' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.color-input {
  width: 52px;
  padding: 2px;
  cursor: pointer;
  flex-shrink: 0;
}
.score {
  text-align: center;
  margin-bottom: 14px;
}
.score-num {
  display: block;
  font-size: 44px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.score-num.pass { color: #16a34a; }
.score-num.warn { color: #dc2626; }
.score-label {
  font-size: 13px;
  color: var(--muted);
}
.wcag-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-bottom: 14px;
}
.wcag-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.wcag-badge.pass { color: #16a34a; font-weight: 600; }
.wcag-badge.fail { color: #dc2626; }
.sample {
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
}
</style>