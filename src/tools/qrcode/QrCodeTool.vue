<script setup>
import { onUnmounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { debounce } from '@/utils/format'
import { roundRectPath } from '@/utils/image'
import { useUrlState, shortString } from '@/utils/urlState'

const text = ref('https://example.com')
const size = ref(300)
const dark = ref('#000000')
const light = ref('#ffffff')
const dataUrl = ref('')
const error = ref('')
useUrlState([{ key: 'q', ref: text, parse: shortString(800) }])

// 中央 Logo:开启后纠错等级自动提到 H(30% 冗余),保证遮挡后仍可扫
const canvasEl = ref(null)
const logoInput = ref(null)
const logoUrl = ref('')
const logoScale = ref(22)
let logoImg = null

function pickLogo() {
  logoInput.value?.click()
}
function onLogoChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  if (logoUrl.value) URL.revokeObjectURL(logoUrl.value)
  logoUrl.value = URL.createObjectURL(f)
}
function clearLogo() {
  if (logoUrl.value) URL.revokeObjectURL(logoUrl.value)
  logoUrl.value = ''
  logoImg = null
  if (logoInput.value) logoInput.value.value = ''
}

async function generate() {
  if (!text.value.trim()) {
    dataUrl.value = ''
    return
  }
  try {
    const canvas = canvasEl.value
    await QRCode.toCanvas(canvas, text.value, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: logoUrl.value ? 'H' : 'M',
      color: { dark: dark.value, light: light.value },
    })
    if (logoImg && canvas) {
      const ctx = canvas.getContext('2d')
      const w = (canvas.width * logoScale.value) / 100
      const pad = w * 0.12
      const x = (canvas.width - w) / 2
      ctx.fillStyle = light.value
      roundRectPath(ctx, x - pad, x - pad, w + pad * 2, w + pad * 2, w * 0.18)
      ctx.fill()
      ctx.save()
      roundRectPath(ctx, x, x, w, w, w * 0.14)
      ctx.clip()
      ctx.drawImage(logoImg, x, x, w, w)
      ctx.restore()
    }
    dataUrl.value = canvas?.toDataURL('image/png') ?? ''
    error.value = ''
  } catch (e) {
    error.value = '生成失败:' + e.message
    dataUrl.value = ''
  }
}

const generateDebounced = debounce(generate, 300)
watch([text, size, dark, light, logoUrl, logoScale], () => generateDebounced(), { immediate: true })
// Logo 图片要等 onload 后再画
watch(logoUrl, (url) => {
  if (!url) return
  const img = new Image()
  img.onload = () => {
    logoImg = img
    generate()
  }
  img.src = url
})

onUnmounted(() => {
  generateDebounced.cancel()
  if (logoUrl.value) URL.revokeObjectURL(logoUrl.value)
})
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
      <div class="field" style="margin-top: 14px">
        <span class="field-label">中央 Logo(可选)</span>
        <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoChange" />
        <div class="row">
          <template v-if="!logoUrl">
            <button class="btn btn-sm" @click="pickLogo">上传 Logo 图片</button>
          </template>
          <template v-else>
            <img :src="logoUrl" class="logo-thumb" alt="Logo 预览" />
            <button class="btn btn-sm" @click="pickLogo">更换</button>
            <button class="btn btn-sm" @click="clearLogo">移除</button>
          </template>
        </div>
        <div v-if="logoUrl" class="field" style="margin-top: 10px">
          <label class="field-label">Logo 大小 {{ logoScale }}%</label>
          <input v-model.number="logoScale" type="range" min="12" max="30" step="1" style="width: 100%" />
          <p class="tip">已自动切换到 H 级纠错;Logo 越大越难扫,建议不超过 25%。</p>
        </div>
      </div>
      <p v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</p>
    </div>

    <div class="panel preview-panel">
      <canvas v-show="dataUrl" ref="canvasEl" class="qr-canvas" aria-label="二维码预览"></canvas>
      <div v-if="!dataUrl" class="qr-empty">输入内容后自动生成</div>
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
.qr-canvas {
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
.logo-thumb {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
}
</style>
