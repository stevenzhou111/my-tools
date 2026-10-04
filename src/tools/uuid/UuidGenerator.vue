<script setup>
import { onMounted, ref } from 'vue'
import { nanoId, ulid } from '@/utils/shortId'
import { useCopy } from '@/utils/useCopy'

const mode = ref('uuid') // uuid | nano | ulid
const count = ref(5)
const upper = ref(false)
const noHyphen = ref(false)
const nanoSize = ref(21)
const list = ref([])
const { copiedKey, copy } = useCopy()

const MODES = [
  { id: 'uuid', label: 'UUID v4' },
  { id: 'nano', label: 'NanoID' },
  { id: 'ulid', label: 'ULID' },
]

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16),
  )
}

function generate() {
  const n = Math.min(100, Math.max(1, Number(count.value) || 1))
  list.value = Array.from({ length: n }, () => {
    if (mode.value === 'nano') {
      const size = Math.min(64, Math.max(6, Number(nanoSize.value) || 21))
      return nanoId(size)
    }
    if (mode.value === 'ulid') return ulid()
    let u = uuid()
    if (noHyphen.value) u = u.replaceAll('-', '')
    if (upper.value) u = u.toUpperCase()
    return u
  })
}

onMounted(generate)
</script>

<template>
  <div class="row" style="margin-bottom: 14px" role="radiogroup" aria-label="ID 类型">
    <button
      v-for="m in MODES"
      :key="m.id"
      class="btn btn-sm"
      :class="{ 'btn-primary': mode === m.id }"
      role="radio"
      :aria-checked="mode === m.id"
      @click="mode = m.id; generate()"
    >
      {{ m.label }}
    </button>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl">
      <span class="field-label" style="margin: 0">数量(1–100)</span>
      <input v-model.number="count" type="number" min="1" max="100" class="input count-input" @change="generate" />
    </label>
    <label v-if="mode === 'nano'" class="ctrl">
      <span class="field-label" style="margin: 0">长度(6–64)</span>
      <input v-model.number="nanoSize" type="number" min="6" max="64" class="input count-input" @change="generate" />
    </label>
    <template v-if="mode === 'uuid'">
      <label class="check"><input v-model="upper" type="checkbox" @change="generate" />大写</label>
      <label class="check"><input v-model="noHyphen" type="checkbox" @change="generate" />去掉连字符</label>
    </template>
    <button class="btn btn-primary" @click="generate">🎲 生成</button>
  </div>

  <pre class="output">{{ list.join('\n') }}</pre>

  <div class="row" style="margin-top: 10px">
    <button class="btn btn-sm" @click="copy('all', list.join('\n'))">
      {{ copiedKey === 'all' ? '✓ 已复制全部' : '复制全部' }}
    </button>
  </div>

  <p class="tip" style="margin-top: 12px">
    <template v-if="mode === 'uuid'">
      UUID v4 由浏览器加密级随机数生成,122 位随机空间,碰撞概率可以忽略不计。
    </template>
    <template v-else-if="mode === 'nano'">
      NanoID 是 21 字符左右的 URL 安全短 ID(字母表与官方一致),比 UUID 短 36%,适合做数据库主键与分享码。
    </template>
    <template v-else>
      ULID 为 26 位大写 Crockford Base32:前 10 位是毫秒时间戳(可按字典序排序、可反解时间),后 16 位是随机数,适合按时间有序的记录标识。
    </template>
  </p>
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
