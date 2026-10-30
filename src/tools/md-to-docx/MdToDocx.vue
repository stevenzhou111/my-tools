<script setup>
import { computed, ref } from 'vue'
import { mdToParagraphs } from '@/utils/mdDocx'
import { docxBlob } from '@/utils/docx'
import { downloadBlob } from '@/utils/image'

const md = ref(`# 三月工作周报

## 本周进展
- 完成 **登录模块** 重构,登录耗时下降 *40%*
- 修复了 \`token 过期\` 引起的偶发登出问题

## 下周计划
1. 联调支付网关
2. 输出接口文档

> 备注:数据详见共享盘《三月指标》。`)

const fileName = ref('weekly-report')

// 预览行数上限:几万字的 Markdown 全量渲染进 DOM 会卡
const PREVIEW_MAX = 300
const paragraphs = computed(() => mdToParagraphs(md.value))
const preview = computed(() => paragraphs.value.slice(0, PREVIEW_MAX))

function download() {
  const blob = docxBlob(paragraphs.value)
  downloadBlob(blob, (fileName.value.trim() || 'document') + '.docx')
}
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    把 Markdown 转成 Word(.docx):支持 1–6 级标题、<b>粗体</b> / <i>斜体</i> / <code>行内代码</code>、无序与有序列表、引用、代码块与分隔线;链接渲染为「文本 (URL)」。文件在浏览器本地打包生成,不上传。
  </p>

  <div class="field">
    <label class="field-label" for="mdd-file">文件名(不含扩展名)</label>
    <input id="mdd-file" v-model="fileName" class="input" style="width: 240px" spellcheck="false" />
  </div>

  <div class="field">
    <label class="field-label" for="mdd-md">Markdown 内容</label>
    <textarea id="mdd-md" v-model="md" class="textarea" style="min-height: 260px; font-family: var(--mono); font-size: 13px" spellcheck="false"></textarea>
  </div>

  <button class="btn btn-primary" :disabled="!paragraphs.length" @click="download">⬇️ 下载 .docx({{ paragraphs.length }} 段)</button>

  <div v-if="paragraphs.length" class="panel docx-preview mt-14">
    <p class="tip" style="margin-bottom: 10px">
      预览(前 {{ preview.length }} 段,样式近似 Word 排版):
    </p>
    <div class="doc-page">
      <template v-for="(p, i) in preview" :key="i">
        <p :class="{ heading: p.heading, quote: p.indent && p.runs?.[0]?.italic }" :style="{ fontSize: (p.sizeHalfPt ? p.sizeHalfPt / 2 : 11) + 'pt' }">
          <template v-if="p.runs">
            <span
              v-for="(r, j) in p.runs"
              :key="j"
              :class="{ bold: r.bold, italic: r.italic, code: r.code }"
            >{{ r.text }}</span>
          </template>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.doc-page {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 28px 32px;
  max-height: 420px;
  overflow: auto;
  line-height: 1.7;
}
.doc-page p {
  margin: 0 0 8px;
}
.doc-page .heading {
  font-weight: 700;
  margin-top: 6px;
}
.doc-page .quote {
  border-left: 3px solid var(--border);
  padding-left: 10px;
  color: var(--muted);
}
.bold { font-weight: 700; }
.italic { font-style: italic; }
.code {
  font-family: var(--mono);
  background: var(--bg-soft);
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.9em;
}
</style>
