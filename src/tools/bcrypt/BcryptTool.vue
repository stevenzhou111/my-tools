<script setup>
import { ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'

/**
 * Bcrypt 哈希:bcryptjs 纯 JS 实现(浏览器可用)。用于需要 bcrypt 的
 * 旧系统/教学演示;新项目建议服务端用 argon2id。
 * 计算在本地进行,明文不上传;cost 越高越慢(指数级)。
 */

const plain = ref('')
const cost = ref(10)
const hashOut = ref('')
const hashing = ref(false)
const hashMs = ref(0)
const hashError = ref('')

const verifyHash = ref('')
const verifyPlain = ref('')
const verifyResult = ref(null) // true | false | null
const verifying = ref(false)

async function doHash() {
  if (!plain.value) return (hashError.value = '请输入要哈希的内容')
  hashError.value = ''
  hashing.value = true
  const t0 = performance.now()
  try {
    const bcrypt = await import('bcryptjs')
    hashOut.value = await bcrypt.hash(plain.value, Number(cost.value))
    hashMs.value = Math.round(performance.now() - t0)
  } catch (e) {
    hashError.value = '哈希失败:' + e.message
  } finally {
    hashing.value = false
  }
}

async function doVerify() {
  if (!verifyHash.value || !verifyPlain.value) return
  verifying.value = true
  try {
    const bcrypt = await import('bcryptjs')
    verifyResult.value = await bcrypt.compare(verifyPlain.value, verifyHash.value.trim())
  } catch (e) {
    verifyResult.value = null
    hashError.value = '校验失败:' + e.message
  } finally {
    verifying.value = false
  }
}
</script>

<template>
  <div class="panel mb-16">
    <p class="field-label">生成哈希</p>
    <div class="field">
      <label class="field-label" for="bc-plain">内容(密码等,只留本机)</label>
      <input id="bc-plain" v-model="plain" class="input" spellcheck="false" />
    </div>
    <div class="row mb-14 ctrl-row">
      <label class="ctrl grow">
        <span class="field-label">cost(工作因子:{{ cost }},耗时约指数增长)</span>
        <input v-model.number="cost" type="range" min="4" max="15" />
      </label>
      <button class="btn btn-primary" :disabled="hashing || !plain" @click="doHash">
        {{ hashing ? '计算中…' : '生成哈希' }}
      </button>
    </div>
    <div v-if="hashError" class="error-box mb-14">✗ {{ hashError }}</div>
    <template v-if="hashOut">
      <pre class="output">{{ hashOut }}</pre>
      <div class="row mt-10">
        <CopyButton class="btn btn-sm" :text="hashOut" label="复制哈希" />
        <span class="tip">cost {{ cost }} 耗时 {{ hashMs }}ms</span>
      </div>
    </template>
  </div>

  <div class="panel">
    <p class="field-label">校验</p>
    <div class="field">
      <label class="field-label" for="bc-hash">Bcrypt 哈希($2a$ / $2b$ / $2y$ 开头)</label>
      <input id="bc-hash" v-model="verifyHash" class="input" spellcheck="false" />
    </div>
    <div class="field">
      <label class="field-label" for="bc-verify">待比对原文</label>
      <input id="bc-verify" v-model="verifyPlain" class="input" spellcheck="false" @keydown.enter="doVerify" />
    </div>
    <div class="row">
      <button class="btn btn-primary" :disabled="verifying || !verifyHash || !verifyPlain" @click="doVerify">
        {{ verifying ? '校验中…' : '校验' }}
      </button>
      <span v-if="verifyResult === true" class="verify pass">✓ 匹配</span>
      <span v-else-if="verifyResult === false" class="verify fail">✗ 不匹配</span>
    </div>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
}
.verify {
  font-weight: 700;
}
.pass { color: var(--success, #16a34a); }
.fail { color: var(--danger, #dc2626); }
</style>
