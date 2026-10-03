<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { useCopy } from '@/utils/useCopy'
import { debounce } from '@/utils/format'
import { useUrlState, shortString } from '@/utils/urlState'

const url = ref('https://example.com')
const size = ref(300)
const dataUrl = ref('')
const error = ref('')
const { copiedKey, copy } = useCopy()
useUrlState([{ key: 'u', ref: url, parse: shortString(500) }])

// 自动补全协议头,避免扫码后当作相对路径;协议相对地址(//x)也归到 https
const normalized = computed(() => {
  const s = url.value.trim()
  if (!s) return ''
  if (s.startsWith('//')) return `https:${s}`
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s) ? s : `https://${s}`
})

async function generate() {
  const target = normalized.value
  if (!target) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(target, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
    error.value = ''
  } catch (e) {
    error.value = '生成失败:' + e.message
    dataUrl.value = ''
  }
}

const generateDebounced = debounce(generate, 300)
watch([url, size], () => generateDebounced(), { immediate: true })
onUnmounted(() => generateDebounced.cancel())
</script>

<template>
  <div class="grid-2 qr-grid">
    <div>
      <div class="field">
        <label class="field-label">网址(自动补全 https://)</label>
        <textarea v-model="url" class="textarea" rows="3" spellcheck="false"></textarea>
      </div>
      <div class="field">
        <label class="field-label">尺寸</label>
        <select v-model.number="size" class="select">
          <option :value="200">200 × 200</option>
          <option :value="300">300 × 300</option>
          <option :value="400">400 × 400</option>
          <option :value="500">500 × 500</option>
        </select>
      </div>
      <p v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</p>
    </div>

    <div class="panel preview-panel">
      <img v-if="dataUrl" :src="dataUrl" class="qr-img" alt="网址二维码" />
      <div v-else class="tip">输入网址后自动生成</div>
      <a v-if="dataUrl" :href="dataUrl" download="url-qrcode.png" class="btn btn-primary" style="margin-top: 14px">
        ⬇️ 下载 PNG
      </a>
      <button
        v-if="dataUrl"
        class="btn btn-sm"
        style="margin-top: 10px"
        @click="copy('url', normalized)"
      >
        {{ copiedKey === 'url' ? '✓ 链接已复制' : '复制链接' }}
      </button>
    </div>
  </div>

  <p class="tip" style="margin-top: 12px">
    手机扫码直接打开网页;需要传文字、Wi-Fi 信息请用「二维码生成」或「WiFi 转二维码」。
  </p>
</template>

<style scoped>
.qr-grid {
  align-items: start;
}
.preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 300px;
  justify-content: center;
}
.qr-img {
  width: 100%;
  max-width: 300px;
  height: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
</style>
