<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy-signature-not-verified')
const { copiedKey, copy } = useCopy()

function b64urlDecode(s) {
  let base64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const bin = atob(base64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

const parts = computed(() => {
  const token = input.value.trim()
  if (!token || !token.includes('.')) return null
  const segs = token.split('.')
  if (segs.length < 2) return null
  try {
    const header = JSON.parse(b64urlDecode(segs[0]))
    const payload = JSON.parse(b64urlDecode(segs[1]))
    // payload 可能是 "null" 等非对象 JSON,后续按对象访问会崩溃
    if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') return null
    return {
      header,
      payload,
      signature: segs[2] || '(空)',
    }
  } catch {
    return null
  }
})

const error = computed(() => {
  const token = input.value.trim()
  if (!token) return ''
  if (!token.includes('.')) return '不是有效的 JWT(应包含两个 . 分隔符)'
  if (!parts.value) return 'Header / Payload 不是有效的 Base64URL JSON'
  return ''
})

const timeFields = computed(() => {
  if (!parts.value) return []
  const fields = []
  for (const key of ['iat', 'exp', 'nbf']) {
    const v = parts.value.payload[key]
    if (typeof v === 'number') {
      const d = new Date(v * 1000)
      fields.push({ key, label: { iat: '签发时间 (iat)', exp: '过期时间 (exp)', nbf: '生效时间 (nbf)' }[key], value: d.toLocaleString('zh-CN', { hour12: false }), raw: v })
    }
  }
  return fields
})

const expired = computed(() => {
  if (!parts.value) return null
  const exp = parts.value.payload.exp
  if (typeof exp !== 'number') return null
  return Date.now() / 1000 > exp
})

function pretty(obj) {
  return JSON.stringify(obj, null, 2)
}
</script>

<template>
  <div class="field">
    <label class="field-label">粘贴 JWT Token</label>
    <textarea v-draft="'jwt'" v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <template v-if="parts">
    <div class="row" style="margin-bottom: 14px">
      <span v-if="expired !== null" class="badge" :class="expired ? 'bad' : 'ok'">
        {{ expired ? '⛔ 已过期' : '✅ 未过期' }}
      </span>
      <span class="tip">⚠️ 本工具仅解码查看,不校验签名</span>
    </div>

    <div v-for="f in timeFields" :key="f.key" class="time-row">
      <span class="time-label">{{ f.label }}</span>
      <code>{{ f.value }}</code>
    </div>

    <div class="grid-2" style="margin-top: 14px">
      <div>
        <div class="snippet-head">
          <label class="field-label">Header</label>
          <button class="btn btn-sm" @click="copy('h', pretty(parts.header))">
            {{ copiedKey === 'h' ? '✓ 已复制' : '复制' }}
          </button>
        </div>
        <pre class="output">{{ pretty(parts.header) }}</pre>
      </div>
      <div>
        <div class="snippet-head">
          <label class="field-label">Payload</label>
          <button class="btn btn-sm" @click="copy('p', pretty(parts.payload))">
            {{ copiedKey === 'p' ? '✓ 已复制' : '复制' }}
          </button>
        </div>
        <pre class="output">{{ pretty(parts.payload) }}</pre>
      </div>
    </div>
  </template>
</template>

<style scoped>
.badge {
  font-size: 14px;
  padding: 3px 12px;
  border-radius: 20px;
}
.badge.ok {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}
.badge.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.time-row {
  display: flex;
  gap: 10px;
  font-size: 14.5px;
  padding: 4px 0;
}
.time-label {
  width: 110px;
  color: var(--muted);
}
.snippet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.snippet-head .field-label {
  margin-bottom: 0;
}
</style>
