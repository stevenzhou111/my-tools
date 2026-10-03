<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`Hello World, hello toolbox!
Hello Vue 3, hello Vite!`)

const find = ref('hello')
const replace = ref('你好')
const useRegex = ref(false)
const ignoreCase = ref(true)
const { copiedKey, copy } = useCopy()

const parsed = computed(() => {
  const f = find.value
  if (!f) return null
  if (!useRegex.value) return { source: f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags: ignoreCase.value ? 'gi' : 'g', raw: f }
  try {
    new RegExp(f, 'g')
    return { source: f, flags: (ignoreCase.value ? 'i' : '') + 'g', raw: f }
  } catch (e) {
    return { error: e.message }
  }
})

const count = computed(() => {
  const p = parsed.value
  if (!p || p.error || !input.value) return 0
  const re = new RegExp(p.source, p.flags)
  return (input.value.match(re) || []).length
})

const output = computed(() => {
  const p = parsed.value
  // 查找内容为空时保持原文不变
  if (!p || p.error) return input.value
  if (!useRegex.value) {
    // 函数形式的替换不做 $& 等特殊模式解释,按字面量处理
    return input.value.replace(new RegExp(p.source, p.flags), () => replace.value)
  }
  return input.value.replace(new RegExp(p.source, p.flags), replace.value)
})
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-draft="'replace'" v-model="input" class="textarea" rows="5" spellcheck="false"></textarea>
  </div>

  <div class="grid-2" style="margin-bottom: 12px">
    <div class="field" style="margin: 0">
      <label class="field-label">查找内容</label>
      <input v-model="find" class="input" placeholder="要查找的文本或正则" spellcheck="false" />
    </div>
    <div class="field" style="margin: 0">
      <label class="field-label">替换为</label>
      <input v-model="replace" class="input" placeholder="替换后的内容(留空即删除)" spellcheck="false" />
    </div>
  </div>

  <div class="row" style="margin-bottom: 12px">
    <label class="check"><input v-model="useRegex" type="checkbox" />使用正则表达式</label>
    <label class="check"><input v-model="ignoreCase" type="checkbox" />忽略大小写</label>
    <span v-if="parsed && !parsed.error" class="tip">共替换 {{ count }} 处</span>
  </div>

  <div v-if="parsed && parsed.error" class="error-box" style="margin-bottom: 12px">✗ 正则无效:{{ parsed.error }}</div>

  <label class="field-label">输出结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
    <button class="btn btn-sm" @click="input = output">将结果放回输入框</button>
  </div>

  <p v-if="useRegex" class="tip" style="margin-top: 10px">
    提示:正则替换支持 $1、$2 引用捕获分组,例如查找 (\d{4})-(\d{2})-(\d{2}) 替换为 $2/$3/$1。
  </p>
</template>
