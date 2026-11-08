<script setup>
import { computed, onUnmounted, ref } from 'vue'

/**
 * 浏览器 / 屏幕信息:本地只读采集 navigator 与 screen 常用字段 + 能力探测,
 * 排查环境问题、报 bug 时贴给对方用。零依赖,不上传,视口与在线状态实时刷新。
 * 注意:Vue 模板访问不到 window/screen/navigator 全局,全部经 setup 暴露。
 */

const viewport = ref({ w: window.innerWidth, h: window.innerHeight })
const online = ref(navigator.onLine)
const dpr = ref(window.devicePixelRatio)

const screenInfo = ref({
  width: screen.width,
  height: screen.height,
  availWidth: screen.availWidth,
  availHeight: screen.availHeight,
  colorDepth: screen.colorDepth,
  orientation: screen.orientation?.type || '(未知)',
})

const env = ref({
  platform: navigator.userAgentData?.platform || navigator.platform || '(未知)',
  language: navigator.language,
  languages: navigator.languages || [],
  hardwareConcurrency: navigator.hardwareConcurrency || 0,
  deviceMemory: navigator.deviceMemory || 0,
  cookieEnabled: navigator.cookieEnabled,
  maxTouchPoints: navigator.maxTouchPoints,
  ua: navigator.userAgent,
})

function refresh() {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
  dpr.value = window.devicePixelRatio
}
const onOnline = () => { online.value = true }
const onOffline = () => { online.value = false }
window.addEventListener('resize', refresh)
window.addEventListener('online', onOnline)
window.addEventListener('offline', onOffline)
onUnmounted(() => {
  window.removeEventListener('resize', refresh)
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

function tryGet(fn) {
  try { return fn() } catch { return false }
}

const caps = [
  { key: 'WebGL 2', value: tryGet(() => !!document.createElement('canvas').getContext('webgl2')) },
  { key: 'WebGPU', value: typeof navigator.gpu !== 'undefined' },
  { key: 'WebAssembly', value: typeof WebAssembly !== 'undefined' },
  { key: '剪贴板读取', value: typeof navigator.clipboard?.readText === 'function' },
  { key: '屏幕分享', value: typeof navigator.mediaDevices?.getDisplayMedia === 'function' },
  { key: '摄像头/麦克风', value: typeof navigator.mediaDevices?.getUserMedia === 'function' },
  { key: 'Service Worker', value: 'serviceWorker' in navigator },
  { key: '网页分享', value: typeof navigator.share === 'function' },
  { key: '通知', value: typeof Notification !== 'undefined' },
  { key: '触摸屏', value: navigator.maxTouchPoints > 0 },
]

const summaryText = computed(() =>
  `平台 ${env.value.platform} · 视口 ${viewport.value.w}×${viewport.value.h} · DPR ${dpr.value} · 屏幕 ${screenInfo.value.width}×${screenInfo.value.height} · ${online.value ? '在线' : '离线'}`,
)
</script>

<template>
  <div class="two-col">
    <div class="panel">
      <p class="field-label">屏幕</p>
      <table class="info-table">
        <tbody>
          <tr><th>物理分辨率</th><td>{{ screenInfo.width }} × {{ screenInfo.height }}</td></tr>
          <tr><th>可用区域</th><td>{{ screenInfo.availWidth }} × {{ screenInfo.availHeight }}</td></tr>
          <tr><th>当前视口</th><td>{{ viewport.w }} × {{ viewport.h }}(实时)</td></tr>
          <tr><th>设备像素比</th><td>{{ dpr }}</td></tr>
          <tr><th>色深</th><td>{{ screenInfo.colorDepth }} 位</td></tr>
          <tr><th>屏幕方向</th><td>{{ screenInfo.orientation }}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <p class="field-label">浏览器与环境</p>
      <table class="info-table">
        <tbody>
          <tr><th>平台</th><td>{{ env.platform }}</td></tr>
          <tr><th>语言</th><td>{{ env.language }}<span v-if="env.languages.length" class="tip">({{ env.languages.join(' / ') }})</span></td></tr>
          <tr><th>网络状态</th><td>{{ online ? '在线' : '离线' }}</td></tr>
          <tr><th>CPU 逻辑核</th><td>{{ env.hardwareConcurrency || '(未提供)' }}</td></tr>
          <tr><th>内存概览</th><td>{{ env.deviceMemory ? env.deviceMemory + ' GB' : '(浏览器未提供)' }}</td></tr>
          <tr><th>Cookie</th><td>{{ env.cookieEnabled ? '启用' : '禁用' }}</td></tr>
          <tr><th>触摸屏</th><td>{{ env.maxTouchPoints ? `支持(${env.maxTouchPoints} 点)` : '不支持' }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel my-14">
    <p class="field-label">能力探测</p>
    <div class="caps">
      <span v-for="c in caps" :key="c.key" class="cap" :class="{ on: c.value }">
        {{ c.value ? '✓' : '✗' }} {{ c.key }}
      </span>
    </div>
  </div>

  <div class="panel mb-16">
    <p class="field-label">User-Agent(已不推荐作为判断依据,仅供排查)</p>
    <pre class="output">{{ env.ua }}</pre>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="env.ua" label="复制 UA" />
      <CopyButton class="btn btn-sm" :text="summaryText" label="复制概要" />
    </div>
  </div>

  <p class="tip">全部信息只读采集、不上传;报 bug 时把这一页复制给对方,能省一轮来回。</p>
</template>

<style scoped>
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.info-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  padding: 5px 10px 5px 0;
  white-space: nowrap;
  width: 40%;
}
.info-table td { padding: 5px 0; word-break: break-all; }
.caps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cap {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.cap.on {
  color: var(--success, #16a34a);
  border-color: color-mix(in srgb, var(--success, #16a34a) 40%, var(--border));
}
</style>
