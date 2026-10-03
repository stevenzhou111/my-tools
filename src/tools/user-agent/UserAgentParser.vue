<script setup>
import { computed, ref } from 'vue'
import { UAParser } from 'ua-parser-js'
import { useCopy } from '@/utils/useCopy'
import AppIcon from '@/components/AppIcon.vue'

const input = ref(
  typeof navigator !== 'undefined' ? navigator.userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
)
const { copiedKey, copy } = useCopy()

const groups = computed(() => {
  const s = input.value.trim()
  if (!s) return []
  const r = new UAParser(s).getResult()
  const rows = [
    { icon: 'globe', title: '浏览器', items: [[r.browser.name, r.browser.version]] },
    { icon: 'monitor', title: '操作系统', items: [[r.os.name, r.os.version]] },
    {
      icon: 'smartphone',
      title: '设备',
      items: [
        [r.device.type || 'desktop(桌面设备)', null],
        [r.device.vendor, r.device.model],
      ],
    },
    { icon: 'cog', title: '渲染引擎', items: [[r.engine.name, r.engine.version]] },
    { icon: 'cpu', title: 'CPU 架构', items: [[r.cpu.architecture, null]] },
  ]
  return rows
    .map((g) => ({
      ...g,
      lines: g.items
        .filter((pair) => pair.some((x) => x))
        .map((pair) => pair.filter((x) => x).join(' ')),
    }))
    .filter((g) => g.lines.length)
})
</script>

<template>
  <div class="field">
    <label class="field-label">User-Agent 字符串</label>
    <textarea v-model="input" class="textarea" rows="4" spellcheck="false"></textarea>
  </div>

  <div class="ua-grid">
    <div v-for="g in groups" :key="g.title" class="panel ua-card">
      <div class="ua-head"><AppIcon :name="g.icon" :size="15" />{{ g.title }}</div>
      <div v-for="(line, i) in g.lines" :key="i" class="ua-line">{{ line }}</div>
    </div>
  </div>

  <div class="row" style="margin-top: 12px">
    <button class="btn btn-sm" @click="copy('ua', input)">
      {{ copiedKey === 'ua' ? '✓ 已复制' : '复制 UA 字符串' }}
    </button>
  </div>
</template>

<style scoped>
.ua-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.ua-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 6px;
  color: var(--accent);
}
.ua-line {
  font-size: 14.5px;
  padding: 2px 0;
  word-break: break-all;
}
</style>
