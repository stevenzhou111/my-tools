<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { levenshtein, similarity } from '@/utils/editDistance'

/**
 * 编辑距离与相似度:Levenshtein(插入/删除/替换各 1),按码点比较(emoji 安全)。
 * 用于两段文本/两个词的快速比对,纯本地计算。
 */

const a = ref('kitten')
const b = ref('sitting')

const dist = computed(() => levenshtein(a.value, b.value))
const percent = computed(() => similarity(a.value, b.value))
const verdict = computed(() => {
  const p = percent.value
  if (p >= 100) return '完全相同'
  if (p >= 80) return '非常接近(可能是拼写变体/笔误)'
  if (p >= 50) return '部分相似'
  if (p > 0) return '差异较大'
  return '完全不同'
})
</script>

<template>
  <div class="two-col">
    <div class="field">
      <label class="field-label" for="ed-a">文本 A</label>
      <textarea id="ed-a" v-model="a" class="textarea" rows="4" spellcheck="false"></textarea>
    </div>
    <div class="field">
      <label class="field-label" for="ed-b">文本 B</label>
      <textarea id="ed-b" v-model="b" class="textarea" rows="4" spellcheck="false"></textarea>
    </div>
  </div>

  <div class="panel mt-14">
    <div class="stats">
      <div class="stat">
        <span class="num">{{ dist }}</span>
        <span class="label">编辑距离</span>
      </div>
      <div class="stat">
        <span class="num">{{ percent }}%</span>
        <span class="label">相似度</span>
      </div>
    </div>
    <p class="m-0 tip">{{ verdict }} · 插入/删除/替换各计 1 步,emoji 按单个字符计。</p>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="`距离 ${dist},相似度 ${percent}%`" label="复制结果" />
    </div>
  </div>

  <p class="tip mt-12">
    典型用途:拼写纠错、题目判重、模糊匹配阈值设定。行级逐行对比请用「文本比对(diff)」。
  </p>
</template>

<style scoped>
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
.stats {
  display: flex;
  gap: 40px;
  margin-bottom: 10px;
}
.stat { display: flex; flex-direction: column; }
.num { font-size: 32px; font-weight: 800; color: var(--accent); }
.label { color: var(--muted); font-size: 13px; }
</style>
