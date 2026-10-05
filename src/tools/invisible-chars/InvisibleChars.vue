<script setup>
import { computed, ref } from 'vue'
import { convertLineEndings, countZeroWidth, detectLineEndings, revealInvisible, stripZeroWidth } from '@/utils/whitespace'
import { useCopy } from '@/utils/useCopy'

const text = ref(`从网页或 Windows 记事本复制出来的文本,经常带着看不见的字符:\u200b零宽空格、\uFEFF BOM、行尾的 \r\n。它们会让字符串比对失败、正则匹配不上、代码复制报错。用这里的一键清理解决。`)

const showInvisible = ref(false)
const { copiedKey, copy } = useCopy()

const endings = computed(() => detectLineEndings(text.value))
const zeroWidth = computed(() => countZeroWidth(text.value))
const zeroWidthTotal = computed(() => zeroWidth.value.reduce((s, z) => s + z.count, 0))
const revealed = computed(() => (showInvisible.value ? revealInvisible(text.value) : ''))

function applyConvert(to) {
  text.value = convertLineEndings(text.value, to)
}
function applyStrip() {
  text.value = stripZeroWidth(text.value)
}
</script>

<template>
  <div class="field">
    <label class="field-label" for="iw-in">文本</label>
    <textarea id="iw-in" v-model="text" v-draft="'invisible-input'" class="textarea" style="min-height: 170px" spellcheck="false"></textarea>
  </div>

  <div class="panel" style="margin-bottom: 16px">
    <span class="field-label">检测</span>
    <div class="row" style="margin-bottom: 10px">
      <span class="chip">CRLF(\r\n)× {{ endings.crlf }}</span>
      <span class="chip">LF(\n)× {{ endings.lf }}</span>
      <span v-if="endings.dominant" class="chip strong">当前主导:{{ endings.dominant === 'crlf' ? 'Windows CRLF' : 'Unix LF' }}</span>
      <span v-if="zeroWidthTotal" class="chip danger">零宽字符 × {{ zeroWidthTotal }}({{ zeroWidth.map((z) => z.name).join('、') }})</span>
      <span v-if="!endings.dominant && !zeroWidthTotal" class="chip">没有发现换行符与零宽字符</span>
    </div>
    <div class="row">
      <button class="btn btn-sm" :disabled="!endings.dominant || endings.dominant === 'lf'" @click="applyConvert('lf')">统一为 LF(Unix / Mac)</button>
      <button class="btn btn-sm" :disabled="!endings.dominant || endings.dominant === 'crlf'" @click="applyConvert('crlf')">统一为 CRLF(Windows)</button>
      <button class="btn btn-sm" :disabled="!zeroWidthTotal" @click="applyStrip">🧹 清除零宽字符</button>
      <label class="check"><input v-model="showInvisible" type="checkbox" />显示不可见字符</label>
    </div>
  </div>

  <div v-if="showInvisible" class="field">
    <label class="field-label" for="iw-view">
      可视化结果
      <span class="tip">空格→· ·Tab→⇥ ·换行→␊ ·NBSP→⍽ ·全角空格→␠ ·零宽→⟦zw⟧</span>
    </label>
    <pre id="iw-view" class="output reveal-out">{{ revealed }}</pre>
  </div>

  <div class="row">
    <button class="btn btn-sm btn-primary" @click="copy('iw', text)">{{ copiedKey === 'iw' ? '✓ 已复制' : '复制当前文本' }}</button>
    <span class="tip">清理操作直接替换上方文本,可继续编辑;复制网页文本后先来这里清一遍零宽字符是排除诡异 bug 的好习惯。</span>
  </div>
</template>

<style scoped>
.chip {
  font-size: 14px;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--bg-soft);
  color: var(--muted);
  font-family: var(--mono);
}
.chip.strong {
  background: var(--accent-soft);
  color: var(--accent);
}
.chip.danger {
  background: var(--danger-soft);
  color: var(--danger);
}
.reveal-out {
  font-size: 14px;
  letter-spacing: 0.5px;
}
</style>
