<script setup>
import { computed, onUnmounted, ref } from 'vue'

const workMin = ref(25)
const restMin = ref(5)
const phase = ref('work') // work | rest
const remaining = ref(25 * 60)
const running = ref(false)
const completed = ref(0)
let timer = null
let phaseEnd = 0 // 完成时间戳,基于真实时钟,避免后台标签页被节流后倒计时变慢

const total = computed(() => (phase.value === 'work' ? workMin.value : restMin.value) * 60)
const progress = computed(() => 1 - remaining.value / total.value)
const mmss = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const soundBlocked = ref(false)

function beep() {
  try {
    const ctx = new AudioContext()
    const notes = phase.value === 'work' ? [660, 660, 880] : [880, 660]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.25 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.22)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.25)
      osc.stop(ctx.currentTime + i * 0.25 + 0.25)
    })
    // 播完释放,避免 AudioContext 逐渐耗尽浏览器配额
    setTimeout(() => ctx.close(), notes.length * 250 + 600)
  } catch {
    // 自动播放策略:未经交互前 AudioContext 会被拦截。明确告知用户,而不是安静地没声音
    soundBlocked.value = true
  }
}

function stopTimer() {
  clearInterval(timer)
  timer = null
}

function startTimer() {
  phaseEnd = Date.now() + remaining.value * 1000
  timer = setInterval(tick, 250)
}

function tick() {
  remaining.value = Math.max(0, Math.round((phaseEnd - Date.now()) / 1000))
  if (remaining.value <= 0) {
    stopTimer()
    beep()
    if (phase.value === 'work') {
      completed.value++
      phase.value = 'rest'
      remaining.value = restMin.value * 60
    } else {
      phase.value = 'work'
      remaining.value = workMin.value * 60
    }
    startTimer()
  }
}

function toggle() {
  running.value = !running.value
  if (running.value) startTimer()
  else stopTimer()
}

function reset() {
  running.value = false
  clearInterval(timer)
  timer = null
  phase.value = 'work'
  remaining.value = workMin.value * 60
}

function setPhase(p) {
  running.value = false
  clearInterval(timer)
  timer = null
  phase.value = p
  remaining.value = (p === 'work' ? workMin.value : restMin.value) * 60
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="panel pomodoro">
    <div class="phase-row">
      <button class="btn btn-sm" :class="{ active: phase === 'work' }" @click="setPhase('work')">🍅 专注</button>
      <button class="btn btn-sm" :class="{ active: phase === 'rest' }" @click="setPhase('rest')">☕ 休息</button>
      <span class="tip" style="margin-left: auto">已完成 {{ completed }} 个番茄 🍅</span>
    </div>

    <p v-if="soundBlocked" class="tip" role="status">🔇 提示音被浏览器拦截(自动播放策略):与页面交互一次(比如点一下按钮)后即可正常响铃。</p>

    <div class="dial-wrap">
      <svg viewBox="0 0 200 200" class="dial">
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--bg-soft)" stroke-width="12" />
        <circle
          cx="100" cy="100" r="88" fill="none"
          :stroke="phase === 'work' ? '#ef4444' : '#10b981'"
          stroke-width="12" stroke-linecap="round"
          :stroke-dasharray="2 * Math.PI * 88"
          :stroke-dashoffset="2 * Math.PI * 88 * (1 - progress)"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dashoffset 0.5s linear"
        />
      </svg>
      <div class="dial-center">
        <div class="time" :class="phase">{{ mmss }}</div>
        <div class="phase-label">{{ phase === 'work' ? '专注中' : '休息中' }}</div>
      </div>
    </div>

    <div class="row" style="justify-content: center">
      <button class="btn btn-primary" style="min-width: 110px" @click="toggle">
        {{ running ? '⏸ 暂停' : remaining === total ? '▶ 开始' : '▶ 继续' }}
      </button>
      <button class="btn" @click="reset">↺ 重置</button>
    </div>

    <div class="row" style="justify-content: center; margin-top: 16px">
      <label class="ctrl">
        <span class="field-label">专注时长 {{ workMin }} 分钟</span>
        <input v-model.number="workMin" type="range" min="5" max="60" step="5" @input="phase === 'work' && !running && (remaining = workMin * 60)" />
      </label>
      <label class="ctrl">
        <span class="field-label">休息时长 {{ restMin }} 分钟</span>
        <input v-model.number="restMin" type="range" min="1" max="30" step="1" @input="phase === 'rest' && !running && (remaining = restMin * 60)" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.pomodoro {
  max-width: 420px;
  margin: 0 auto;
  text-align: center;
  padding: 24px;
}
.phase-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}
.phase-row .btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.dial-wrap {
  position: relative;
  width: 240px;
  margin: 18px auto;
}
.dial {
  width: 100%;
  transform: rotate(0deg);
}
.dial-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.time {
  font-size: 44px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: var(--mono);
}
.time.work { color: #ef4444; }
.time.rest { color: #10b981; }
.phase-label {
  color: var(--muted);
  font-size: 14px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 160px;
}
</style>
