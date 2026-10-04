<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { randomSecret, secondsRemaining, totp } from '@/utils/totp'
import { useCopy } from '@/utils/useCopy'

const secret = ref('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
const digits = ref(6)
const period = ref(30)
const algorithm = ref('SHA-1')
const { copiedKey, copy } = useCopy()

const code = ref('')
const error = ref('')
const remaining = ref(period.value)
let timer = null
let seq = 0 // 防止异步乱序:旧请求晚到不覆盖新结果

async function compute() {
  const mySeq = ++seq
  remaining.value = secondsRemaining(period.value)
  try {
    const c = await totp(secret.value, {
      digits: digits.value,
      period: period.value,
      algorithm: algorithm.value,
    })
    if (mySeq === seq) {
      code.value = c
      error.value = ''
    }
  } catch (e) {
    if (mySeq === seq) {
      code.value = ''
      error.value = e.message
    }
  }
}

function tick() {
  remaining.value = secondsRemaining(period.value)
  // 进入新窗口立即刷新验证码
  if (remaining.value === period.value) compute()
}

watch([secret, digits, period, algorithm], compute, { immediate: true })
timer = setInterval(tick, 500)
onUnmounted(() => clearInterval(timer))

const progress = computed(() => remaining.value / period.value)

function newSecret() {
  secret.value = randomSecret()
}

function formatted(code) {
  return digits.value === 8 ? code.replace(/(\d{4})(\d{4})/, '$1 $2') : code.replace(/(\d{3})(\d{3})/, '$1 $2')
}
</script>

<template>
  <div class="totp">
    <div class="field">
      <label class="field-label">Base32 密钥(2FA 设置页/二维码里给出)</label>
      <textarea v-model="secret" class="textarea" rows="2" spellcheck="false" placeholder="如 JBSWY3DPEHPK3PXP"></textarea>
    </div>

    <div class="row" style="margin-bottom: 14px">
      <label class="check">
        位数
        <select v-model.number="digits" class="select" style="width: 80px">
          <option :value="6">6 位</option>
          <option :value="8">8 位</option>
        </select>
      </label>
      <label class="check">
        周期
        <select v-model.number="period" class="select" style="width: 90px">
          <option :value="30">30 秒</option>
          <option :value="60">60 秒</option>
        </select>
      </label>
      <label class="check">
        算法
        <select v-model="algorithm" class="select" style="width: 110px">
          <option>SHA-1</option>
          <option>SHA-256</option>
          <option>SHA-512</option>
        </select>
      </label>
      <button class="btn btn-sm" @click="newSecret">生成随机密钥</button>
    </div>

    <div v-if="error" class="error-box">✗ {{ error }}</div>

    <template v-else-if="code">
      <div class="panel code-panel">
        <div class="code" :class="{ fresh: remaining === period }">{{ formatted(code) }}</div>
        <div class="bar-wrap" role="progressbar" :aria-valuenow="remaining" aria-valuemin="0" :aria-valuemax="period" aria-label="距下次刷新秒数">
          <div class="bar" :style="{ width: progress * 100 + '%' }" :class="{ warn: remaining <= 5 }"></div>
        </div>
        <p class="tip">{{ remaining }} 秒后刷新 · 密钥仅在本页内存中计算,不会被存储或上传</p>
        <button class="btn btn-primary" @click="copy('totp', code)">
          {{ copiedKey === 'totp' ? '✓ 已复制' : '复制验证码' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.code-panel {
  text-align: center;
  padding: 26px 16px 20px;
}
.code {
  font-family: var(--mono);
  font-size: 44px;
  font-weight: 800;
  letter-spacing: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  line-height: 1.2;
}
.bar-wrap {
  height: 5px;
  border-radius: 3px;
  background: var(--bg-soft);
  overflow: hidden;
  margin: 14px auto 10px;
  max-width: 320px;
}
.bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.4s linear;
}
.bar.warn {
  background: var(--danger);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>