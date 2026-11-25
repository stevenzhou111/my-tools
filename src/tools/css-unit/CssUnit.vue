<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import {
  CSS_UNITS,
  CSS_UNIT_IDS,
  PAPER_PRESETS,
  convertCss,
  formatCssNumber,
  paperRows,
} from '@/utils/cssUnit'
import { shortString, useUrlState } from '@/utils/urlState'

const value = ref('16')
const unit = ref('px')
const root = ref(16)
const parent = ref(16)
const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth)
const viewportHeight = ref(typeof window === 'undefined' ? 800 : window.innerHeight)
const paperId = ref('a4')

function positive(s) {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

useUrlState([
  { key: 'v', ref: value, parse: shortString(24) },
  { key: 'u', ref: unit, parse: (s) => (CSS_UNIT_IDS.includes(s) ? s : undefined) },
  { key: 'root', ref: root, parse: positive },
  { key: 'parent', ref: parent, parse: positive },
  { key: 'vw', ref: viewportWidth, parse: positive },
  { key: 'vh', ref: viewportHeight, parse: positive },
  { key: 'paper', ref: paperId, parse: (s) => (PAPER_PRESETS.some((p) => p.id === s) ? s : undefined) },
])

const options = computed(() => ({
  root: Number(root.value),
  parent: Number(parent.value),
  viewportWidth: Number(viewportWidth.value),
  viewportHeight: Number(viewportHeight.value),
}))

const conv = computed(() => convertCss(String(value.value).trim(), unit.value, options.value))

const groups = computed(() => {
  const map = new Map()
  for (const row of conv.value.rows) {
    if (!map.has(row.group)) map.set(row.group, [])
    map.get(row.group).push({ ...row, display: formatCssNumber(row.value) })
  }
  return [...map.entries()].map(([name, rows]) => ({ name, rows }))
})

const paper = computed(() => PAPER_PRESETS.find((p) => p.id === paperId.value) || PAPER_PRESETS[0])
const paperTable = computed(() =>
  paperRows(paper.value.w, paper.value.h).map((r) => ({
    ...r,
    display: `${r.width} × ${r.height} px`,
    mp: `${r.megapixels.toFixed(1)} MP`,
  })),
)

const unitNote = computed(() => CSS_UNITS.find((u) => u.id === unit.value)?.note || '')

function useCurrentViewport() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

const QUICK = [
  { label: '16px', v: '16', u: 'px' },
  { label: '1rem', v: '1', u: 'rem' },
  { label: '12pt(小四)', v: '12', u: 'pt' },
  { label: '100vw', v: '100', u: 'vw' },
  { label: 'A4 宽 210mm', v: '210', u: 'mm' },
]
</script>

<template>
  <p class="tip mb-14">
    按 CSS 规范基准换算(1in = 96px、1pt = 4/3px),一次给出全部常用单位。
    相对单位取决于下面的上下文:rem 用根字号、em 与 % 用父字号、vw / vh 用视口尺寸,都可手动改。
  </p>

  <div class="panel">
    <div class="row row-wrap">
      <div class="field grow">
        <label class="field-label" for="cu-value">数值</label>
        <input
          id="cu-value"
          v-model="value"
          class="input mono"
          inputmode="decimal"
          spellcheck="false"
          placeholder="如 16"
        />
      </div>
      <div class="field unit-field">
        <label class="field-label" for="cu-unit">单位</label>
        <select id="cu-unit" v-model="unit" class="select">
          <option v-for="u in CSS_UNITS" :key="u.id" :value="u.id">{{ u.label }}</option>
        </select>
      </div>
    </div>
    <p v-if="unitNote" class="tip mt-6">{{ unitNote }}</p>

    <div class="row mt-8 row-wrap">
      <button v-for="q in QUICK" :key="q.label" class="btn btn-sm" @click="value = q.v; unit = q.u">
        {{ q.label }}
      </button>
    </div>

    <div class="grid-2 mt-14">
      <div class="field">
        <label class="field-label" for="cu-root">根字号(rem)</label>
        <input id="cu-root" v-model.number="root" class="input" type="number" min="1" step="1" />
      </div>
      <div class="field">
        <label class="field-label" for="cu-parent">父字号(em / %)</label>
        <input id="cu-parent" v-model.number="parent" class="input" type="number" min="1" step="1" />
      </div>
      <div class="field">
        <label class="field-label" for="cu-vw">视口宽度(vw / vmin / vmax)</label>
        <input id="cu-vw" v-model.number="viewportWidth" class="input" type="number" min="1" step="1" />
      </div>
      <div class="field">
        <label class="field-label" for="cu-vh">视口高度(vh / vmin / vmax)</label>
        <input id="cu-vh" v-model.number="viewportHeight" class="input" type="number" min="1" step="1" />
      </div>
    </div>
    <button class="btn btn-sm mt-8" @click="useCurrentViewport">取当前浏览器视口尺寸</button>
  </div>

  <div v-if="conv.error" class="error-box mt-14">✗ {{ conv.error }}</div>

  <template v-else>
    <div v-for="g in groups" :key="g.name" class="panel mt-14">
      <div class="group-head">{{ g.name }}</div>
      <div class="unit-row" v-for="row in g.rows" :key="row.id">
        <span class="u-label mono">{{ row.label }}</span>
        <span class="u-note">{{ row.note }}</span>
        <span class="u-value mono" :class="{ hit: row.id === unit }">{{ row.display }}</span>
        <CopyButton class="btn btn-sm" :text="row.display + row.label" label="复制" copied-label="✓" />
      </div>
    </div>
  </template>

  <div class="panel mt-14">
    <div class="row row-wrap">
      <div class="group-head grow">纸张尺寸 → 像素(@DPI)</div>
      <select v-model="paperId" class="select paper-select">
        <option v-for="p in PAPER_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>
    <div class="unit-row" v-for="r in paperTable" :key="r.dpi">
      <span class="u-label mono">{{ r.dpi }} DPI</span>
      <span class="u-note">{{ r.mp }}</span>
      <span class="u-value mono">{{ r.display }}</span>
      <CopyButton class="btn btn-sm" :text="`${r.width} × ${r.height}`" label="复制" copied-label="✓" />
    </div>
    <p class="tip mt-10">
      像素 = 毫米 ÷ 25.4 × DPI。打印按 300 DPI、网页按 96 DPI 是常见口径;
      DPI 越高单位尺寸里的像素越多,画面越细腻、文件也越大。
    </p>
  </div>

  <p class="tip mt-12">参数会同步到地址栏,复制链接即可分享当前换算条件。</p>
</template>

<style scoped>
.mono {
  font-family: var(--mono);
}
.grow {
  flex: 1 1 180px;
}
.row-wrap {
  flex-wrap: wrap;
}
.unit-field {
  flex: 0 0 120px;
}
.paper-select {
  width: auto;
  min-width: 200px;
}
.group-head {
  font-weight: 600;
  margin-bottom: 8px;
}
.unit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px solid var(--border);
}
.unit-row:first-of-type {
  border-top: none;
}
.u-label {
  flex: 0 0 54px;
  font-weight: 600;
}
.u-note {
  flex: 1 1 auto;
  color: var(--muted);
  font-size: 12.5px;
}
.u-value {
  flex: 0 0 auto;
  font-size: 15px;
  text-align: right;
}
.u-value.hit {
  color: var(--accent);
  font-weight: 700;
}
@media (max-width: 560px) {
  .u-note {
    display: none;
  }
  .unit-row {
    gap: 8px;
  }
}
</style>