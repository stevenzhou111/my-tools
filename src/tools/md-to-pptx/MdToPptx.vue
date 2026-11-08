<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { markdownToSlides } from '@/utils/mdToPptx'

/**
 * Markdown → PPT 演示文稿:=== 分页,标题当页题,列表转圆点,代码块转等宽文本;
 * pptxgenjs 本机生成 .pptx,内容不上传。
 */

const SAMPLE = `# 项目周报

- 本周完成:三件事
- 风险:一项

## 数据

1. 转化率 +12%
2. 客诉 -8%

===

# 下周计划

- 上线灰度
- 复盘会
`

const md = ref('')
const busy = ref(false)
const error = ref('')
const done = ref(false)

const slides = computed(() => {
  try {
    return markdownToSlides(md.value)
  } catch {
    return []
  }
})

async function generate() {
  if (!slides.value.length || busy.value) return
  error.value = ''
  busy.value = true
  try {
    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    pptx.defineLayout({ name: 'W16x9', width: 13.333, height: 7.5 })
    pptx.layout = 'W16x9'
    pptx.title = 'Markdown 演示文稿'
    for (const sl of slides.value) {
      const s = pptx.addSlide()
      s.addText(sl.title, { x: 0.5, y: 0.4, w: 12.3, fontSize: 28, bold: true, color: '1F2937' })
      if (sl.items.length) {
        s.addText(
          sl.items.map((i) => ({ text: i.text, options: { bullet: i.bullet } })),
          { x: 0.7, y: 1.6, w: 11.9, h: 5.4, fontSize: 16, color: '374151' },
        )
      }
    }
    await pptx.writeFile({ fileName: 'slides.pptx' })
    done.value = true
  } catch (e) {
    error.value = '生成失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="field">
    <div class="row">
      <label class="field-label" for="md-in">Markdown 源码(=== 独占一行强制分页)</label>
      <button class="btn btn-sm" @click="md = SAMPLE">填入示例</button>
    </div>
    <textarea id="md-in" v-model="md" class="textarea" style="min-height: 200px" spellcheck="false" :placeholder="'# 标题\n- 要点一\n- 要点二\n\n===\n\n# 第二页'"></textarea>
  </div>

  <div class="row mb-14">
    <button class="btn btn-primary" :disabled="!slides.length || busy" @click="generate">
      {{ busy ? '生成中…' : `生成 .pptx(${slides.length} 页)` }}
    </button>
    <span v-if="slides.length" class="tip">每页:首个 # 标题作页题,列表转圆点,代码块转等宽文本</span>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>
  <div v-if="done" class="panel mb-14">
    <p class="m-0 tip">✓ 已生成并开始下载 slides.pptx;图片/表格暂不支持,建议截图后手动补页。</p>
  </div>

  <details v-if="slides.length" class="about panel">
    <summary><CopyButton :text="md" label="复制 Markdown" @click.stop /></summary>
    <p>预览会直接开始下载;若浏览器拦截下载,允许本站下载后重试。</p>
  </details>
</template>
