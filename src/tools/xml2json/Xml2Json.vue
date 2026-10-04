<script setup>
import { computed, ref, watch } from 'vue'
import { jsonToXml, xmlToJson } from '@/utils/xmlJson'
import { useCopy } from '@/utils/useCopy'
import { downloadBlob } from '@/utils/image'

const direction = ref('x2j')
const input = ref('')
const declaration = ref(true)
const error = ref('')
const output = ref('')

const { copiedKey, copy } = useCopy()

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<book id="1" category="novel">
  <title>三体</title>
  <author>刘慈欣</author>
  <tags>
    <tag>科幻</tag>
    <tag>小说</tag>
  </tags>
  <price>45.00</price>
</book>`

const SAMPLE_JSON = `{
  "book": {
    "@id": "1",
    "title": "三体",
    "tags": { "tag": ["科幻", "小说"] },
    "price": "45.00"
  }
}`

function convert() {
  error.value = ''
  output.value = ''
  const src = input.value.trim()
  if (!src) return
  if (direction.value === 'x2j') {
    const res = xmlToJson(src)
    if (res.ok) output.value = JSON.stringify(res.data, null, 2)
    else error.value = res.error
  } else {
    let data
    try {
      data = JSON.parse(src)
    } catch (e) {
      error.value = `JSON 不合法:${e.message}`
      return
    }
    const res = jsonToXml(data, { declaration: declaration.value })
    if (res.ok) output.value = res.data
    else error.value = res.error
  }
}

watch([input, direction, declaration], convert, { immediate: true })

function switchDirection(d) {
  if (direction.value === d) return
  direction.value = d
  // 输入输出互换,方便连续往返编辑
  if (output.value) {
    input.value = output.value
  } else {
    input.value = ''
    convert()
  }
}

function fillSample() {
  input.value = direction.value === 'x2j' ? SAMPLE_XML : SAMPLE_JSON
}

function download() {
  if (!output.value) return
  const blob = new Blob([output.value], { type: direction.value === 'x2j' ? 'application/json' : 'application/xml' })
  downloadBlob(blob, direction.value === 'x2j' ? 'converted.json' : 'converted.xml')
}

const placeholder = computed(() =>
  direction.value === 'x2j' ? '粘贴 XML 内容,如 <root><a>1</a></root>' : '粘贴 JSON,顶层必须是单键对象,如 {"root": {"a": 1}}',
)
</script>

<template>
  <div class="row" style="margin-bottom: 16px" role="tablist">
    <button
      class="btn"
      :class="{ 'btn-primary': direction === 'x2j' }"
      role="tab"
      :aria-selected="direction === 'x2j'"
      @click="switchDirection('x2j')"
    >
      XML → JSON
    </button>
    <button
      class="btn"
      :class="{ 'btn-primary': direction === 'j2x' }"
      role="tab"
      :aria-selected="direction === 'j2x'"
      @click="switchDirection('j2x')"
    >
      JSON → XML
    </button>
  </div>

  <div class="field">
    <div class="row" style="justify-content: space-between; margin-bottom: 7px">
      <label class="field-label" style="margin: 0" for="xml-in">{{ direction === 'x2j' ? 'XML 输入' : 'JSON 输入' }}</label>
      <label v-if="direction === 'j2x'" class="check">
        <input v-model="declaration" type="checkbox" />
        <span class="tip">包含 XML 声明(&lt;?xml …?&gt;)</span>
      </label>
    </div>
    <textarea id="xml-in" v-model="input" class="textarea" style="min-height: 180px" :placeholder="placeholder" spellcheck="false"></textarea>
    <div class="row" style="margin-top: 8px">
      <button class="btn btn-sm" @click="fillSample">填入示例</button>
      <button class="btn btn-sm" :disabled="!input" @click="input = ''">清空</button>
    </div>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 14px">✗ {{ error }}</div>

  <template v-if="output">
    <div class="field">
      <label class="field-label" for="xml-out">{{ direction === 'x2j' ? 'JSON 输出' : 'XML 输出' }}</label>
      <textarea id="xml-out" class="textarea" style="min-height: 220px" readonly :value="output"></textarea>
      <div class="row" style="margin-top: 10px">
        <button class="btn btn-sm btn-primary" @click="copy('xml2json', output)">
          {{ copiedKey === 'xml2json' ? '✓ 已复制' : '复制结果' }}
        </button>
        <button class="btn btn-sm" @click="download">⬇️ 下载文件</button>
        <button class="btn btn-sm" @click="switchDirection(direction === 'x2j' ? 'j2x' : 'x2j')">⇄ 反向转换</button>
      </div>
    </div>
  </template>

  <details class="panel">
    <summary>📖 转换约定</summary>
    <p class="tip">
      元素属性转成「@属性名」键,元素内文本转成「#text」键;只有文本的元素直接输出字符串,同名兄弟元素(如多个
      &lt;tag&gt;)合并为数组。反向转换时顶层必须是单键对象(键即根元素名),数组输出为同名重复元素。
      解析全部由浏览器完成,内容不会上传。
    </p>
  </details>
</template>
