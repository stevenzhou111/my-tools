<script setup>
import { computed, onUnmounted, ref } from 'vue'

/**
 * 浏览器 / 屏幕信息:本地只读采集 navigator 与 screen 常用字段 + 能力探测,
 * 排查环境问题、报 bug 时贴给对方用。零依赖,不上传,视口与在线状态实时刷新。
 */

const viewport = ref({ w: window.innerWidth, h: window.innerHeight })
const online = ref(navigator.onLine)
const onResize = () => { viewport.value = { w: window.innerWidth, h: window.innerHeight } }
const onOnline = () => { online.value = true }
const onOffline = () => { online.value = false }
window.addEventListener('resize', onResize)
window.addEventListener('online', onOnline)
window.addEventListener('offline', onOffline)
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
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

const ua = ref(navigator.userAgent)
const platform = computed(() => navigator.userAgentData?.platform || navigator.platform || '(未知)')
const mem = navigator.deviceMemory
</script>

<template>
  <div class="two-col">
    <div class="panel">
      <p class="field-label">屏幕</p>
      <table class="info-table">
        <tbody>
          <tr><th>物理分辨率</th><td>{{ screen.width }} × {{ screen.height }}</td></tr>
          <tr><th>可用区域</th><td>{{ screen.availWidth }} × {{ screen.availHeight }}</td></tr>
          <tr><th>当前视口</th><td>{{ viewport.w }} × {{ viewport.h }}(实时)</td></tr>
          <tr><th>设备像素比</th><td>{{ window.devicePixelRatio }}</td></tr>
          <tr><th>色深</th><td>{{ screen.colorDepth }} 位</td></tr>
          <tr><th>屏幕方向</th><td>{{ screen.orientation?.type || '(未知)' }}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <p class="field-label">浏览器与环境</p>
      <table class="info-table">
        <tbody>
          <tr><th>平台</th><td>{{ platform }}</td></tr>
          <tr><th>语言</th><td>{{ navigator.language }}<span v-if="navigator.languages?.length" class="tip">({{ navigator.languages.join(' / ') }})</span></td></tr>
          <tr><th>网络状态</th><td>{{ online ? '在线' : '离线' }}</td></tr>
          <tr><th>CPU 逻辑核</th><td>{{ navigator.hardwareConcurrency || '(未提供)' }}</td></tr>
          <tr><th>内存概览</th><td>{{ mem ? mem + ' GB' : '(浏览器未提供)' }}</td></tr>
          <tr><th>Cookie</th><td>{{ navigator.cookieEnabled ? '启用' : '禁用' }}</td></tr>
          <tr><th>触摸屏</th><td>{{ navigator.maxTouchPoints ? `支持(${navigator.maxTouchPoints} 点)` : '不支持' }}</td></tr>
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
    <pre class="output">{{ ua }}</pre>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="ua" label="复制 UA" />
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
