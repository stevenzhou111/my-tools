<script setup>
import { ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { generateKeyPair, KEY_KINDS } from '@/utils/keygen'

/**
 * 非对称密钥生成:WebCrypto 生成 RSA / EC 密钥对,导出标准 PEM。
 * 私钥只在本地生成与展示,请自行妥善保管(本页不保存)。
 */

const kind = ref('RSA-2048')
const publicPem = ref('')
const privatePem = ref('')
const busy = ref(false)
const error = ref('')
const tookMs = ref(0)

async function generate() {
  error.value = ''
  publicPem.value = ''
  privatePem.value = ''
  busy.value = true
  const t0 = performance.now()
  try {
    const pair = await generateKeyPair(kind.value)
    publicPem.value = pair.publicPem
    privatePem.value = pair.privatePem
    tookMs.value = Math.round(performance.now() - t0)
  } catch (e) {
    error.value = '生成失败:' + e.message
  } finally {
    busy.value = false
  }
}

function download(which) {
  const pem = which === 'public' ? publicPem.value : privatePem.value
  const blob = new Blob([pem], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = which === 'public' ? 'public.pem' : 'private.pem'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="row ctrl-row">
      <label class="ctrl grow">
        <span class="field-label">密钥类型</span>
        <select v-model="kind" class="select">
          <option v-for="k in KEY_KINDS" :key="k.id" :value="k.id">{{ k.label }}</option>
        </select>
      </label>
      <button class="btn btn-primary" :disabled="busy" @click="generate">
        {{ busy ? '生成中…' : '生成密钥对' }}
      </button>
      <span v-if="tookMs" class="tip">耗时 {{ tookMs }}ms</span>
    </div>
    <p class="tip m-0 mt-8">
      用途:JWT RS/ES 签名、SSH 风格密钥、接口加解密的密钥底座(RSA 2048/4096、EC P-256/P-384)。私钥只在本页生成展示,刷新即失,请立刻保存。
    </p>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="publicPem">
    <div class="panel mb-16">
      <p class="field-label">公钥(SPKI)</p>
      <pre class="output">{{ publicPem }}</pre>
      <div class="row mt-10">
        <CopyButton class="btn btn-sm" :text="publicPem" label="复制公钥" />
        <button class="btn btn-sm" @click="download('public')"><AppIcon name="download" :size="14" />下载 public.pem</button>
      </div>
    </div>

    <div class="panel private-panel">
      <p class="field-label">私钥(PKCS#8)— ⚠️ 保密,勿提交到仓库</p>
      <pre class="output">{{ privatePem }}</pre>
      <div class="row mt-10">
        <CopyButton class="btn btn-sm" :text="privatePem" label="复制私钥" />
        <button class="btn btn-sm" @click="download('private')"><AppIcon name="download" :size="14" />下载 private.pem</button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
}
.private-panel {
  border-color: color-mix(in srgb, var(--danger, #dc2626) 35%, var(--border));
}
.output {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
