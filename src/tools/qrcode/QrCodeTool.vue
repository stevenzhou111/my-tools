<script setup>
import { onUnmounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { debounce } from '@/utils/format'
import { useUrlState, shortString } from '@/utils/urlState'

const text = ref('https://example.com')
const size = ref(300)
const dark = ref('#000000')
const light = ref('#ffffff')
const dataUrl = ref('')
const error = ref('')
useUrlState([{ key: 'q', ref: text, parse: shortString(800) }])

async function generate() {
  if (!text.value.trim()) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(text.value, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: dark.value, light: light.value },
    })
    error.value = ''
  } catch (e) {
    error.value = '生成失败:' + e.message
    dataUrl.value = ''
  }
}

const generateDebounced = debounce(generate, 300)
watch([text, size, dark, light], () => generateDebounced(), { immediate: true })

onUnmounted(() => generateDebounced.cancel())
</script>

<template>
  <div class="grid-2 qr-grid">
    <div>
      <div class="field">
        <label class="field-label">文本或链接</label>
        <textarea
          v-model="text"
          v-draft="'qrcode-text'"
          class="textarea"
          rows="5"
          placeholder="输入任意文本、网址、Wi-Fi 信息…"
          spellcheck="false"
        ></textarea>
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
      <div class="row">
        <label class="ctrl">
          <span class="field-label">前景色</span>
          <input v-model="dark" type="color" class="input color-input" />
        </label>
        <label class="ctrl">
          <span class="field-label">背景色</span>
          <input v-model="light" type="color" class="input color-input" />
        </label>
      </div>
      <p v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</p>
    </div>

    <div class="panel preview-panel">
      <img
        v-if="dataUrl"
        :src="dataUrl"
        class="qr-img"
        alt="二维码"
        width="300"
        height="300"
      />
      <div v-else class="qr-empty">输入内容后自动生成</div>
      <a v-if="dataUrl" :href="dataUrl" download="qrcode.png" class="btn btn-primary" style="margin-top: 14px">
        ⬇️ 下载 PNG
      </a>
    </div>
  </div>
</template>

<style scoped>
.qr-grid {
  align-items: start;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 120px;
}
.color-input {
  height: 40px;
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
.qr-empty {
  color: var(--muted);
  padding: 60px 0;
}
</style>
