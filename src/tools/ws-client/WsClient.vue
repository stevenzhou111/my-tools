<script setup>
import { onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useCopy } from '@/utils/useCopy'

/**
 * WebSocket 调试客户端:连接任意 ws://wss:// 地址,收发文本帧并记录日志。
 * 面向接口调试;二进制帧显示字节数。连接由本页直接发起(无代理)。
 */

const url = ref('wss://echo.websocket.events')
const input = ref('')
const connected = ref(false)
const connecting = ref(false)
const logs = ref([]) // { at, dir: 'open'|'close'|'error'|'in'|'out', text }
const logEl = ref(null)
const { copiedKey, copy } = useCopy()

let ws = null

function log(dir, text) {
  logs.value.push({ at: new Date().toLocaleTimeString('zh-CN', { hour12: false }), dir, text })
  // 新日志到达时若视窗停在底部则自动跟随
  requestAnimationFrame(() => {
    const el = logEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function connect() {
  const target = url.value.trim()
  if (!/^wss?:\/\//i.test(target)) {
    log('error', '地址需以 ws:// 或 wss:// 开头')
    return
  }
  disconnect(true)
  connecting.value = true
  try {
    ws = new WebSocket(target)
  } catch (e) {
    connecting.value = false
    log('error', '创建连接失败:' + e.message)
    return
  }
  ws.binaryType = 'blob'
  ws.onopen = () => {
    connected.value = true
    connecting.value = false
    log('open', `已连接 ${target}`)
  }
  ws.onmessage = (e) => {
    log('in', typeof e.data === 'string' ? e.data : `二进制帧 ${e.data.size} 字节`)
  }
  ws.onerror = () => {
    log('error', '连接出错(地址不可达 / 协议不符 / 被拒绝)')
  }
  ws.onclose = (e) => {
    connected.value = false
    connecting.value = false
    log('close', `连接关闭(code ${e.code}${e.reason ? ':' + e.reason : ''})`)
  }
}

function disconnect(silent = false) {
  if (ws) {
    const closing = ws
    ws = null
    connected.value = false
    try { closing.close() } catch { /* 忽略 */ }
    if (!silent) log('close', '已主动断开')
  }
}

function send() {
  if (!connected.value || !input.value) return
  const text = input.value
  ws.send(text)
  log('out', text)
  input.value = ''
}

function clearLog() {
  logs.value = []
}

onUnmounted(() => disconnect(true))
</script>

<template>
  <div class="panel mb-16">
    <div class="row ctrl-row">
      <label class="grow conn-row">
        <span class="field-label">服务地址</span>
        <input v-model="url" class="input" spellcheck="false" placeholder="wss://example.com/ws" @keydown.enter="connect" />
      </label>
      <button v-if="!connected" class="btn btn-primary" :disabled="connecting" @click="connect">
        <AppIcon name="plug-zap" :size="15" />{{ connecting ? '连接中…' : '连接' }}
      </button>
      <button v-else class="btn" @click="disconnect()"><AppIcon name="cable" :size="15" />断开</button>
      <span class="status" :class="{ on: connected }">{{ connected ? '已连接' : connecting ? '连接中' : '未连接' }}</span>
    </div>
    <p class="tip m-0 mt-8">
      可试公共回显服务 wss://echo.websocket.events(发什么回什么)。本工具直接从你的浏览器发起连接,不加代理;跨域由目标服务自己允许。
    </p>
  </div>

  <div class="panel mb-16">
    <div class="row ctrl-row">
      <label class="grow conn-row">
        <span class="field-label">消息</span>
        <input v-model="input" class="input" spellcheck="false" :disabled="!connected" @keydown.enter="send" />
      </label>
      <button class="btn btn-primary" :disabled="!connected" @click="send">发送</button>
    </div>
  </div>

  <div class="panel">
    <div class="row mb-10">
      <span class="field-label m-0">日志({{ logs.length }})</span>
      <button class="btn btn-sm" @click="clearLog"><AppIcon name="trash-2" :size="14" />清空</button>
    </div>
    <div ref="logEl" class="log" role="log" aria-live="polite">
      <p v-if="!logs.length" class="tip m-0">暂无日志。先连接,再发送消息。</p>
      <div v-for="(l, i) in logs" :key="i" class="log-line" :class="l.dir">
        <span class="at">{{ l.at }}</span>
        <span class="dir">{{ { open: 'OPEN', close: 'CLOSE', error: 'ERROR', in: '↓ 接收', out: '↑ 发送' }[l.dir] }}</span>
        <span class="text">{{ l.text }}</span>
      </div>
    </div>
    <div v-if="logs.length" class="row mt-10">
      <button class="btn btn-sm" @click="copy('log', logs.map((l) => `[${l.at}] ${l.dir.toUpperCase()} ${l.text}`).join('\n'))">
        {{ copiedKey === 'log' ? '✓ 已复制' : '复制日志' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  gap: 12px;
}
.conn-row {
  display: block;
}
.status {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  white-space: nowrap;
}
.status.on {
  color: var(--success, #16a34a);
  border-color: var(--success, #16a34a);
}
.log {
  max-height: 320px;
  overflow: auto;
  font-family: var(--mono, monospace);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.log-line {
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.log-line .at { color: var(--muted); flex-shrink: 0; }
.log-line .dir { flex-shrink: 0; font-weight: 600; }
.log-line.in .dir { color: var(--accent); }
.log-line.out .dir { color: var(--muted); }
.log-line.error .dir, .log-line.error .text { color: var(--danger, #dc2626); }
.log-line.open .dir, .log-line.close .dir { color: var(--muted); }
.text { word-break: break-all; }
</style>
