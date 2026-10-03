<script setup>
import { computed, ref } from 'vue'
import md5Lib from 'blueimp-md5'
import { useCopy } from '@/utils/useCopy'

const input = ref('你好,工具箱!')
const upper = ref(false)
const short16 = ref(false)
const { copiedKey, copy } = useCopy()

const full = computed(() => {
  const h = md5Lib(input.value)
  return upper.value ? h.toUpperCase() : h
})

const output = computed(() => (short16.value ? full.value.slice(8, 24) : full.value))
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="upper" type="checkbox" />大写输出</label>
    <label class="check"><input v-model="short16" type="checkbox" />16 位(取第 9~24 位)</label>
  </div>

  <label class="field-label">MD5 摘要</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
  </div>

  <p class="tip" style="margin-top: 12px">
    MD5 已不再具备密码学安全性,仅建议用于普通数据校验;需要安全摘要请使用「哈希计算」中的 SHA-256。
  </p>
</template>
