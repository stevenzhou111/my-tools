<script setup>
import { ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const ALGOS = [
  { id: 'SHA-1', label: 'HMAC-SHA1' },
  { id: 'SHA-256', label: 'HMAC-SHA256' },
  { id: 'SHA-384', label: 'HMAC-SHA384' },
  { id: 'SHA-512', label: 'HMAC-SHA512' },
]

const algo = ref('SHA-256')
const key = ref('')
const keyFormat = ref('text')
const message = ref('')
const expected = ref('')
const outHex = ref('')
const outB64 = ref('')
const busy = ref(false)
const error = ref('')
const { copiedKey, copy } = useCopy()

function keyBytes() {
  const s = key.value.trim()
  if (keyFormat.value === 'hex') {
    if (!/^[0-9a-fA-F]*$/.test(s) || s.length % 2) {
      error.value = 'HEX 密钥必须是偶数位的十六进制字符'
      return null
    }
    const bytes = new Uint8Array(s.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16)
    return bytes
  }
  return new TextEncoder().encode(s)
}

async function compute() {
  error.value = ''
  outHex.value = ''
  outB64.value = ''
  if (!crypto?.subtle) return (error.value = '当前环境不支持 Web Crypto(需要 https 或 localhost)')
  const kb = keyBytes()
  if (!kb) return
  busy.value = true
  try {
    const cryptoKey = await crypto.subtle.importKey('raw', kb, { name: 'HMAC', hash: algo.value }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message.value))
    const bytes = new Uint8Array(sig)
    let hex = ''
    for (const b of bytes) hex += b.toString(16).padStart(2, '0')
    outHex.value = hex
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    outB64.value = btoa(bin)
  } catch (e) {
    error.value = '计算失败:' + (e.message || e)
  } finally {
    busy.value = false
  }
}

const matchState = () =>
  !expected.value.trim() || !outHex.value ? '' : expected.value.trim().toLowerCase() === outHex.value ? 'ok' : 'bad'
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    用密钥对消息计算 HMAC 签名,常用于校验 Webhook 回调、API 鉴权签名是否正确。密钥不落盘、不联网,仅在本页内存中参与计算。
  </p>

  <div class="field">
    <label class="field-label" for="hmac-algo">算法</label>
    <select id="hmac-algo" v-model="algo" class="select" style="width: 200px">
      <option v-for="a in ALGOS" :key="a.id" :value="a.id">{{ a.label }}</option>
    </select>
  </div>

  <div class="field">
    <label class="field-label" for="hmac-key">密钥</label>
    <div class="row">
      <input id="hmac-key" v-model="key" class="input" style="flex: 1; font-family: var(--mono)" spellcheck="false" />
      <select v-model="keyFormat" class="select" style="width: 120px" aria-label="密钥格式">
        <option value="text">文本(UTF-8)</option>
        <option value="hex">HEX 字节</option>
      </select>
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="hmac-msg">消息内容</label>
    <textarea id="hmac-msg" v-model="message" class="textarea" rows="3" spellcheck="false"></textarea>
  </div>

  <button class="btn btn-primary" :disabled="busy" @click="compute">{{ busy ? '计算中…' : '🔒 计算 HMAC' }}</button>
  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>

  <template v-if="outHex">
    <div class="field" style="margin-top: 14px">
      <label class="field-label">签名(HEX)</label>
      <pre class="output">{{ outHex }}</pre>
      <button class="btn btn-sm mt-8" @click="copy('hex', outHex)">{{ copiedKey === 'hex' ? '✓ 已复制' : '复制 HEX' }}</button>
    </div>
    <div class="field">
      <label class="field-label">签名(Base64)</label>
      <pre class="output">{{ outB64 }}</pre>
      <button class="btn btn-sm mt-8" @click="copy('b64', outB64)">{{ copiedKey === 'b64' ? '✓ 已复制' : '复制 Base64' }}</button>
    </div>
    <div class="field">
      <label class="field-label" for="hmac-expected">与期望值比对(可选,粘贴对方给出的签名)</label>
      <input id="hmac-expected" v-model="expected" class="input mono" spellcheck="false" />
      <p v-if="matchState() === 'ok'" class="ok-line">✓ 一致,签名校验通过</p>
      <p v-else-if="matchState() === 'bad'" class="bad-line">✗ 不一致:请核对算法、密钥格式与消息原文(注意末尾换行)</p>
    </div>
  </template>
</template>

<style scoped>
.ok-line {
  color: var(--success);
  font-size: 14px;
}
.bad-line {
  color: var(--danger);
  font-size: 14px;
}
</style>
