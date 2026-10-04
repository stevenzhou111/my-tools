<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

// 两个模式共用「基于真实时间戳」的计时,后台标签页被节流也不会越走越慢
const tab = ref('stopwatch')

// ---------- 快捷键(仅秒表页签):空格 开始/暂停,L 计次,R 重置 ----------
function isTyping(e) {
  const t = e.target
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}
function onKey(e) {
  if (isTyping(e) || e.isComposing) return
  if (e.code === 'Space') {
    // 空格同时会触发焦点按钮,先吃掉默认行为避免双重切换
    if (e.target?.closest?.('button')) e.preventDefault()
    if (tab.value === 'stopwatch') (swRunning.value ? swPause : swStart)()
  } else if (e.code === 'KeyL') {
    if (tab.value === 'stopwatch' && swRunning.value) swLap()
  } else if (e.code === 'KeyR') {
    if (tab.value === 'stopwatch') swReset()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

// ---------- 秒表 ----------
const swRunning = ref(false)
const swElapsed = ref(0)
const laps = ref([])
let swStartAt = 0
let swAcc = 0
let swTimer = null

function swStart() {
  swStartAt = performance.now()
  swTimer = setInterval(() => {
    swElapsed.value = swAcc + (performance.now() - swStartAt)
  }, 33)
  swRunning.value = true
}
function swPause() {
  clearInterval(swTimer)
  swAcc += performance.now() - swStartAt
  swElapsed.value = swAcc
  swRunning.value = false
}
function swReset() {
  clearInterval(swTimer)
  swRunning.value = false
  swAcc = 0
  swElapsed.value = 0
  laps.value = []
}
function swLap() {
  const total = swElapsed.value
  const split = total - (laps.value[0]?.total ?? 0)
  laps.value.unshift({ total, split })
}

function fmtStopwatch(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const lapStats = computed(() => {
  if (laps.value.length < 2) return {}
  const splits = laps.value.map((l) => l.split)
  return { best: splits.indexOf(Math.min(...splits)), worst: splits.indexOf(Math.max(...splits)) }
})

// ---------- 倒计时 ----------
const cdRunning = ref(false)
const cdPaused = ref(false)
const cdDone = ref(false)
const cdH = ref(0)
const cdM = ref(5)
const cdS = ref(0)
const cdRemaining = ref(0)
let cdEndAt = 0
let cdTimer = null

const PRESETS = [
  { label: '1 分钟', ms: 60_000 },
  { label: '3 分钟', ms: 180_000 },
  { label: '5 分钟', ms: 300_000 },
  { label: '10 分钟', ms: 600_000 },
  { label: '25 分钟', ms: 1_500_000 },
]

function cdTotal() {
  return ((cdH.value | 0) * 3600 + (cdM.value | 0) * 60 + (cdS.value | 0)) * 1000
}
function cdStart() {
  const total = cdTotal()
  if (total <= 0) return
  cdDone.value = false
  cdRemaining.value = total
  cdEndAt = Date.now() + total
  cdTimer = setInterval(cdTick, 200)
  cdRunning.value = true
  cdPaused.value = false
}
function cdTick() {
  cdRemaining.value = Math.max(0, cdEndAt - Date.now())
  if (cdRemaining.value === 0) cdFinish()
}
function cdPause() {
  clearInterval(cdTimer)
  cdRunning.value = false
  cdPaused.value = true
}
function cdResume() {
  cdEndAt = Date.now() + cdRemaining.value
  cdTimer = setInterval(cdTick, 200)
  cdRunning.value = true
  cdPaused.value = false
}
function cdReset() {
  clearInterval(cdTimer)
  cdRunning.value = false
  cdPaused.value = false
  cdDone.value = false
  cdRemaining.value = 0
}
function cdFinish() {
  clearInterval(cdTimer)
  cdRunning.value = false
  cdPaused.value = false
  cdDone.value = true
  beep()
}

// 三短一长提示音, AudioContext 用后即关
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [880, 880, 880, 1174]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t0 = ctx.currentTime + i * 0.28
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.001, t0)
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + (i === 3 ? 0.7 : 0.22))
      osc.connect(gain).connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 0.8)
    })
    setTimeout(() => ctx.close(), 1500)
  } catch {
    // 无声环境(无音频设备)忽略
  }
}

function fmtCountdown(ms) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const cdProgress = computed(() => {
  const total = cdTotal() || 1
  if (cdDone.value) return 0
  return Math.min(100, Math.max(0, ((total - cdRemaining.value) / total) * 100))
})

onUnmounted(() => {
  clearInterval(swTimer)
  clearInterval(cdTimer)
})
</script>

<template>
  <div class="row" style="margin-bottom: 18px" role="tablist">
    <button
      class="btn"
      :class="{ 'btn-primary': tab === 'stopwatch' }"
      role="tab"
      :aria-selected="tab === 'stopwatch'"
      @click="tab = 'stopwatch'"
    >
      ⏱️ 秒表
    </button>
    <button
      class="btn"
      :class="{ 'btn-primary': tab === 'countdown' }"
      role="tab"
      :aria-selected="tab === 'countdown'"
      @click="tab = 'countdown'"
    >
      ⏳ 倒计时
    </button>
  </div>

  <!-- 秒表 -->
  <section v-if="tab === 'stopwatch'">
    <div class="panel" style="text-align: center; padding: 30px 18px">
      <div class="clock-display" aria-live="off">{{ fmtStopwatch(swElapsed) }}</div>
      <div class="row" style="justify-content: center; margin-top: 22px">
        <button v-if="!swRunning" class="btn btn-primary" @click="swStart">
          {{ swElapsed > 0 ? '▶ 继续' : '▶ 开始' }}
        </button>
        <button v-else class="btn btn-primary" @click="swPause">⏸ 暂停</button>
        <button class="btn" :disabled="!swRunning" @click="swLap">🏁 计次</button>
        <button class="btn" :disabled="swElapsed === 0" @click="swReset">↺ 重置</button>
      </div>
      <p class="tip" style="margin-top: 12px">快捷键:空格 开始/暂停 · L 计次 · R 重置(输入框内不生效)</p>
    </div>

    <div v-if="laps.length" class="panel" style="margin-top: 14px">
      <div class="row" style="justify-content: space-between">
        <span class="field-label" style="margin: 0">计次({{ laps.length }})</span>
        <span class="tip">🟢 最快 · 🔴 最慢</span>
      </div>
      <div class="lap-list" style="margin-top: 8px">
        <div v-for="(lap, i) in laps" :key="i" class="lap-row">
          <span class="tip">#{{ laps.length - i }}</span>
          <span class="lap-split" :class="{ best: lapStats.best === i, worst: lapStats.worst === i }">
            +{{ fmtStopwatch(lap.split) }}
          </span>
          <span class="lap-total">{{ fmtStopwatch(lap.total) }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 倒计时 -->
  <section v-else>
    <div class="panel" style="text-align: center; padding: 30px 18px">
      <template v-if="!cdRunning && !cdPaused && !cdDone">
        <div class="row" style="justify-content: center; gap: 8px">
          <input v-model.number="cdH" class="input cd-input" type="number" min="0" max="99" aria-label="小时" />
          <span class="cd-unit">时</span>
          <input v-model.number="cdM" class="input cd-input" type="number" min="0" max="59" aria-label="分钟" />
          <span class="cd-unit">分</span>
          <input v-model.number="cdS" class="input cd-input" type="number" min="0" max="59" aria-label="秒" />
          <span class="cd-unit">秒</span>
        </div>
        <div class="row" style="justify-content: center; margin-top: 14px">
          <button v-for="p in PRESETS" :key="p.ms" class="btn btn-sm" @click="cdH = 0; cdM = p.ms / 60000; cdS = 0">
            {{ p.label }}
          </button>
        </div>
        <p v-if="cdTotal() <= 0" class="tip" style="margin-top: 12px">请先设置时长</p>
      </template>
      <template v-else>
        <div class="clock-display" :class="{ 'cd-done': cdDone }" role="timer" aria-live="off">
          {{ cdDone ? '时间到!' : fmtCountdown(cdRemaining) }}
        </div>
        <div v-if="!cdDone" class="progress-track" aria-hidden="true">
          <div class="progress-fill" :style="{ width: cdProgress + '%' }" />
        </div>
      </template>
      <div class="row" style="justify-content: center; margin-top: 22px">
        <template v-if="cdDone">
          <button class="btn btn-primary" @click="cdReset">↺ 再来一次</button>
        </template>
        <template v-else-if="!cdRunning && !cdPaused">
          <button class="btn btn-primary" :disabled="cdTotal() <= 0" @click="cdStart">▶ 开始</button>
        </template>
        <template v-else-if="cdRunning">
          <button class="btn btn-primary" @click="cdPause">⏸ 暂停</button>
          <button class="btn" @click="cdReset">↺ 重置</button>
        </template>
        <template v-else>
          <button class="btn btn-primary" @click="cdResume">▶ 继续</button>
          <button class="btn" @click="cdReset">↺ 重置</button>
        </template>
      </div>
    </div>
    <p class="tip" style="margin-top: 10px">
      计时基于系统时钟而非累计间隔,把页面切到后台或电脑休眠后恢复,结果依然准确;结束后播放提示音。
    </p>
  </section>
</template>

<style scoped>
.clock-display {
  font-family: var(--mono);
  font-size: clamp(38px, 8vw, 64px);
  font-weight: 700;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
}
.clock-display.cd-done {
  color: var(--accent);
}
.cd-input {
  width: 84px;
  text-align: center;
  font-size: 20px;
  font-family: var(--mono);
}
.cd-unit {
  color: var(--muted);
  margin-right: 6px;
}
.lap-list {
  max-height: 320px;
  overflow: auto;
}
.lap-row {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 7px 4px;
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 15px;
}
.lap-row:last-child {
  border-bottom: none;
}
.lap-split {
  flex: 1;
  text-align: right;
}
.lap-total {
  width: 120px;
  text-align: right;
  color: var(--muted);
}
.lap-split.best {
  color: #16a34a;
}
.lap-split.worst {
  color: var(--danger);
}
.progress-track {
  height: 8px;
  border-radius: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  margin: 18px auto 0;
  max-width: 420px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-grad);
  transition: width 0.2s linear;
}
</style>
