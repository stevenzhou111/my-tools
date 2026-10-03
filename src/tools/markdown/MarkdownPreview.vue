<script setup>
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCopy } from '@/utils/useCopy'

const SAMPLE = `# 你好,工具箱 👋

这是一段 **Markdown** 示例,支持常用语法:

- 列表、**加粗**、*斜体*、\`行内代码\`
- [链接](https://example.com)
- 任务列表: [x] 已完成 / [ ] 待办

> 引用块:所有渲染都在浏览器本地完成。

\`\`\`js
console.log('hello toolbox')
\`\`\`

| 工具 | 状态 |
| ---- | ---- |
| JSON | ✅ |
| 二维码 | ✅ |
`

const input = ref(SAMPLE)
const { copiedKey, copy } = useCopy()

const html = computed(() =>
  DOMPurify.sanitize(marked.parse(input.value, { breaks: true, async: false })),
)
</script>

<template>
  <div class="grid-2 md-grid">
    <div>
      <label class="field-label">Markdown 源码</label>
      <textarea v-draft="'markdown'" v-model="input" class="textarea md-input" spellcheck="false"></textarea>
    </div>
    <div>
      <div class="snippet-head">
        <label class="field-label">预览</label>
        <button class="btn btn-sm" @click="copy('html', html)">
          {{ copiedKey === 'html' ? '✓ HTML 已复制' : '复制 HTML' }}
        </button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html — 内容已经过 DOMPurify 消毒 -->
      <div class="panel md-preview" v-html="html"></div>
    </div>
  </div>
</template>

<style scoped>
.md-grid {
  align-items: start;
}
.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.md-input {
  min-height: 480px;
}
.md-preview {
  min-height: 480px;
  max-height: 640px;
  overflow: auto;
}
.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3),
.md-preview :deep(h4) {
  margin: 14px 0 8px;
  line-height: 1.3;
}
.md-preview :deep(h1) { font-size: 24px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
.md-preview :deep(h2) { font-size: 20px; }
.md-preview :deep(p) { margin: 8px 0; }
.md-preview :deep(a) { color: var(--accent); }
.md-preview :deep(code) {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 13.5px;
}
.md-preview :deep(pre) {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
}
.md-preview :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}
.md-preview :deep(blockquote) {
  margin: 10px 0;
  padding: 4px 14px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  border-radius: 0 6px 6px 0;
  color: var(--muted);
}
.md-preview :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 12px;
}
.md-preview :deep(th) { background: var(--bg-soft); }
.md-preview :deep(img) { max-width: 100%; }
.md-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 14px 0;
}
.md-preview :deep(ul), .md-preview :deep(ol) { padding-left: 24px; margin: 8px 0; }
.md-preview :deep(li) { margin: 3px 0; }
</style>
