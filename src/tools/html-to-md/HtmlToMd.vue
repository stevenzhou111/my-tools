<script setup>
import { computed, ref, watch } from 'vue'
import { htmlToMarkdown } from '@/utils/htmlMd'
import { useCopy } from '@/utils/useCopy'

const input = ref(`<article>
  <h1>会议纪要</h1>
  <p>时间:<b>周四 14:00</b>;参会人见 <a href="https://example.com/list">名单</a>。</p>
  <h2>结论</h2>
  <ul>
    <li>上线时间定档 <code>2026-10-15</code></li>
    <li>负责人:<strong>张三</strong></li>
  </ul>
  <pre><code>npm run deploy</code></pre>
</article>`)
const { copiedKey, copy } = useCopy()

const result = ref({ md: '', error: '' })
watch(
  input,
  (v) => {
    result.value = htmlToMarkdown(v)
  },
  { immediate: true },
)

const stats = computed(() => {
  const md = result.value.md
  return md ? `${md.length} 字符 · ${md.split('\n').length} 行` : ''
})

async function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) input.value = await f.text()
}
</script>

<template>
  <div class="grid-2">
    <div class="field">
      <label class="field-label">输入 HTML</label>
      <textarea v-draft="'html-md-input'" v-model="input" class="textarea" rows="12" spellcheck="false" placeholder="粘贴 HTML…"></textarea>
      <div class="row" style="margin-top: 10px">
        <label class="btn btn-sm">
          打开 .html 文件
          <input type="file" accept=".html,.htm" hidden @change="onFile" />
        </label>
        <span class="tip">支持标题/列表/链接/图片/加粗/代码块等常见标签</span>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Markdown{{ stats ? `(${stats})` : '' }}</label>
      <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>
      <template v-else-if="result.md">
        <pre class="output md-output">{{ result.md }}</pre>
        <div class="row" style="margin-top: 10px">
          <button class="btn btn-sm btn-primary" @click="copy('md', result.md)">
            {{ copiedKey === 'md' ? '✓ 已复制' : '复制 Markdown' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.md-output {
  max-height: 56vh;
  overflow: auto;
  white-space: pre-wrap;
}
</style>