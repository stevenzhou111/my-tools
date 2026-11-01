<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { onUnmounted, ref } from 'vue'

const STORAGE_KEY = 'toolbox-metronome'

const bpm = ref(96)
const beatsPerBar = ref(4)
const running = ref(false)
const activeBeat = ref(-1)
const error = ref('')

let ctx = null
let timer = null
let nextNoteTime = 0
let beat = 0
let taps = []

// 强拍高音、弱拍低音;短促的正弦 click 足够清晰
function click(time, strong) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = strong ? 1400 : 880
  gain.gain.setValueAtTime(strong ? 0.5 : 0.3, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.08)
}

// 前瞻式调度:每 25ms 把未来 0.1s 内的拍子排进音频时钟,避免 setInterval 抖动
function tick() {
  const interval = 60 / bpm.value
  while (nextNoteTime < ctx.currentTime + 0.1) {
    const thisBeat = beat % beatsPerBar.value
    click(nextNoteTime, thisBeat === 0)
    const delay = Math.max(0, (nextNoteTime - ctx.currentTime) * 1000)
    setTimeout(() => {
      activeBeat.value = thisBeat
    }, delay)
    beat++
    nextNoteTime += interval
  }
}

async function start() {
  error.value = ''
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)()
    await ctx.resume()
  } catch {
    return (error.value = '无法启动音频,请检查浏览器设置')
  }
  running.value = true
  beat = 0
  activeBeat.value = -1
  nextNoteTime = ctx.currentTime + 0.05
  tick()
  timer = setInterval(tick, 25)
  persist()
}

function stop() {
  running.value = false
  clearInterval(timer)
  timer = null
  activeBeat.value = -1
  persist()
}

function tap() {
  const now = performance.now()
  // 2 秒内的点击才有效,取最近 4 次平均
  taps = [...taps.filter((t) => now - t < 2000), now]
  if (taps.length >= 2) {
    const gaps = taps.slice(1).map((t, i) => t - taps[i])
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length
    bpm.value = Math.min(240, Math.max(30, Math.round(60000 / avg)))
    if (running.value) {
      stop()
      start()
    }
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bpm: bpm.value, beatsPerBar: beatsPerBar.value }))
  } catch {
    /* 隐私模式忽略 */
  }
}

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (p) {
      if (Number.isFinite(p.bpm)) bpm.value = Math.min(240, Math.max(30, p.bpm))
      if ([2, 3, 4].includes(p.beatsPerBar)) beatsPerBar.value = p.beatsPerBar
    }
  } catch {
    /* ignore */
  }
}
loadPrefs()

onUnmounted(() => {
  stop()
  ctx?.close().catch(() => {})
  ctx = null
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    练琴、合唱排练用的节拍器:强拍高音、弱拍低音,支持 2/4、3/4、4/4 拍号与「跟拍测速」。BPM 与拍号会自动记住。
  </p>

  <div class="panel metro-panel">
    <div class="dots" role="img" :aria-label="`每小节 ${beatsPerBar} 拍`">
      <span
        v-for="i in beatsPerBar"
        :key="i"
        class="dot"
        :class="{ active: running && activeBeat === i - 1, strong: i === 1 }"
      ></span>
    </div>

    <div class="bpm-line">
      <button class="btn btn-sm" aria-label="减慢" @click="bpm = Math.max(30, bpm - 4); persist()">−</button>
      <span class="bpm-num">{{ bpm }}</span>
      <button class="btn btn-sm" aria-label="加快" @click="bpm = Math.min(240, bpm + 4); persist()">+</button>
      <span class="tip">BPM</span>
    </div>

    <input
      v-model.number="bpm"
      type="range"
      min="30"
      max="240"
      aria-label="调节 BPM"
      style="width: 100%; max-width: 360px"
      @change="persist(); if (running) { stop(); start() }"
    />

    <div class="row" style="margin-top: 14px">
      <label class="ctrl">
        <span class="field-label" for="metro-bar">拍号</span>
        <select id="metro-bar" v-model.number="beatsPerBar" class="select" style="width: 100px" @change="persist(); if (running) { stop(); start() }">
          <option :value="2">2/4</option>
          <option :value="3">3/4</option>
          <option :value="4">4/4</option>
        </select>
      </label>
      <button class="btn btn-primary" @click="running ? stop() : start()">{{ running ? '⏹ 停止' : '▶ 开始' }}</button>
      <button class="btn" @click="tap()"><AppIcon name="mouse-pointer-2" :size="15" /> 跟拍测速</button>
    </div>

    <div v-if="error" class="error-box mt-12">✗ {{ error }}</div>
  </div>
</template>

<style scoped>
.metro-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px;
}
.dots {
  display: flex;
  gap: 14px;
}
.dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-soft);
  cursor: pointer;
  transition: transform 0.08s, background 0.08s;
}
.dot.strong {
  border-color: var(--accent);
}
.dot.active {
  background: var(--accent);
  border-color: var(--accent);
  transform: scale(1.25);
}
.dot.active.strong {
  background: var(--danger);
  border-color: var(--danger);
}
.bpm-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bpm-num {
  font-family: var(--mono);
  font-size: 34px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 84px;
  text-align: center;
}
</style>
