<script setup>
import { ref, watch } from 'vue'
import { useCopy } from '@/utils/useCopy'

const min = ref(1)
const max = ref(100)
const count = ref(10)
const unique = ref(false)
const sorted = ref(false)
const list = ref([])
const error = ref('')
const { copiedKey, copy } = useCopy()

function randInt(lo, hi) {
  // [lo, hi] 均匀分布,拒绝采样消除偏差
  const span = hi - lo + 1
  const limit = Math.floor(0x100000000 / span) * span
  const buf = new Uint32Array(1)
  let x
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return lo + (x % span)
}

function generate() {
  error.value = ''
  if (min.value === '' || max.value === '' || count.value === '') {
    return (error.value = '请填写最小值、最大值与数量')
  }
  const lo = Math.ceil(Number(min.value))
  const hi = Math.floor(Number(max.value))
  const n = Math.floor(Number(count.value))
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return (error.value = '请输入有效的范围')
  if (lo > hi) return (error.value = '最小值不能大于最大值')
  const span = hi - lo + 1
  // 单次拒绝采样基于 32 位随机数,跨度超过 2^32 会死循环
  if (span > 0xffffffff) return (error.value = '范围跨度过大,请保持在 43 亿以内')
  if (n < 1 || n > 10000) return (error.value = '数量需在 1 ~ 10000 之间')
  if (unique.value && n > span) return (error.value = `范围只有 ${span} 个数,不足以去重生成 ${n} 个`)
  const set = new Set()
  const out = []
  while (out.length < n) {
    const v = randInt(lo, hi)
    if (unique.value) {
      if (set.has(v)) continue
      set.add(v)
    }
    out.push(v)
  }
  if (sorted.value) out.sort((a, b) => a - b)
  list.value = out
}

watch([min, max, count, unique, sorted], generate)
generate()
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl">
      <span class="field-label">最小值</span>
      <input v-model.number="min" type="number" class="input num-input" />
    </label>
    <label class="ctrl">
      <span class="field-label">最大值</span>
      <input v-model.number="max" type="number" class="input num-input" />
    </label>
    <label class="ctrl">
      <span class="field-label">数量</span>
      <input v-model.number="count" type="number" min="1" max="10000" class="input num-input" />
    </label>
    <label class="check" style="margin-top: 20px"><input v-model="unique" type="checkbox" />不重复</label>
    <label class="check" style="margin-top: 20px"><input v-model="sorted" type="checkbox" />升序排序</label>
    <button class="btn btn-primary" style="margin-top: 20px" @click="generate">🎲 重新生成</button>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <pre v-if="list.length" class="output">{{ list.join('\n') }}</pre>
  <div v-if="list.length" class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('nl', list.join('\n'))">
      {{ copiedKey === 'nl' ? '✓ 已复制' : '复制(换行分隔)' }}
    </button>
    <button class="btn btn-sm" @click="copy('sp', list.join(' '))">
      {{ copiedKey === 'sp' ? '✓ 已复制' : '复制(空格分隔)' }}
    </button>
  </div>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.num-input {
  width: 130px;
}
</style>
