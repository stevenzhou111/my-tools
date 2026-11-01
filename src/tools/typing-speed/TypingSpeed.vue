<script setup>
import { computed, onUnmounted, ref } from 'vue'

// 题库:中文按短句拼段,英文按句拼段,每次随机抽 3 句
const CN_POOL = [
  '工具的意义在于把重复的事情交给机器,让人把时间花在更有创造力的地方。',
  '浏览器正在成为一个操作系统,网页应用的边界越来越模糊。',
  '简单可靠比花哨的功能更能赢得长期信任,工具尤其如此。',
  '好的界面是让用户忘记界面的存在,专注于手头的事情。',
  '数据留在本地是对用户最基本的尊重,也是隐私保护的底线。',
  '所有的事务性劳动,第一原则都是先让它可以被测量。',
  '键盘是最古老的效率工具,练习打字依然是回报率很高的投资。',
  '把复杂留给自己,把简单留给用户,是工程审美的核心。',
]
const EN_POOL = [
  'The quick brown fox jumps over the lazy dog while the cat watches quietly.',
  'A good tool disappears in your hands and lets you focus on the work itself.',
  'Practice makes perfect, but measured practice makes progress much faster.',
  'Simplicity is the ultimate sophistication in both design and engineering.',
  'Type carefully and accuracy will bring speed along with it naturally.',
]

const DURATIONS = [
  { id: 30, label: '30 秒' },
  { id: 60, label: '60 秒' },
  { id: 120, label: '120 秒' },
]

const mode = ref('cn') // cn | en
const duration = ref(60)
const phase = ref('idle') // idle | running | done
const input = ref('')
const target = ref('')
const startedAt = ref(0)
const now = ref(0)
const best = ref(loadBest())
const history = ref([])
const justBest = ref(false)

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('toolbox-typing-best') || 'null') // { cn: cpm, en: wpm }
  } catch {
    return null
  }
}
function saveBest() {
  try {
    localStorage.setItem('toolbox-typing-best', JSON.stringify(best.value))
  } catch { /* 存储不可用时静默跳过 */ }
}

function pickText() {
  const pool = (mode.value === 'cn' ? CN_POOL : EN_POOL).slice()
  const picks = []
  for (let i = 0; i < 3 && pool.length; i++) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return picks.join(mode.value === 'cn' ? '' : ' ')
}

const elapsed = computed(() => {
  if (phase.value === 'running') return Math.min(duration.value, (now.value - startedAt.value) / 1000)
  return finishedElapsed.value
})
const finishedElapsed = ref(duration.value)

const timeLeft = computed(() => Math.max(0, Math.ceil(duration.value - elapsed.value)))

// 逐字比对:正确的字 / 输入的长度
const stats = computed(() => {
  const typed = input.value
  let correct = 0
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target.value[i]) correct++
  }
  const t = elapsed.value || 1
  const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100
  if (mode.value === 'cn') {
    return { correct, typed: typed.length, acc, cpm: Math.round((correct / t) * 60), wpm: 0 }
  }
  // 英文按 5 字符 = 1 词的标准折算 WPM
  return { correct, typed: typed.length, acc, cpm: Math.round((correct / t) * 60), wpm: Math.round(correct / 5 / (t / 60)) }
})

// 目标文本分段渲染:已对(绿)/已错(红底)/未到
const segments = computed(() => {
  const t = target.value
  const typed = input.value
  const segs = []
  let i = 0
  for (; i < Math.min(typed.length, t.length); i++) {
    if (typed[i] === t[i]) {
      if (segs.length && segs[segs.length - 1].k === 'ok') segs[segs.length - 1].s += t[i]
      else segs.push({ k: 'ok', s: t[i] })
    } else {
      if (segs.length && segs[segs.length - 1].k === 'bad') segs[segs.length - 1].s += t[i]
      else segs.push({ k: 'bad', s: t[i] })
    }
  }
  if (i < t.length) segs.push({ k: 'todo', s: t.slice(i) })
  return segs
})

let timer = 0

function start() {
  target.value = pickText()
  input.value = ''
  startedAt.value = Date.now()
  now.value = startedAt.value
  phase.value = 'running'
  justBest.value = false
  clearInterval(timer)
  timer = setInterval(() => {
    now.value = Date.now()
    if (elapsed.value >= duration.value) finish()
  }, 200)
}

function finish() {
  if (phase.value !== 'running') return
  clearInterval(timer)
  finishedElapsed.value = Math.max(1, elapsed.value)
  phase.value = 'done'
  const s = stats.value
  const score = mode.value === 'cn' ? s.cpm : s.wpm
  if (!best.value) best.value = { cn: 0, en: 0 }
  justBest.value = score > (best.value[mode.value] || 0)
  if (justBest.value) {
    best.value = { ...best.value, [mode.value]: score }
    saveBest()
  }
  history.value = [{ score, acc: s.acc, mode: mode.value, at: new Date().toLocaleTimeString('zh-CN') }, ...history.value].slice(0, 8)
}

function onInput() {
  // 输入长度超过目标 10% 直接结束(防粘贴灌满)
  if (input.value.length >= target.value.length) finish()
}

function onKeydown(e) {
  if (e.key === 'Enter') e.preventDefault() // 题库没有换行,回车不产生干扰字符
}

function restart() {
  phase.value = 'idle'
  input.value = ''
  target.value = ''
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="panel mb-16">
    <div class="row setting-row">
      <div class="row gap-8" role="radiogroup" aria-label="文本语言">
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'cn' }" role="radio" :aria-checked="mode === 'cn'" @click="mode = 'cn'; restart()">中文</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'en' }" role="radio" :aria-checked="mode === 'en'" @click="mode = 'en'; restart()">英文</button>
      </div>
      <div class="row gap-8" role="radiogroup" aria-label="测试时长">
        <button
          v-for="d in DURATIONS"
          :key="d.id"
          class="btn btn-sm"
          :class="{ 'btn-primary': duration === d.id }"
          role="radio"
          :aria-checked="duration === d.id"
          @click="duration = d.id; restart()"
        >
          {{ d.label }}
        </button>
      </div>
      <button class="btn btn-sm btn-primary" @click="start">{{ phase === 'running' ? '换题重开' : '开始测试' }}</button>
    </div>
  </div>

  <div v-if="phase !== 'idle'" class="panel target-panel mb-16">
    <div class="target-text" aria-label="对照文本">
      <span v-for="(seg, i) in segments" :key="i" :class="`seg-${seg.k}`">{{ seg.s }}</span>
    </div>
    <textarea
      v-model="input"
      class="textarea type-area"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      aria-label="在此输入对照文本"
      :placeholder="phase === 'running' ? '照着上面的文字输入…' : '点击「开始测试』'"
      :disabled="phase !== 'running'"
      @input="onInput"
      @keydown="onKeydown"
    ></textarea>
  </div>

  <div v-if="phase === 'running'" class="live-row">
    <div class="live-item"><b>{{ timeLeft }}</b><span>剩余秒数</span></div>
    <div class="live-item"><b>{{ mode === 'cn' ? stats.cpm : stats.wpm }}</b><span>{{ mode === 'cn' ? '字/分钟' : '词/分钟' }}</span></div>
    <div class="live-item"><b>{{ stats.acc }}%</b><span>正确率</span></div>
    <div class="live-item"><b>{{ stats.typed }}</b><span>已输入字符</span></div>
  </div>

  <div v-if="phase === 'done'" class="panel result-panel mb-16">
    <p class="m-0 mb-10"><b>本轮成绩</b>({{ mode === 'cn' ? '中文' : '英文' }} · {{ duration }} 秒)</p>
    <div class="live-row static">
      <div class="live-item"><b class="accent">{{ mode === 'cn' ? stats.cpm : stats.wpm }}</b><span>{{ mode === 'cn' ? '字/分钟' : '词/分钟' }}</span></div>
      <div class="live-item"><b>{{ stats.acc }}%</b><span>正确率</span></div>
      <div class="live-item"><b>{{ stats.correct }}</b><span>正确字符 / {{ stats.typed }}</span></div>
      <div class="live-item">
        <b>{{ (mode === 'cn' ? best?.cn : best?.en) || '—' }}</b>
        <span>最佳纪录<template v-if="justBest"> · 本轮刷新!</template></span>
      </div>
    </div>
    <div class="row mt-12">
      <button class="btn btn-primary" @click="start">再来一轮</button>
      <button class="btn" @click="restart">收起</button>
    </div>
  </div>

  <div v-if="phase === 'idle'" class="panel">
    <p class="tip m-0">
      点击「开始测试」,在下方输入框照着文字打字,计时结束自动出成绩:{{ mode === 'cn' ? '中文按「字/分钟(CPM)」' : '英文按标准 WPM(5 字符 = 1 词)' }}计,
      正确率实时反馈。练习推荐「不看键盘盲打 + 优先保证正确率」,速度自然会跟上来。成绩只保存在本机浏览器。
    </p>
  </div>

  <div v-if="history.length > 1" class="panel mt-16">
    <p class="tip m-0 mb-8">最近记录(本页会话内)</p>
    <div class="hist-row" v-for="(h, i) in history" :key="i">
      <span class="hist-score">{{ h.score }} {{ h.mode === 'cn' ? '字/分' : '词/分' }}</span>
      <span class="tip">正确率 {{ h.acc }}% · {{ h.at }}</span>
    </div>
  </div>
</template>

<style scoped>
.setting-row {
  gap: 20px;
  flex-wrap: wrap;
  align-items: center;
}
.target-panel {
  padding: 16px 18px;
}
.target-text {
  font-size: 17px;
  line-height: 2;
  letter-spacing: 0.5px;
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 14px 16px;
  max-height: 150px;
  overflow-y: auto;
}
.seg-ok { color: var(--success); }
.seg-bad {
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: 3px;
}
.seg-todo { color: var(--text); opacity: 0.55; }
.type-area {
  margin-top: 12px;
  min-height: 110px;
  font-size: 16px;
}
.live-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 720px) {
  .live-row {
    grid-template-columns: 1fr 1fr;
  }
}
.live-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  text-align: center;
}
.live-item b {
  font-family: var(--mono);
  font-size: 24px;
  color: var(--text);
}
.live-item b.accent {
  color: var(--accent);
}
.live-item span {
  font-size: 13px;
  color: var(--muted);
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.hist-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.hist-row:last-child {
  border-bottom: none;
}
.hist-score {
  font-family: var(--mono);
  font-weight: 600;
}
</style>
