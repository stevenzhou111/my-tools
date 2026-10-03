<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { debounce } from '@/utils/format'

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

const text = ref('你好,工具箱!')
const results = ref([])
const error = ref('')
const { copiedKey, copy } = useCopy()

async function run() {
  error.value = ''
  const s = text.value
  if (!s) {
    results.value = []
    return
  }
  try {
    const data = new TextEncoder().encode(s)
    const out = []
    for (const algo of ALGOS) {
      const buf = await crypto.subtle.digest(algo, data)
      out.push({
        algo,
        hex: [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join(''),
      })
    }
    // 输入已被再次修改时丢弃过期结果
    if (text.value === s) results.value = out
  } catch (e) {
    error.value = '计算失败:' + e.message
    results.value = []
  }
}

const runDebounced = debounce(run, 250)
watch(text, () => runDebounced(), { immediate: true })
onUnmounted(() => runDebounced.cancel())
</script>

<template>
  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-model="text" class="textarea" rows="5" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <div v-for="r in results" :key="r.algo" class="panel hash-row">
    <div class="hash-head">
      <span class="hash-algo">{{ r.algo }}</span>
      <button class="btn btn-sm" @click="copy(r.algo, r.hex)">
        {{ copiedKey === r.algo ? '✓ 已复制' : '复制' }}
      </button>
    </div>
    <pre class="output hash-hex">{{ r.hex }}</pre>
  </div>

  <p class="tip" style="margin-top: 12px">
    哈希是单向摘要,无法反推原文;SHA 系列由浏览器 Web Crypto API 在本地计算。
  </p>
</template>

<style scoped>
.hash-row {
  margin-bottom: 10px;
  padding: 12px;
}
.hash-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.hash-algo {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}
.hash-hex {
  background: var(--bg-soft);
  max-height: 100px;
}
</style>
