<script setup>
import { computed, ref } from 'vue'
import { parseNumbers, describeStats } from '@/utils/stats'
import { useCopy } from '@/utils/useCopy'
import AppIcon from '@/components/AppIcon.vue'

const input = ref('')
const { copiedKey, copy } = useCopy()

const nums = computed(() => parseNumbers(input.value))
const stats = computed(() => describeStats(nums.value))

const BAD = computed(() => {
  // 被忽略的非法片段提示
  const tokens = String(input.value).split(/[\s,，、;；]+/).filter((t) => t.trim() !== '' && !Number.isFinite(Number(t)))
  return tokens.slice(0, 5)
})

const CARDS = [
  { key: 'count', label: '个数' },
  { key: 'sum', label: '总和' },
  { key: 'mean', label: '平均值' },
  { key: 'median', label: '中位数' },
]

const ROWS = [
  { key: 'min', label: '最小值' },
  { key: 'max', label: '最大值' },
  { key: 'range', label: '极差(最大-最小)' },
  { key: 'q1', label: '下四分位数 Q1' },
  { key: 'q3', label: '上四分位数 Q3' },
  { key: 'iqr', label: '四分位距 IQR' },
  { key: 'sampleVariance', label: '样本方差(n-1)' },
  { key: 'sampleStd', label: '样本标准差(n-1)' },
  { key: 'popVariance', label: '总体方差(n)' },
  { key: 'popStd', label: '总体标准差(n)' },
]
</script>

<template>
  <div class="panel mb-16">
    <div class="label-row">
      <label class="field-label" for="stats-in">粘贴一列数字(空格 / 逗号 / 换行 / 顿号均可)</label>
      <span class="row gap-8">
        <button class="btn btn-sm" @click="input = '2, 4, 4, 4, 5, 5, 7, 9'">示例</button>
        <button class="btn btn-sm" :disabled="!input" @click="input = ''">清空</button>
      </span>
    </div>
    <textarea
      id="stats-in"
      v-model="input"
      v-draft="'stats-calc-in'"
      class="textarea src-area"
      spellcheck="false"
      placeholder="如:85 92 78 90 88&#10;或 85, 92, 78, 90, 88"
    ></textarea>
    <p v-if="input && BAD.length" class="tip warn-tip m-0 mt-8">已忽略无法识别的片段:{{ BAD.join('、') }}</p>
  </div>

  <div v-if="stats" class="stat-grid">
    <div v-for="c in CARDS" :key="c.key" class="panel stat-card" :class="{ highlight: c.key === 'mean' }">
      <div class="stat-value">{{ stats[c.key] }}</div>
      <div class="stat-label">{{ c.label }}</div>
    </div>
  </div>

  <div v-if="stats" class="panel mt-16">
    <div class="detail-row" v-for="r in ROWS" :key="r.key">
      <span>{{ r.label }}</span>
      <span class="mono">{{ stats[r.key] ?? '—' }}</span>
    </div>
    <div class="row mt-10">
      <button class="btn btn-sm" @click="copy('stats', JSON.stringify(stats))">
        <AppIcon :name="copiedKey === 'stats' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'stats' ? '已复制' : '复制全部指标(JSON)' }}
      </button>
      <span class="tip">样本口径(n-1)用于由样本推断总体;数据本身就是全部研究对象时看总体口径(n)。</span>
    </div>
  </div>

  <div v-else class="panel">
    <p class="tip m-0">粘贴数字后这里会出现描述统计:均值、中位数、四分位数、方差与标准差等,与「正态分布计算」配套使用。</p>
  </div>
</template>

<style scoped>
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.src-area {
  min-height: 110px;
  font-family: var(--mono);
}
.warn-tip {
  color: var(--warning);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.stat-card {
  text-align: center;
  padding: 16px 12px;
}
.stat-card.highlight {
  border-color: var(--accent);
}
.stat-value {
  font-family: var(--mono);
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  word-break: break-all;
}
.stat-label {
  margin-top: 4px;
  font-size: 13.5px;
  color: var(--muted);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.detail-row .mono {
  font-family: var(--mono);
  font-weight: 600;
}
</style>
