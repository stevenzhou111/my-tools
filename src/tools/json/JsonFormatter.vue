<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { debounce } from '@/utils/format'

const input = ref('')
const output = ref('')
const error = ref('')
const indent = ref(2)
const { copiedKey, copy } = useCopy()

const SAMPLE = `{"name":"我的工具箱","version":"1.0.0","tools":["JSON","Base64","二维码"],"config":{"offline":true,"stars":5}}`

// 合法性校验防抖:大 JSON 粘贴时避免逐键全量 parse
const debouncedInput = ref('')
const syncInput = debounce((v) => (debouncedInput.value = v), 200)
watch(input, (v) => syncInput(v), { immediate: true })
onUnmounted(() => syncInput.cancel())

const status = computed(() => {
  const s = debouncedInput.value.trim()
  if (!s) return ''
  try {
    JSON.parse(s)
    return 'ok'
  } catch {
    return 'bad'
  }
})

function run(space) {
  error.value = ''
  output.value = ''
  if (!input.value.trim()) {
    error.value = '请先输入 JSON 内容'
    return
  }
  try {
    output.value = JSON.stringify(JSON.parse(input.value), null, space)
  } catch (e) {
    error.value = e.message
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <div class="field">
    <label class="field-label">
      输入 JSON
      <span v-if="status === 'ok'" class="badge ok">✓ 合法 JSON</span>
      <span v-else-if="status === 'bad'" class="badge bad">✗ 语法错误</span>
    </label>
    <textarea
      v-draft="'json'"
      v-model="input"
      class="textarea"
      rows="7"
      placeholder='在此粘贴 JSON,例如 {"name":"toolbox","ok":true}'
      spellcheck="false"
    ></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <button class="btn btn-primary" @click="run(indent)">格式化({{ indent }} 空格)</button>
    <select v-model="indent" class="select" style="width: auto">
      <option :value="2">2 空格</option>
      <option :value="4">4 空格</option>
      <option :value="8">8 空格</option>
    </select>
    <button class="btn" @click="run(null)">压缩</button>
    <button v-if="output" class="btn" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <button class="btn" @click="input = SAMPLE; run(indent)">粘贴示例</button>
    <button class="btn" @click="clearAll">清空</button>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <template v-if="output">
    <label class="field-label">结果</label>
    <pre class="output">{{ output }}</pre>
  </template>
</template>

<style scoped>
.badge {
  font-size: 13px;
  font-family: inherit;
}
.badge.ok { color: var(--accent); }
.badge.bad { color: var(--danger); }
</style>
