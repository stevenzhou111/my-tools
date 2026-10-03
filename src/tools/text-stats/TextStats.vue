<script setup>
import { computed, ref } from 'vue'

const text = ref(`在这里粘贴或输入文本,下方会实时显示统计数据。

支持中英文混排统计,例如:Hello 世界!`)

const stats = computed(() => {
  const s = text.value
  const codePoints = [...s].length
  const noSpaces = [...s.replace(/\s/g, '')].length
  const zhChars = (s.match(/[\u4e00-\u9fa5]/g) || []).length
  const enWords = (s.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).length
  const lines = s ? s.split('\n').length : 0
  const paragraphs = s.trim() ? s.trim().split(/\n\s*\n/).filter(Boolean).length : 0
  const bytes = new TextEncoder().encode(s).length
  const totalWords = zhChars + enWords
  const minutes = totalWords / 300
  const reading = !totalWords ? '0 分钟' : minutes < 1 ? '约 1 分钟' : `约 ${Math.ceil(minutes)} 分钟`
  return [
    { label: '字符数', value: codePoints, tip: '含空格换行' },
    { label: '字符数(不含空白)', value: noSpaces, tip: '' },
    { label: '中文汉字', value: zhChars, tip: '' },
    { label: '英文单词 / 数字', value: enWords, tip: '' },
    { label: '总词数', value: totalWords, tip: '汉字 + 英文单词' },
    { label: '行数', value: lines, tip: '' },
    { label: '段落数', value: paragraphs, tip: '按空行分段' },
    { label: 'UTF-8 字节数', value: bytes, tip: '' },
    { label: '预计阅读时长', value: reading, tip: '按 300 字 / 分钟' },
  ]
})
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="text" class="textarea" rows="10" spellcheck="false"></textarea>
  </div>

  <div class="stat-grid">
    <div v-for="s in stats" :key="s.label" class="panel stat-card">
      <div class="stat-value">{{ s.value }}</div>
      <div class="stat-label">{{ s.label }}</div>
      <div v-if="s.tip" class="stat-tip">{{ s.tip }}</div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  padding: 14px;
  text-align: center;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 14px;
  margin-top: 2px;
}
.stat-tip {
  font-size: 13px;
  color: var(--muted);
}
</style>
