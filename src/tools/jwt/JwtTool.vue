<script setup>
import { computed, ref } from 'vue'
import { createJwt, verifyJwt } from '@/utils/jwtSign'
import { useCopy } from '@/utils/useCopy'

const tab = ref('parse')
const input = ref('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.dummy-signature-not-verified')
const { copiedKey, copy } = useCopy()

// ---------- 签名 / 校验 ----------
const payloadJson = ref('{\n  "sub": "1234567890",\n  "name": "张三",\n  "admin": true\n}')
const secret = ref('my-secret-key')
const algo = ref('HS256')
const extraHeader = ref('{"kid": "key-1"}')
const signed = ref('')
const signError = ref('')
const verifyToken = ref('')
const verifySecret = ref('')
const verifyResult = ref(null)

const ALGOS = ['HS256', 'HS384', 'HS512']

function parseJson(text, label) {
  try {
    const v = JSON.parse(text)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { error: `${label} 必须是 JSON 对象` }
    return { value: v }
  } catch (e) {
    return { error: `${label} 不是合法 JSON:${e.message}` }
  }
}

async function doSign() {
  signError.value = ''
  signed.value = ''
  const p = parseJson(payloadJson.value, 'Payload')
  if (p.error) return (signError.value = p.error)
  let extra = {}
  if (extraHeader.value.trim()) {
    const h = parseJson(extraHeader.value, '扩展 Header')
    if (h.error) return (signError.value = h.error)
    extra = h.value
  }
  if (!secret.value) return (signError.value = '请填写签名密钥')
  try {
    const { token } = await createJwt(p.value, secret.value, algo.value, extra)
    signed.value = token
    // 顺手把 token 填到校验输入,方便闭环验证
    verifyToken.value = token
    verifySecret.value = secret.value
  } catch (e) {
    signError.value = e.message
  }
}

async function doVerify() {
  verifyResult.value = null
  if (!verifyToken.value.trim() || !verifySecret.value) return
  verifyResult.value = await verifyJwt(verifyToken.value, verifySecret.value)
}

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
  <div class="row" style="margin-bottom: 16px" role="tablist">
    <button class="btn" :class="{ 'btn-primary': tab === 'parse' }" role="tab" :aria-selected="tab === 'parse'" @click="tab = 'parse'">
      🔍 解析 Token
    </button>
    <button class="btn" :class="{ 'btn-primary': tab === 'sign' }" role="tab" :aria-selected="tab === 'sign'" @click="tab = 'sign'">
      ✍️ 签名 / 校验(HS256/384/512)
    </button>
  </div>

  <!-- 解析 -->
  <template v-if="tab === 'parse'">
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
        <span class="tip">此处仅解码查看;要验证签名请切到「签名 / 校验」页签</span>
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

  <!-- 签名 / 校验 -->
  <template v-else>
    <div class="grid-2" style="align-items: start">
      <div>
        <div class="field">
          <label class="field-label" for="jwt-payload">Payload(JSON 对象)</label>
          <textarea id="jwt-payload" v-model="payloadJson" class="textarea" style="min-height: 130px; font-size: 13.5px" spellcheck="false"></textarea>
        </div>
        <div class="field">
          <label class="field-label" for="jwt-secret">签名密钥(HMAC 对称密钥)</label>
          <input id="jwt-secret" v-model="secret" class="input" style="font-family: var(--mono)" spellcheck="false" />
        </div>
        <div class="row">
          <label class="ctrl">
            <span class="field-label" style="margin: 0">算法</span>
            <select v-model="algo" class="select" style="width: 120px">
              <option v-for="a in ALGOS" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
        </div>
        <div class="field" style="margin-top: 12px">
          <label class="field-label" for="jwt-extra">Header 扩展字段(可选,JSON)</label>
          <input id="jwt-extra" v-model="extraHeader" class="input" style="font-family: var(--mono); font-size: 13.5px" spellcheck="false" />
        </div>
        <button class="btn btn-primary" @click="doSign">✍️ 生成签名 Token</button>
        <div v-if="signError" class="error-box" style="margin-top: 10px">✗ {{ signError }}</div>
        <template v-if="signed">
          <label class="field-label" style="margin-top: 12px" for="jwt-signed">生成的 Token</label>
          <textarea id="jwt-signed" class="textarea" style="min-height: 90px; font-size: 12.5px" readonly :value="signed"></textarea>
          <button class="btn btn-sm btn-primary" style="margin-top: 8px" @click="copy('signed', signed)">
            {{ copiedKey === 'signed' ? '✓ 已复制' : '复制 Token' }}
          </button>
        </template>
      </div>

      <div>
        <div class="field">
          <label class="field-label" for="jwt-verify-token">待校验的 Token</label>
          <textarea id="jwt-verify-token" v-model="verifyToken" class="textarea" style="min-height: 110px; font-size: 12.5px" spellcheck="false" placeholder="粘贴 Token,用密钥重新计算签名比对…"></textarea>
        </div>
        <div class="field">
          <label class="field-label" for="jwt-verify-secret">密钥</label>
          <input id="jwt-verify-secret" v-model="verifySecret" class="input" style="font-family: var(--mono)" spellcheck="false" />
        </div>
        <button class="btn" @click="doVerify">🔎 校验签名</button>
        <div v-if="verifyResult" class="verify-box" :class="verifyResult.ok ? 'ok' : 'bad'">
          <template v-if="verifyResult.ok">✅ 签名一致:Token 由该密钥签发且未被篡改</template>
          <template v-else-if="verifyResult.error">✗ {{ verifyResult.error }}</template>
          <template v-else>⛔ 签名不一致:密钥不对或内容被改过</template>
        </div>
      </div>
    </div>

    <p class="tip" style="margin-top: 14px">
      签名由 WebCrypto 在本地计算,密钥与 Payload 不会上传;alg 头自动写入,扩展字段(如 kid)可自定义。
      仅支持 HMAC 对称算法(HS256/384/512),RS/ES 等非对称算法涉及私钥管理,不适合在网页里操作。
      切勿在此粘贴生产环境密钥。
    </p>
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
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.verify-box {
  margin-top: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 14.5px;
}
.verify-box.ok {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}
.verify-box.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
</style>
