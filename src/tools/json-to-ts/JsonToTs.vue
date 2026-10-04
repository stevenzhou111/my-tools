<script setup>
import { computed, ref, watch } from 'vue'
import { jsonToTs } from '@/utils/jsonToTs'
import { useCopy } from '@/utils/useCopy'

const input = ref(`{
  "name": "我的工具箱",
  "port": 8080,
  "tags": ["fast", "offline"],
  "server": {
    "host": "0.0.0.0",
    "cors": ["https://a.com", "https://b.com"]
  }
}`)
const rootName = ref('Root')
const { copiedKey, copy } = useCopy()

const result = ref({ code: '', error: '' })
watch([input, rootName], () => {
  const name = rootName.value.trim().replace(/[^A-Za-z0-9_$]/g, '') || 'Root'
  result.value = jsonToTs(input.value, name)
}, { immediate: true })
</script>

<template>
  <div class="grid-2">
    <div class="field">
      <label class="field-label">输入 JSON</label>
      <textarea v-draft="'json-to-ts-input'" v-model="input" class="textarea" rows="10" spellcheck="false"></textarea>
      <div class="row" style="margin-top: 10px">
        <span class="field-label" style="margin: 0">根类型名</span>
        <input v-model="rootName" class="input" style="width: 160px" spellcheck="false" aria-label="根类型名" />
      </div>
    </div>

    <div class="field">
      <label class="field-label">TypeScript 类型</label>
      <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>
      <template v-else-if="result.code">
        <pre class="output ts-output">{{ result.code }}</pre>
        <div class="row" style="margin-top: 10px">
          <button class="btn btn-sm btn-primary" @click="copy('ts', result.code)">
            {{ copiedKey === 'ts' ? '✓ 已复制' : '复制类型定义' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ts-output {
  max-height: 52vh;
  overflow: auto;
}
</style>