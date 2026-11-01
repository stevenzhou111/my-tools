<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref } from 'vue'
import { sm2, sm3, sm4 } from 'sm-crypto'
import { useCopy } from '@/utils/useCopy'

const tab = ref('sm3')
const { copiedKey, copy } = useCopy()

// ---------- SM3 ----------
const sm3Input = ref('你好,工具箱!')
const sm3Output = computed(() => {
  try {
    return sm3Input.value ? sm3(sm3Input.value) : ''
  } catch (e) {
    return ''
  }
})

// ---------- SM4 ----------
function randomHex32() {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const sm4Text = ref('这是一段需要加密的机密内容')
const sm4Key = ref('0123456789abcdeffedcba9876543210')
// 默认 CBC + 随机 IV:ECB 对结构性数据泄漏明文模式,不应作为默认选项;
// 固定示例 IV 在同密钥下会让 CBC 退化,故初始 IV 也随机生成
const sm4Mode = ref('cbc')
const sm4Iv = ref(randomHex32())
const sm4CipherOut = ref('') // 加密结果展示
const sm4CipherIn = ref('') // 解密输入
const sm4Plain = ref('')
const sm4Error = ref('')

function isHex32(s) {
  return /^[0-9a-fA-F]{32}$/.test(s.trim())
}

function sm4Encrypt() {
  sm4Error.value = ''
  sm4Plain.value = ''
  if (!isHex32(sm4Key.value)) return (sm4Error.value = '密钥必须是 32 位十六进制(16 字节)')
  if (sm4Mode.value === 'cbc' && !isHex32(sm4Iv.value)) return (sm4Error.value = 'CBC 模式的 IV 必须是 32 位十六进制')
  try {
    const opts = sm4Mode.value === 'cbc' ? { mode: 'cbc', iv: sm4Iv.value.trim() } : {}
    sm4CipherOut.value = sm4.encrypt(sm4Text.value, sm4Key.value.trim(), opts)
    sm4CipherIn.value = sm4CipherOut.value
  } catch (e) {
    sm4Error.value = '加密失败:' + e.message
  }
}

function sm4Decrypt() {
  sm4Error.value = ''
  sm4Text.value = ''
  if (!isHex32(sm4Key.value)) return (sm4Error.value = '密钥必须是 32 位十六进制(16 字节)')
  if (sm4Mode.value === 'cbc' && !isHex32(sm4Iv.value)) return (sm4Error.value = 'CBC 模式的 IV 必须是 32 位十六进制')
  if (!/^[0-9a-fA-F]+$/.test(sm4CipherIn.value.trim())) return (sm4Error.value = '密文应为十六进制字符串')
  try {
    const opts = sm4Mode.value === 'cbc' ? { mode: 'cbc', iv: sm4Iv.value.trim() } : {}
    sm4Plain.value = sm4.decrypt(sm4CipherIn.value.trim(), sm4Key.value.trim(), opts) || ''
  } catch (e) {
    sm4Error.value = '解密失败:' + e.message
  }
}

function randomKey() {
  const buf = new Uint8Array(16)
  crypto.getRandomValues(buf)
  sm4Key.value = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- SM2 ----------
const sm2KeyPair = ref(null)
const sm2Plain = ref('SM2 加密测试内容')
const sm2PublicKey = ref('')
const sm2PrivateKey = ref('')
const sm2CipherOut = ref('') // 加密结果展示
const sm2CipherIn = ref('') // 解密输入
const sm2Decrypted = ref('')
const sm2Error = ref('')

function genKeyPair() {
  sm2KeyPair.value = sm2.generateKeyPairHex()
  sm2PublicKey.value = sm2KeyPair.value.publicKey
  sm2PrivateKey.value = sm2KeyPair.value.privateKey
}
genKeyPair()

function sm2Encrypt() {
  sm2Error.value = ''
  sm2Decrypted.value = ''
  if (!sm2PublicKey.value.trim()) return (sm2Error.value = '请填写公钥')
  try {
    sm2CipherOut.value = sm2.doEncrypt(sm2Plain.value, sm2PublicKey.value.trim(), 1)
    sm2CipherIn.value = sm2CipherOut.value
  } catch (e) {
    sm2Error.value = '加密失败:' + e.message
  }
}

function sm2Decrypt() {
  sm2Error.value = ''
  sm2Plain.value = ''
  if (!sm2PrivateKey.value.trim()) return (sm2Error.value = '请填写私钥')
  try {
    const result = sm2.doDecrypt(sm2CipherIn.value.trim(), sm2PrivateKey.value.trim(), 1)
    sm2Decrypted.value = result || '(解密结果为空,请检查密文与私钥)'
  } catch (e) {
    sm2Error.value = '解密失败:' + e.message
  }
}
</script>

<template>
  <div class="row mb-16">
    <button class="btn" :class="{ 'btn-primary': tab === 'sm3' }" @click="tab = 'sm3'">SM3 摘要</button>
    <button class="btn" :class="{ 'btn-primary': tab === 'sm4' }" @click="tab = 'sm4'">SM4 对称加解密</button>
    <button class="btn" :class="{ 'btn-primary': tab === 'sm2' }" @click="tab = 'sm2'">SM2 非对称加解密</button>
  </div>

  <div v-if="sm4Error" class="error-box mb-12">✗ {{ sm4Error }}</div>
  <div v-if="sm2Error" class="error-box mb-12">✗ {{ sm2Error }}</div>

  <!-- SM3 -->
  <template v-if="tab === 'sm3'">
    <div class="field">
      <label class="field-label" for="sm3Input">输入文本</label>
      <textarea id="sm3Input" v-model="sm3Input" class="textarea" rows="3" spellcheck="false"></textarea>
    </div>
    <label class="field-label" for="sm4Text">SM3 摘要(256 位,与 SHA-256 同长度)</label>
    <pre class="output">{{ sm3Output }}</pre>
    <div class="row mt-10">
      <button class="btn btn-sm" @click="copy('sm3', sm3Output)">
        {{ copiedKey === 'sm3' ? '✓ 已复制' : '复制' }}
      </button>
    </div>
  </template>

  <!-- SM4 -->
  <template v-if="tab === 'sm4'">
    <div class="row mb-14">
      <label class="ctrl">
        <span class="field-label">密钥(32 位 hex,自动生成)</span>
        <div class="row" style="flex-wrap: nowrap">
          <input v-model="sm4Key" class="input mono" spellcheck="false" />
          <button class="btn" @click="randomKey"><AppIcon name="dice-5" :size="15" /></button>
        </div>
      </label>
      <label class="ctrl" style="width: 130px">
        <span class="field-label">模式</span>
        <select v-model="sm4Mode" class="select">
          <option value="cbc">CBC(需 IV)</option>
          <option value="ecb">ECB</option>
        </select>
      </label>
      <label v-if="sm4Mode === 'cbc'" class="ctrl">
        <span class="field-label">IV(32 位 hex)</span>
        <span class="row" style="gap: 6px">
          <input v-model="sm4Iv" class="input mono" spellcheck="false" />
          <button class="btn" title="生成随机 IV" aria-label="生成随机 IV" @click="sm4Iv = randomHex32()"><AppIcon name="dice-5" :size="15" /></button>
        </span>
      </label>
    </div>
    <p v-if="sm4Mode === 'ecb'" class="tip" style="margin-top: -6px">
      ⚠️ ECB 模式不抗模式分析:相同明文分组产生相同密文,除兼容遗留系统外建议改用 CBC。
    </p>

    <div class="field">
      <label class="field-label">明文</label>
      <textarea id="sm4Text" v-model="sm4Text" class="textarea" rows="3" spellcheck="false"></textarea>
    </div>
    <button class="btn btn-primary" @click="sm4Encrypt"><AppIcon name="lock" :size="15" /> 加密</button>

    <div v-if="sm4CipherOut" class="field mt-14">
      <label class="field-label" for="sm4CipherIn">密文(hex)</label>
      <pre class="output">{{ sm4CipherOut }}</pre>
      <div class="row mt-8">
        <button class="btn btn-sm" @click="copy('c', sm4CipherOut)">
          {{ copiedKey === 'c' ? '✓ 已复制' : '复制密文' }}
        </button>
      </div>
    </div>

    <div class="field mt-14">
      <label class="field-label">或在此粘贴密文进行解密</label>
      <textarea id="sm4CipherIn" v-model="sm4CipherIn" class="textarea" rows="3" spellcheck="false"></textarea>
    </div>
    <button class="btn" @click="sm4Decrypt"><AppIcon name="lock-open" :size="15" /> 解密</button>
    <pre v-if="sm4Plain" class="output mt-12">{{ sm4Plain }}</pre>
  </template>

  <!-- SM2 -->
  <template v-if="tab === 'sm2'">
    <div class="row mb-14">
      <button class="btn" @click="genKeyPair"><AppIcon name="dice-5" :size="15" /> 生成新密钥对</button>
      <button class="btn btn-sm" @click="copy('pub', sm2PublicKey)">
        {{ copiedKey === 'pub' ? '✓ 公钥已复制' : '复制公钥' }}
      </button>
      <button class="btn btn-sm" @click="copy('pri', sm2PrivateKey)">
        {{ copiedKey === 'pri' ? '✓ 私钥已复制' : '复制私钥' }}
      </button>
    </div>
    <div class="field">
      <label class="field-label" for="sm2PublicKey">公钥(加密用)</label>
      <textarea id="sm2PublicKey" v-model="sm2PublicKey" class="textarea" rows="2" spellcheck="false"></textarea>
    </div>
    <div class="field">
      <label class="field-label" for="sm2PrivateKey">私钥(解密用)</label>
      <textarea id="sm2PrivateKey" v-model="sm2PrivateKey" class="textarea" rows="2" spellcheck="false"></textarea>
    </div>
    <div class="field">
      <label class="field-label" for="sm2Plain">明文</label>
      <textarea id="sm2Plain" v-model="sm2Plain" class="textarea" rows="2" spellcheck="false"></textarea>
    </div>
    <button class="btn btn-primary" @click="sm2Encrypt"><AppIcon name="lock" :size="15" /> 公钥加密</button>
    <pre v-if="sm2CipherOut" class="output mt-12">{{ sm2CipherOut.slice(0, 400) }}{{ sm2CipherOut.length > 400 ? '…' : '' }}</pre>

    <div class="field mt-14">
      <label class="field-label" for="sm2CipherIn">或在此粘贴密文(hex)进行解密</label>
      <textarea id="sm2CipherIn" v-model="sm2CipherIn" class="textarea" rows="3" spellcheck="false"></textarea>
    </div>
    <button class="btn" @click="sm2Decrypt"><AppIcon name="lock-open" :size="15" /> 私钥解密</button>
    <pre v-if="sm2Decrypted" class="output mt-12">{{ sm2Decrypted }}</pre>

    <p class="tip mt-12">密文以 04 开头为 C1C3C2 标准模式;加解密均由 sm-crypto 在浏览器本地完成。</p>
  </template>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 240px;
}
.mono {
  font-family: var(--mono);
  font-size: 14px;
}
</style>
