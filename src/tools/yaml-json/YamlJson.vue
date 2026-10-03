<script setup>
import { computed, ref } from 'vue'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { useCopy } from '@/utils/useCopy'

const mode = ref('yaml2json')
const input = ref(`# 服务配置
server:
  host: 0.0.0.0
  port: 8080
features:
  - auth
  - upload
debug: false`)
const { copiedKey, copy } = useCopy()

const result = computed(() => {
  const s = input.value.trim()
  if (!s) return { text: '', error: '' }
  try {
    if (mode.value === 'yaml2json') {
      const data = yamlLoad(s)
      return { text: JSON.stringify(data, null, 2), error: '' }
    }
    const data = JSON.parse(s)
    return { text: yamlDump(data, { indent: 2, lineWidth: -1 }), error: '' }
  } catch (e) {
    return { text: '', error: e.message.split('\n')[0] }
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="yaml2json" />YAML → JSON</label>
    <label class="check"><input v-model="mode" type="radio" value="json2yaml" />JSON → YAML</label>
  </div>

  <div v-if="result.error" class="error-box" style="margin-bottom: 12px">✗ {{ result.error }}</div>

  <div class="field">
    <label class="field-label">输入</label>
    <textarea v-model="input" class="textarea" rows="9" spellcheck="false"></textarea>
  </div>

  <label class="field-label">输出</label>
  <pre class="output">{{ result.text }}</pre>
  <div class="row" style="margin-top: 10px">
    <button v-if="result.text" class="btn btn-sm" @click="copy('out', result.text)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <button v-if="result.text" class="btn btn-sm" @click="input = result.text">将输出放入输入框</button>
  </div>

  <p class="tip" style="margin-top: 10px">支持多文档 YAML(--- 分隔,返回数组)、锚点引用与完整 JSON Schema 类型。</p>
</template>
