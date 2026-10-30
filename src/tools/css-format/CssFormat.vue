<script setup>
import { computed, ref } from 'vue'
import { beautifyCss, minifyCss } from '@/utils/cssFormat'
import { useCopy } from '@/utils/useCopy'

const input = ref(`.card{display:flex;flex-direction:column;gap:12px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6)}
@media screen and (max-width:720px){.card{padding:12px}}
/* 示例:data URI 不会被压缩误伤 */
.icon{background:url(data:image/svg+xml;base64,PHN2Zy8+) no-repeat center}`)
const mode = ref('beautify')
const error = ref('')
const { copiedKey, copy } = useCopy()

const output = computed(() => {
  try {
    const r = mode.value === 'beautify' ? beautifyCss(input.value) : minifyCss(input.value)
    error.value = ''
    return r
  } catch (e) {
    error.value = e.message
    return ''
  }
})

const stats = computed(() => {
  const before = input.value.length
  const after = output.value.length
  return { before, after, saved: before > after ? Math.round((1 - after / before) * 100) : 0 }
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    CSS 美化与压缩:字符串与 <code>url()</code>(含 data URI)内的分号、花括号、空格按原子保留,支持 @media 等嵌套规则的缩进;美化保留注释,压缩移除注释。纯文本处理,不上传。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <label class="check"><input v-model="mode" type="radio" value="beautify" />美化</label>
    <label class="check"><input v-model="mode" type="radio" value="minify" />压缩</label>
  </div>

  <div class="field">
    <label class="field-label" for="css-in">输入 CSS</label>
    <textarea id="css-in" v-model="input" class="textarea" style="min-height: 180px; font-family: var(--mono); font-size: 13px" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box">✗ {{ error }}</div>

  <template v-else-if="output">
    <div class="field">
      <label class="field-label" for="css-out">
        输出({{ stats.before }} → {{ stats.after }} 字符<template v-if="mode === 'minify' && stats.saved > 0">,节省 {{ stats.saved }}%</template>)
      </label>
      <pre id="css-out" class="output css-out">{{ output }}</pre>
      <div class="row mt-8">
        <button class="btn btn-sm" @click="copy('css', output)">{{ copiedKey === 'css' ? '✓ 已复制' : '复制结果' }}</button>
        <button class="btn btn-sm" @click="input = output">⤴ 贴回输入</button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.css-out {
  max-height: 420px;
  user-select: all;
}
</style>
