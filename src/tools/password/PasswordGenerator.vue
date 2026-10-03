<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useCopy } from '@/utils/useCopy'

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
}
const SIMILAR = 'il1Lo0O'

const length = ref(16)
const opts = reactive({ lower: true, upper: true, digits: true, symbols: false })
const excludeSimilar = ref(false)
const passwords = ref([])
const { copiedKey, copy } = useCopy()

const pool = computed(() => {
  let s = Object.entries(opts)
    .filter(([, v]) => v)
    .map(([k]) => SETS[k])
    .join('')
  if (excludeSimilar.value) s = [...s].filter((c) => !SIMILAR.includes(c)).join('')
  return s
})

const strength = computed(() => {
  const size = pool.value.length
  if (!size) return null
  const bits = length.value * Math.log2(size)
  if (bits < 45) return { label: '较弱', class: 'weak' }
  if (bits < 70) return { label: '较强', class: 'good' }
  return { label: '极强', class: 'great' }
})

function randInt(max) {
  // 拒绝采样,消除取模偏差
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  let x
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

function generate() {
  const p = pool.value
  if (!p) {
    passwords.value = []
    return
  }
  passwords.value = Array.from({ length: 5 }, () =>
    Array.from({ length: length.value }, () => p[randInt(p.length)]).join(''),
  )
}

watch([length, opts, excludeSimilar], generate)
generate()
</script>

<template>
  <div class="panel" style="margin-bottom: 14px">
    <div class="field">
      <label class="field-label">
        密码长度:<strong>{{ length }}</strong>
        <span v-if="strength" class="strength" :class="strength.class">{{ strength.label }}</span>
      </label>
      <input v-model.number="length" type="range" min="4" max="64" step="1" style="width: 100%" />
    </div>
    <div class="row">
      <label class="check"><input v-model="opts.lower" type="checkbox" />小写字母 a-z</label>
      <label class="check"><input v-model="opts.upper" type="checkbox" />大写字母 A-Z</label>
      <label class="check"><input v-model="opts.digits" type="checkbox" />数字 0-9</label>
      <label class="check"><input v-model="opts.symbols" type="checkbox" />符号 !@#$</label>
      <label class="check">
        <input v-model="excludeSimilar" type="checkbox" />
        排除易混淆字符 (i l 1 L o 0 O)
      </label>
    </div>
    <p v-if="!pool" class="error-box" style="margin-top: 10px">请至少选择一种字符类型</p>
  </div>

  <div class="pw-list">
    <div v-for="(pw, i) in passwords" :key="i" class="pw-row">
      <code class="pw-text">{{ pw }}</code>
      <button class="btn btn-sm" @click="copy(String(i), pw)">
        {{ copiedKey === String(i) ? '✓ 已复制' : '复制' }}
      </button>
    </div>
  </div>

  <div class="row" style="margin-top: 12px">
    <button class="btn btn-primary" :disabled="!pool" @click="generate">🎲 换一批</button>
  </div>

  <p class="tip" style="margin-top: 12px">
    密码由浏览器加密级随机数生成,不会离开你的设备;强度按信息熵估算。
  </p>
</template>

<style scoped>
.strength {
  font-weight: 600;
}
.strength.weak { color: var(--danger); }
.strength.good { color: #16a34a; }
.strength.great { color: var(--accent); }
.pw-list {
  display: grid;
  gap: 8px;
}
.pw-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.pw-text {
  font-size: 15px;
  word-break: break-all;
}
</style>
