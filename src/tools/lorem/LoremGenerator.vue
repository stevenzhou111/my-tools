<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { ref, watch } from 'vue'
import { lorem } from '@/utils/lorem'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const unit = ref('paragraphs')
const count = ref(3)
const classicStart = ref(true)
const html = ref(false)
const output = ref('')

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isInteger(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'u', ref: unit, parse: (s) => (s === 'paragraphs' || s === 'sentences' ? s : undefined) },
  { key: 'n', ref: count, parse: num(1, 50) },
  { key: 'c', ref: classicStart, parse: (s) => (s === '1' ? true : s === '0' ? false : undefined) },
  { key: 'h', ref: html, parse: (s) => (s === '1' ? true : s === '0' ? false : undefined) },
])

const { copiedKey, copy } = useCopy()

function generate() {
  output.value = lorem({
    unit: unit.value,
    count: count.value,
    classicStart: classicStart.value,
    html: html.value && unit.value === 'paragraphs',
  })
}

watch([unit, count, classicStart, html], generate, { immediate: true })
</script>

<template>
  <div class="panel mb-16">
    <div class="row">
      <div class="row gap-8" role="radiogroup" aria-label="假文单位">
        <button
          class="btn btn-sm"
          :class="{ 'btn-primary': unit === 'paragraphs' }"
          role="radio"
          :aria-checked="unit === 'paragraphs'"
          @click="unit = 'paragraphs'"
        >
          按段落
        </button>
        <button
          class="btn btn-sm"
          :class="{ 'btn-primary': unit === 'sentences' }"
          role="radio"
          :aria-checked="unit === 'sentences'"
          @click="unit = 'sentences'"
        >
          按句子
        </button>
      </div>
      <label class="ctrl">
        <span class="field-label m-0">{{ unit === 'paragraphs' ? '段落数' : '句子数' }}(1–50)</span>
        <input v-model.number="count" type="number" min="1" max="50" class="input count-input" />
      </label>
    </div>
    <div class="row mt-10">
      <label class="check"><input v-model="classicStart" type="checkbox" />以经典 “Lorem ipsum dolor sit amet” 开头</label>
      <label v-if="unit === 'paragraphs'" class="check"><input v-model="html" type="checkbox" />用 &lt;p&gt; 标签包裹</label>
    </div>
    <div class="row mt-12">
      <button class="btn btn-primary" @click="generate"><AppIcon name="dice-5" :size="15" /> 换一批</button>
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="lorem-out">假文(每次生成随机)</label>
    <textarea id="lorem-out" class="textarea" style="min-height: 240px" readonly :value="output"></textarea>
    <div class="row mt-10">
      <button class="btn btn-sm btn-primary" @click="copy('lorem', output)">
        {{ copiedKey === 'lorem' ? '✓ 已复制' : '复制全部' }}
      </button>
    </div>
  </div>

  <p class="tip">
    Lorem Ipsum 是印刷与排版行业沿用了五百多年的占位假文,用来在真实文案就绪前预览版式。
    词库与拼装规则内置在本页,生成完全离线;参数会同步到地址栏,复制链接即可分享当前设置。
  </p>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.count-input {
  width: 110px;
}
</style>
