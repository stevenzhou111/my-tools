<script setup>
import { ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const text = ref('这是一段需要保密的内容,只有知道密码的人才能解密。')
const password = ref('')
const mode = ref('encrypt')
const output = ref('')
const error = ref('')
const busy = ref(false)
const { copiedKey, copy } = useCopy()

const enc = new TextEncoder()
const dec = new TextDecoder()

async function deriveKey(pwd, salt) {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function unb64(s) {
  const bin = atob(s.replace(/\s/g, ''))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function run() {
  error.value = ''
  output.value = ''
  if (!password.value) return (error.value = '请输入密码')
  busy.value = true
  try {
    if (mode.value === 'encrypt') {
      if (!text.value) return (error.value = '请输入要加密的文本')
      // 输出格式:Base64(salt 16B + iv 12B + 密文),同一密码每次加密结果都不同
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await deriveKey(password.value, salt)
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text.value))
      const merged = new Uint8Array(16 + 12 + cipher.byteLength)
      merged.set(salt, 0)
      merged.set(iv, 16)
      merged.set(new Uint8Array(cipher), 28)
      output.value = b64(merged.buffer)
    } else {
      // 解密模式:第一个输入框是密文,结果写入输出框
      const cipherText = text.value.trim()
      if (!cipherText) return (error.value = '请把密文粘贴到上方输入框')
      let data
      try {
        data = unb64(cipherText)
      } catch {
        return (error.value = '密文不是有效的 Base64')
      }
      if (data.length < 29) return (error.value = '密文过短或格式不符')
      const salt = data.slice(0, 16)
      const iv = data.slice(16, 28)
      const key = await deriveKey(password.value, salt)
      let plain
      try {
        plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data.slice(28))
      } catch {
        return (error.value = '解密失败:密码错误或密文已被篡改')
      }
      output.value = dec.decode(plain)
    }
  } catch (e) {
    error.value = '操作失败:' + e.message
  } finally {
    busy.value = false
  }
}

function swap() {
  text.value = output.value
  output.value = ''
  mode.value = mode.value === 'encrypt' ? 'decrypt' : 'encrypt'
}
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="encrypt" />加密(明文 → 密文)</label>
    <label class="check"><input v-model="mode" type="radio" value="decrypt" />解密(密文 → 明文)</label>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <div class="field">
    <label class="field-label">{{ mode === 'encrypt' ? '明文' : '密文(Base64)' }}</label>
    <textarea v-model="text" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="field">
    <label class="field-label">密码(PBKDF2 派生 AES-256-GCM 密钥)</label>
    <div class="row" style="flex-wrap: nowrap">
      <input v-model="password" type="password" class="input" placeholder="输入密码" />
      <button class="btn btn-primary" :disabled="busy" @click="run">{{ mode === 'encrypt' ? '🔒 加密' : '🔓 解密' }}</button>
    </div>
  </div>

  <div class="field">
    <label class="field-label">{{ mode === 'encrypt' ? '密文(可分享给知道密码的人)' : '解密结果' }}</label>
    <textarea v-model="output" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="row">
    <button v-if="output" class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制输出' }}
    </button>
    <button v-if="output" class="btn btn-sm" @click="swap">⇄ 将输出放回输入并切换模式</button>
  </div>

  <p class="tip" style="margin-top: 12px">
    算法为浏览器原生 Web Crypto(AES-256-GCM + PBKDF2-SHA256,12 万次迭代);忘记密码无法找回,密码不会离开你的设备。
  </p>
</template>
