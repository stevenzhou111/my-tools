<script setup>
import { onMounted, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const count = ref(5)
const upper = ref(false)
const noHyphen = ref(false)
const list = ref([])
const { copiedKey, copy } = useCopy()

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  )
}

function generate() {
  const n = Math.min(100, Math.max(1, Number(count.value) || 1))
  list.value = Array.from({ length: n }, () => {
    let u = uuid()
    if (noHyphen.value) u = u.replaceAll('-', '')
    if (upper.value) u = u.toUpperCase()
    return u
  })
}

onMounted(generate)
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl">
      <span class="field-label" style="margin: 0">数量(1–100)</span>
      <input v-model.number="count" type="number" min="1" max="100" class="input count-input" />
    </label>
    <label class="check"><input v-model="upper" type="checkbox" @change="generate" />大写</label>
    <label class="check"><input v-model="noHyphen" type="checkbox" @change="generate" />去掉连字符</label>
    <button class="btn btn-primary" @click="generate">🎲 生成</button>
  </div>

  <pre class="output">{{ list.join('\n') }}</pre>

  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('all', list.join('\n'))">
      {{ copiedKey === 'all' ? '✓ 已复制全部' : '复制全部' }}
    </button>
  </div>

  <p class="tip" style="margin-top: 12px">UUID v4 由浏览器加密级随机数生成,碰撞概率可以忽略不计。</p>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.count-input {
  width: 110px;
}
</style>
