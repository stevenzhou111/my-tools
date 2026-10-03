<script setup>
import { computed, ref } from 'vue'
import cronstrue from 'cronstrue'
// 只注册中文 locale:i18n 入口会把全部 84 个 locale 打进包(约 160KB),这里按需引入
import 'cronstrue/locales/zh_CN'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const input = ref('0 9 * * 1-5')
useUrlState([{ key: 'q', ref: input, parse: shortString(120) }])
const { copiedKey, copy } = useCopy()

const SAMPLES = [
  { expr: '0 9 * * 1-5', desc: '工作日早 9 点' },
  { expr: '*/10 * * * *', desc: '每 10 分钟' },
  { expr: '0 0 1 * *', desc: '每月 1 号零点' },
  { expr: '30 3 * * 0', desc: '每周日凌晨 3:30' },
]

const result = computed(() => {
  const s = input.value.trim()
  if (!s) return { text: '', error: '' }
  try {
    return { text: cronstrue.toString(s, { locale: 'zh_CN' }), error: '' }
  } catch (e) {
    return { text: '', error: e.message }
  }
})
</script>

<template>
  <div class="field">
    <label class="field-label">Cron 表达式(5 段:分 时 日 月 周)</label>
    <input v-model="input" class="input" placeholder="如 0 9 * * 1-5" spellcheck="false" />
  </div>

  <div class="row" style="margin-bottom: 14px">
    <button v-for="s in SAMPLES" :key="s.expr" class="btn btn-sm" @click="input = s.expr">
      {{ s.desc }}
    </button>
  </div>

  <div v-if="result.error" class="error-box" style="margin-bottom: 12px">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label">中文解读</label>
    <pre class="output">{{ result.text }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', result.text)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制解读' }}
      </button>
    </div>
  </template>

  <div class="panel cheat" style="margin-top: 16px">
    <label class="field-label">字段速查</label>
    <div class="cheat-grid">
      <span>分</span><code>0-59</code>
      <span>时</span><code>0-23</code>
      <span>日</span><code>1-31</code>
      <span>月</span><code>1-12</code>
      <span>周</span><code>0-7(0 和 7 都是周日)</code>
      <span>任意</span><code>*</code>
      <span>枚举</span><code>1,15,30</code>
      <span>范围</span><code>9-17</code>
      <span>步长</span><code>*/10</code>
    </div>
  </div>
</template>

<style scoped>
.cheat-grid {
  display: grid;
  grid-template-columns: 70px 1fr 70px 1fr;
  gap: 6px 12px;
  font-size: 14px;
}
.cheat-grid span {
  color: var(--muted);
}
@media (max-width: 720px) {
  .cheat-grid {
    grid-template-columns: 70px 1fr;
  }
}
</style>
