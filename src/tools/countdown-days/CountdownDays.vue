<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

/**
 * 倒数日/纪念日:纯本地 localStorage 管理,无账号无后端。
 * 单次日期显示「还有/已经 N 天」;每年重复的纪念日自动滚动到下一个周年。
 */

const STORAGE_KEY = 'toolbox-countdown-days'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}
function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* 存储不可用时静默跳过 */ }
}

const items = ref(load())
const name = ref('')
const date = ref('')
const repeat = ref(false)

const today = computed(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})

/** 计算某条目的展示天数与文案 */
function dayInfo(item) {
  const [y, m, d] = item.date.split('-').map(Number)
  let target = new Date(y, m - 1, d)
  if (item.repeat && target <= today.value) {
    // 每年重复:滚到下一个周年(今年的已过就去明年)
    target = new Date(today.value.getFullYear(), m - 1, d)
    if (target < today.value) target = new Date(today.value.getFullYear() + 1, m - 1, d)
  }
  const diff = Math.round((target - today.value) / 86400000)
  if (diff === 0) {
    return { days: 0, label: item.repeat ? '今天庆祝!' : '就是今天' }
  }
  if (diff > 0) return { days: diff, label: item.repeat ? `还有 ${diff} 天` : `还有 ${diff} 天` }
  return { days: diff, label: `已 ${-diff} 天` }
}

/** 展示排序:最近的在前(已过天数越少越靠前),今天置顶 */
const sorted = computed(() => {
  return [...items.value]
    .map((it) => ({ ...it, info: dayInfo(it) }))
    .sort((a, b) => {
      const an = Math.abs(a.info.days)
      const bn = Math.abs(b.info.days)
      if (a.info.days === 0) return -1
      if (b.info.days === 0) return 1
      return an - bn
    })
})

function add() {
  const n = name.value.trim()
  if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return
  items.value = [
    ...items.value.filter((it) => !(it.name === n && it.date === date.value)), // 同名同日去重
    { id: `${Date.now()}`, name: n, date: date.value, repeat: repeat.value },
  ]
  save(items.value)
  name.value = ''
  date.value = ''
  repeat.value = false
}

function remove(id) {
  items.value = items.value.filter((it) => it.id !== id)
  save(items.value)
}

// 大数字按正负着色:未来是期待(主色),过去是沉淀(灰绿)
function toneOf(days) {
  if (days === 0) return 'today'
  return days > 0 ? 'future' : 'past'
}

const SAMPLES = [
  { name: '春节', date: '2026-02-17', repeat: true },
  { name: '成立纪念日', date: '2020-06-01', repeat: true },
]
function addSample() {
  for (const s of SAMPLES) {
    if (!items.value.some((it) => it.name === s.name)) {
      items.value = [...items.value, { ...s, id: `${Date.now()}-${Math.random()}` }]
    }
  }
  save(items.value)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl grow">
        <span class="field-label m-0">名称</span>
        <input v-model="name" class="input" type="text" maxlength="30" placeholder="如:发工资 / 生日 / 交付日" @keydown.enter="add" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">日期</span>
        <input v-model="date" class="input date-input" type="date" @keydown.enter="add" />
      </label>
      <label class="check self-end m-0"><input v-model="repeat" type="checkbox" />每年重复</label>
      <button class="btn btn-primary self-end" :disabled="!name.trim() || !date" @click="add">添加</button>
    </div>
    <div v-if="!items.length" class="row mt-10">
      <span class="tip">还没有条目,</span>
      <button class="btn btn-sm" @click="addSample">填两个示例看看</button>
    </div>
  </div>

  <div v-if="!sorted.length" class="panel empty-hint">
    <p class="m-0 tip">添加生日、纪念日、交付节点……每天打开就知道还有多少天。</p>
    <p class="m-0 tip">数据保存在本机浏览器(localStorage),不上传也不跨设备。</p>
  </div>

  <div v-else class="day-grid">
    <div v-for="it in sorted" :key="it.id" class="day-card" :class="`tone-${toneOf(it.info.days)}`">
      <button class="del" :aria-label="`删除 ${it.name}`" @click="remove(it.id)">
        <AppIcon name="x" :size="14" />
      </button>
      <div class="day-name">
        <AppIcon :name="it.repeat ? 'repeat' : 'calendar-days'" :size="14" />
        {{ it.name }}
      </div>
      <div class="day-num">{{ Math.abs(it.info.days) }}</div>
      <div class="day-label">{{ it.info.label }}</div>
      <div class="day-date">{{ it.date }}</div>
    </div>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grow {
  flex: 1;
  min-width: 180px;
}
.date-input {
  width: 170px;
  font-family: var(--mono);
}
.self-end {
  align-self: flex-end;
}
.empty-hint {
  text-align: center;
  padding: 44px 16px;
}
.empty-hint p {
  margin-bottom: 6px;
}
.day-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}
.day-card {
  position: relative;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  text-align: center;
}
.day-card.tone-future .day-num {
  color: var(--accent);
}
.day-card.tone-past .day-num {
  color: var(--muted);
}
.day-card.tone-today {
  border-color: color-mix(in srgb, var(--warning) 50%, var(--border));
}
.day-card.tone-today .day-num {
  color: var(--warning);
}
.day-name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-size: 15px;
  color: var(--muted);
  word-break: break-all;
}
.day-num {
  font-family: var(--mono);
  font-size: 38px;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 6px;
}
.day-label {
  font-size: 13.5px;
  color: var(--text);
}
.day-date {
  margin-top: 6px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--muted);
}
.del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: none;
  background: none;
  color: var(--muted);
  border-radius: 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
}
.day-card:hover .del,
.del:focus-visible {
  opacity: 1;
}
.del:hover {
  color: var(--danger);
  background: var(--danger-soft);
}
</style>
