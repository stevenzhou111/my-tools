<script setup>
import { computed, ref } from 'vue'
import { buildScale, hexToHsl, readableOn, toCssVars, toTailwind } from '@/utils/colorScale'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const color = ref('#6366f1')
const varName = ref('brand')

useUrlState([
  { key: 'c', ref: color, parse: (s) => (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) ? s : undefined) },
  { key: 'n', ref: varName, parse: (s) => (/^[a-zA-Z][a-zA-Z0-9-]{0,19}$/.test(s) ? s : undefined) },
])

const { copiedKey, copy } = useCopy()

const scale = computed(() => buildScale(color.value))
const baseHsl = computed(() => hexToHsl(color.value))

function randomColor() {
  const h = Math.floor(Math.random() * 360)
  const s = 55 + Math.floor(Math.random() * 40)
  const l = 45 + Math.floor(Math.random() * 20)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(255 * v)
      .toString(16)
      .padStart(2, '0')
  }
  color.value = `#${f(0)}${f(8)}${f(4)}`
}
</script>

<template>
  <div class="panel" style="margin-bottom: 16px">
    <div class="row">
      <label class="ctrl">
        <span class="field-label" style="margin: 0">主色</span>
        <input v-model="color" type="color" class="color-input" aria-label="选择主色" />
      </label>
      <label class="ctrl">
        <span class="field-label" style="margin: 0">HEX 值</span>
        <input
          v-model="color"
          class="input hex-input"
          spellcheck="false"
          aria-label="主色 HEX 值"
        />
      </label>
      <label class="ctrl">
        <span class="field-label" style="margin: 0">变量名(导出用)</span>
        <input v-model="varName" class="input name-input" spellcheck="false" aria-label="导出变量名" />
      </label>
      <button class="btn" style="align-self: flex-end" @click="randomColor">🎲 随机主色</button>
    </div>
    <p v-if="!scale" class="error-box" style="margin-top: 12px">✗ HEX 格式不合法,请输入 #rgb 或 #rrggbb</p>
    <p v-else-if="baseHsl" class="tip" style="margin-top: 10px">
      当前主色 HSL:{{ baseHsl.h }}, {{ baseHsl.s }}%, {{ baseHsl.l }}%(500 档明度会钳制到 30%–62% 以保证两端余量)
    </p>
  </div>

  <template v-if="scale">
    <div class="scale-list">
      <button
        v-for="c in scale"
        :key="c.step"
        class="swatch"
        :style="{ background: c.hex, color: readableOn(c.hex) }"
        :title="`点击复制 ${c.hex}`"
        @click="copy('sw-' + c.step, c.hex)"
      >
        <span class="sw-step">{{ c.step }}<template v-if="c.isBase"> · 基准</template></span>
        <span class="sw-hex">{{ c.hex.toUpperCase() }}</span>
        <span v-if="copiedKey === 'sw-' + c.step" class="sw-copied">已复制</span>
      </button>
    </div>

    <div class="panel" style="margin-top: 16px">
      <span class="field-label">导出</span>
      <div class="row" style="margin-bottom: 10px">
        <button class="btn btn-sm" @click="copy('tailwind', toTailwind(scale, varName))">
          {{ copiedKey === 'tailwind' ? '✓ 已复制' : `复制 Tailwind 配置(${varName})` }}
        </button>
        <button class="btn btn-sm" @click="copy('cssvars', toCssVars(scale, varName))">
          {{ copiedKey === 'cssvars' ? '✓ 已复制' : `复制 CSS 变量(--${varName}-*)` }}
        </button>
      </div>
      <pre class="output" style="max-height: 200px">{{ toTailwind(scale, varName) }}</pre>
    </div>

    <p class="tip" style="margin-top: 12px">
      以输入色为 500 档基准,按固定明度锚点向两端推亮/推暗,色相保持不变;
      点击任意色块复制 HEX。参数会同步到地址栏,点标题栏「分享状态」或直接复制链接即可分享当前色阶。
    </p>
  </template>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.color-input {
  width: 64px;
  height: 44px;
  padding: 2px;
}
.hex-input {
  width: 130px;
  font-family: var(--mono);
}
.name-input {
  width: 130px;
}
.scale-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.swatch {
  position: relative;
  flex: 1 1 96px;
  min-width: 96px;
  max-width: 150px;
  min-height: 96px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px;
  font-family: var(--mono);
  transition: transform 0.12s, box-shadow 0.15s;
}
.swatch:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.swatch[aria-checked='true'] {
  outline: 2px solid var(--accent);
}
.sw-step {
  font-size: 14px;
  font-weight: 700;
}
.sw-hex {
  font-size: 12.5px;
  opacity: 0.85;
}
.sw-copied {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11.5px;
  font-family: inherit;
}
</style>
