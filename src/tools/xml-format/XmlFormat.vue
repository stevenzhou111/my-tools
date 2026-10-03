<script setup>
import { ref, watch } from 'vue'
import { compactXml, formatXml } from '@/utils/xmlFormat'
import { useCopy } from '@/utils/useCopy'

const input = ref('<note id="1">\n  <to>张三</to>\n  <message>你好,<b>工具箱</b>!</message>\n</note>')
const indent = ref(2)
const mode = ref('format') // format | compact
const { copiedKey, copy } = useCopy()

const result = ref({ text: '', error: '' })
watch([input, indent, mode], () => {
  if (mode.value === 'compact') {
    result.value = compactXml(input.value)
  } else {
    const n = Math.min(Math.max(Math.floor(Number(indent.value) || 2), 1), 8)
    result.value = formatXml(input.value, n)
  }
}, { immediate: true })

const SAMPLE = '<catalog><book id="bk101"><author>葛拉汉姆</author><price>44.95</price></book><book id="bk102"><author>knuth</author><price>66.5</price></book></catalog>'
</script>

<template>
  <div class="field">
    <label class="field-label">输入 XML</label>
    <textarea v-draft="'xml-input'" v-model="input" class="textarea" rows="8" spellcheck="false" placeholder="粘贴 XML…"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="format" />格式化(美化)</label>
    <label class="check"><input v-model="mode" type="radio" value="compact" />压缩(单行)</label>
    <label v-if="mode === 'format'" class="check">
      缩进
      <select v-model.number="indent" class="select" style="width: 70px">
        <option :value="2">2 空格</option>
        <option :value="4">4 空格</option>
      </select>
    </label>
    <button class="btn btn-sm" @click="input = SAMPLE">示例</button>
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label">结果({{ result.text.length }} 字符)</label>
    <pre class="output">{{ result.text }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copy('xml', result.text)">
        {{ copiedKey === 'xml' ? '✓ 已复制' : '复制结果' }}
      </button>
    </div>
  </template>
</template>