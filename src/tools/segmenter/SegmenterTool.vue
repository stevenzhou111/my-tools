<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { segmentWords, segmentText, wordFrequency } from '@/utils/segmenter'

/**
 * 中文分词:基于 Intl.Segmenter(浏览器内置词典法),零依赖。
 * 输出分词结果与词频排行,全部本地计算。
 */

const input = ref('')
const sep = ref(' / ')
const minLen = ref(1)
const topN = ref(30)

const tokens = computed(() => segmentWords(input.value))
const segmented = computed(() => segmentText(input.value, { sep: sep.value }))
const freq = computed(() => wordFrequency(tokens.value, { minLen: minLen.value }))
const top = computed(() => freq.value.slice(0, Math.max(1, topN.value)))

const stats = computed(() => {
  const uniq = freq.value.length
  return `共 ${tokens.value.length} 词 · 去重 ${uniq}`
})
</script>

<template>
  <div class="field">
    <label class="field-label" for="seg-in">输入文本(中英混合均可)</label>
    <textarea
      id="seg-in"
      v-model="input"
      class="textarea"
      style="min-height: 130px"
      placeholder="粘贴文章、标题、商品名……例如:工具箱里的小工具越攒越多"
    ></textarea>
  </div>

  <template v-if="input.trim()">
    <div class="row mb-14 ctrl-row">
      <label class="ctrl">
        <span class="field-label">分隔符</span>
        <select v-model="sep" class="select">
          <option value=" / ">空格斜杠( / )</option>
          <option value=" ">空格</option>
          <option value=",">逗号</option>
          <option value="|">竖线</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="field-label">词频最短词长</span>
        <select v-model.number="minLen" class="select">
          <option :value="1">1(全部)</option>
          <option :value="2">2(过滤单字)</option>
          <option :value="3">3</option>
        </select>
      </label>
      <span class="tip">{{ stats }}</span>
    </div>

    <label class="field-label" for="seg-out">分词结果</label>
    <textarea id="seg-out" class="textarea" style="min-height: 110px" readonly :value="segmented"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="segmented" label="复制分词" />
    </div>

    <div class="panel mt-14">
      <div class="row mb-10">
        <span class="field-label m-0">词频排行(前 {{ top.length }})</span>
        <label class="ctrl-inline">
          <span class="tip">显示条数</span>
          <select v-model.number="topN" class="select" style="width: 80px">
            <option :value="10">10</option>
            <option :value="30">30</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>
      <table class="freq-table">
        <thead>
          <tr><th>#</th><th>词</th><th>次数</th></tr>
        </thead>
        <tbody>
          <tr v-for="(f, i) in top" :key="f.word">
            <td>{{ i + 1 }}</td>
            <td>{{ f.word }}</td>
            <td>{{ f.count }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="tip mt-12">
      分词由浏览器内置词典(Intl.Segmenter)完成,无网络请求;新词热词的切分粒度可能不完美,配合词频排行人工核对即可。
    </p>
  </template>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
.freq-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.freq-table th,
.freq-table td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
}
.freq-table th { color: var(--muted); font-weight: 500; }
</style>
