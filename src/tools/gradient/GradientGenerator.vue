<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const type = ref('linear')
const angle = ref(135)
const color1 = ref('#6366f1')
const color2 = ref('#ec4899')
const color3 = ref('#22d3ee')
const useMid = ref(false)
const pos1 = ref(0)
const pos2 = ref(100)
const pos3 = ref(50)
const { copiedKey, copy } = useCopy()

const PRESETS = [
  { name: '极光', colors: ['#6366f1', '#06b6d4'] },
  { name: '晚霞', colors: ['#f59e0b', '#ec4899'] },
  { name: '薄荷', colors: ['#10b981', '#84cc16'] },
  { name: '夜紫', colors: ['#8b5cf6', '#312e81'] },
  { name: '樱花', colors: ['#fbcfe8', '#c084fc'] },
  { name: '落日橙红', colors: ['#f97316', '#ef4444'] },
]

const css = computed(() => {
  const stops = [
    { color: color1.value, pos: pos1.value },
    ...(useMid.value ? [{ color: color3.value, pos: pos3.value }] : []),
    { color: color2.value, pos: pos2.value },
  ].sort((a, b) => a.pos - b.pos)
  const stopStr = stops.map((s) => `${s.color} ${s.pos}%`).join(', ')
  if (type.value === 'radial') {
    return `background: radial-gradient(circle at center, ${stopStr});`
  }
  return `background: linear-gradient(${angle.value}deg, ${stopStr});`
})

const previewStyle = computed(() => {
  const m = css.value.match(/background: (.+);/)
  return { background: m ? m[1] : 'none' }
})

function applyPreset(p) {
  color1.value = p.colors[0]
  color2.value = p.colors[1]
  useMid.value = false
}
</script>

<template>
  <div class="preview" :style="previewStyle"></div>

  <div class="panel" style="margin-top: 14px">
    <div class="row" style="margin-bottom: 14px">
      <label class="check"><input v-model="type" type="radio" value="linear" />线性渐变</label>
      <label class="check"><input v-model="type" type="radio" value="radial" />径向渐变</label>
      <label v-if="type === 'linear'" class="ctrl-inline">
        角度 <strong>{{ angle }}°</strong>
        <input v-model.number="angle" type="range" min="0" max="360" step="15" />
      </label>
    </div>

    <div class="row" style="margin-bottom: 14px">
      <label class="ctrl-inline">
        <input v-model="color1" type="color" class="input color-input" />
        <input v-model.number="pos1" type="number" min="0" max="100" class="input pos-input" />
      </label>
      <label class="ctrl-inline">
        <input v-model="color2" type="color" class="input color-input" />
        <input v-model.number="pos2" type="number" min="0" max="100" class="input pos-input" />
      </label>
      <template v-if="useMid">
        <label class="ctrl-inline">
          <input v-model="color3" type="color" class="input color-input" />
          <input v-model.number="pos3" type="number" min="0" max="100" class="input pos-input" />
        </label>
      </template>
      <button class="btn btn-sm" @click="useMid = !useMid">
        {{ useMid ? '移除中间色' : '+ 中间色' }}
      </button>
    </div>

    <div class="row">
      <button
        v-for="p in PRESETS"
        :key="p.name"
        class="btn btn-sm"
        @click="applyPreset(p)"
      >
        <span class="preset-dot" :style="{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }"></span>
        {{ p.name }}
      </button>
    </div>
  </div>

  <label class="field-label" style="margin-top: 14px">CSS 代码</label>
  <pre class="output">{{ css }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-primary" @click="copy('css', css)">
      {{ copiedKey === 'css' ? '✓ 已复制' : '复制 CSS' }}
    </button>
  </div>
</template>

<style scoped>
.preview {
  height: 180px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition: background 0.2s;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.color-input {
  width: 52px;
  height: 38px;
  padding: 2px;
}
.pos-input {
  width: 72px;
}
.preset-dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid var(--border);
  margin-right: 2px;
}
</style>
