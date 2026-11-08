<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { boxShadowCss } from '@/utils/boxShadow'

/**
 * box-shadow 生成器:参数实时预览 + 一键复制 CSS。
 * 预览底色用棋盘格,深浅主题下都看得清。
 */

const x = ref(0)
const y = ref(8)
const blur = ref(24)
const spread = ref(-4)
const color = ref('#0f1117')
const opacity = ref(35)
const inset = ref(false)

const css = computed(() => boxShadowCss({
  x: x.value, y: y.value, blur: blur.value, spread: spread.value,
  color: color.value, opacity: opacity.value, inset: inset.value,
}))
const fullCss = computed(() => `box-shadow: ${css.value};`)
const previewStyle = computed(() => ({ boxShadow: css.value }))
</script>

<template>
  <div class="two-col">
    <div class="panel">
      <p class="field-label">参数</p>
      <div class="slider-row">
        <label class="ctrl grow"><span class="field-label">X 偏移 {{ x }}px</span>
          <input v-model.number="x" type="range" min="-50" max="50" />
        </label>
        <label class="ctrl grow"><span class="field-label">Y 偏移 {{ y }}px</span>
          <input v-model.number="y" type="range" min="-50" max="50" />
        </label>
        <label class="ctrl grow"><span class="field-label">模糊 {{ blur }}px</span>
          <input v-model.number="blur" type="range" min="0" max="100" />
        </label>
        <label class="ctrl grow"><span class="field-label">扩散 {{ spread }}px</span>
          <input v-model.number="spread" type="range" min="-50" max="50" />
        </label>
        <label class="ctrl grow"><span class="field-label">不透明度 {{ opacity }}%</span>
          <input v-model.number="opacity" type="range" min="0" max="100" />
        </label>
        <div class="row" style="gap: 14px">
          <label class="ctrl"><span class="field-label">颜色</span>
            <input v-model="color" type="color" class="color-input" aria-label="阴影颜色" />
          </label>
          <label class="check" style="align-self: flex-end"><input v-model="inset" type="checkbox" />内阴影(inset)</label>
        </div>
      </div>
    </div>

    <div class="panel preview-panel">
      <p class="field-label">实时预览</p>
      <div class="preview-stage">
        <div class="preview-card" :style="previewStyle"></div>
      </div>
    </div>
  </div>

  <label class="field-label" for="bs-out">CSS</label>
  <textarea id="bs-out" class="textarea" rows="2" readonly :value="fullCss"></textarea>
  <div class="row mt-10">
    <CopyButton class="btn btn-sm btn-primary" :text="fullCss" label="复制 CSS" />
  </div>
  <p class="tip mt-12">预览元素贴在棋盘底上,浅色阴影也看得见;多层阴影可复制后手动用逗号叠加。</p>
</template>

<style scoped>
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
.slider-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.color-input {
  width: 52px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
}
.preview-stage {
  min-height: 180px;
  display: grid;
  place-items: center;
  border-radius: var(--radius);
  background: repeating-conic-gradient(var(--bg-soft) 0% 25%, var(--card) 0% 50%) 0 0 / 20px 20px;
}
.preview-card {
  width: 140px;
  height: 90px;
  border-radius: 12px;
  background: var(--card);
  border: 1px solid var(--border);
}
</style>
