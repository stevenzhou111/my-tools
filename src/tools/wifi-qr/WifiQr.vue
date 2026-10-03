<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { debounce } from '@/utils/format'

const ssid = ref('我的Wi-Fi')
const password = ref('')
const encryption = ref('WPA')
const hidden = ref(false)
const size = ref(300)
const dataUrl = ref('')
const error = ref('')

// WiFi 二维码标准格式:特殊字符需反斜杠转义
function escapeWifi(s) {
  return s.replace(/([\\;,:"])/g, '\\$1')
}

const payload = computed(() => {
  const name = ssid.value.trim()
  if (!name) return ''
  let s = `WIFI:T:${encryption.value};S:${escapeWifi(name)};`
  if (encryption.value !== 'nopass') s += `P:${escapeWifi(password.value)};`
  if (hidden.value) s += 'H:true;'
  return s + ';'
})

async function generate() {
  if (!payload.value) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(payload.value, {
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
watch([ssid, password, encryption, hidden, size], () => generateDebounced(), { immediate: true })
onUnmounted(() => generateDebounced.cancel())
</script>

<template>
  <div class="grid-2 qr-grid">
    <div>
      <div class="field">
        <label class="field-label">Wi-Fi 名称 (SSID)</label>
        <input v-model="ssid" class="input" spellcheck="false" placeholder="路由器的 Wi-Fi 名称" />
      </div>
      <div class="field">
        <label class="field-label">加密方式</label>
        <select v-model="encryption" class="select">
          <option value="WPA">WPA / WPA2 / WPA3(最常见)</option>
          <option value="WEP">WEP(老旧路由)</option>
          <option value="nopass">无密码(开放网络)</option>
        </select>
      </div>
      <div v-if="encryption !== 'nopass'" class="field">
        <label class="field-label">Wi-Fi 密码</label>
        <input v-model="password" type="text" class="input" spellcheck="false" placeholder="无线密码" />
      </div>
      <label class="check" style="margin-bottom: 14px">
        <input v-model="hidden" type="checkbox" />隐藏网络(不广播 SSID)
      </label>
      <div class="field">
        <label class="field-label">尺寸</label>
        <select v-model.number="size" class="select">
          <option :value="200">200 × 200</option>
          <option :value="300">300 × 300</option>
          <option :value="400">400 × 400</option>
        </select>
      </div>
      <p v-if="error" class="error-box">✗ {{ error }}</p>
    </div>

    <div class="panel preview-panel">
      <img v-if="dataUrl" :src="dataUrl" class="qr-img" alt="Wi-Fi 二维码" />
      <div v-else class="tip">填写 Wi-Fi 信息后自动生成</div>
      <a v-if="dataUrl" :href="dataUrl" download="wifi-qrcode.png" class="btn btn-primary" style="margin-top: 14px">
        ⬇️ 下载 PNG(打印贴墙上)
      </a>
    </div>
  </div>

  <p class="tip" style="margin-top: 12px">
    iPhone / 安卓相机扫码后即可直接连入该 Wi-Fi,无需手动输密码;密码包含分号、冒号等符号会自动转义。
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
