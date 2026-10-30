<script setup>
import { computed, onUnmounted, ref } from 'vue'

const COLORS = [
  { hex: '#ffffff', label: '纯白' },
  { hex: '#000000', label: '纯黑' },
  { hex: '#ff0000', label: '纯红' },
  { hex: '#00ff00', label: '纯绿' },
  { hex: '#0000ff', label: '纯蓝' },
  { hex: '#808080', label: '中灰' },
]

const idx = ref(0)
const fullscreen = ref(false)
const rootEl = ref(null)

const current = computed(() => COLORS[idx.value])

function next() {
  idx.value = (idx.value + 1) % COLORS.length
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await rootEl.value?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch {
    /* 某些环境不允许全屏,单色区域依旧可用 */
  }
}
function onFsChange() {
  fullscreen.value = !!document.fullscreenElement
}
document.addEventListener('fullscreenchange', onFsChange)
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    逐屏显示纯色画面来检查屏幕坏点 / 亮斑 / 漏光:正常像素在纯色下应完全均匀,出现固定不变的亮点、暗点即为坏点。点击画面或按空格切换颜色,建议全屏后观察 1–2 分钟。
  </p>

  <div class="row" style="margin-bottom: 12px">
    <button class="btn btn-primary" @click="toggleFullscreen">⛶ 全屏检测</button>
    <span class="tip">全屏中:点击画面 / 按空格切色,Esc 退出</span>
  </div>

  <div
    ref="rootEl"
    class="test-stage"
    :class="{ fullscreen }"
    :style="{ background: current.hex }"
    role="button"
    tabindex="0"
    aria-label="切换检测颜色"
    @click="next"
    @keydown.space.prevent="next"
  >
    <span class="stage-label" :style="{ color: idx === 0 || idx === 5 ? '#333' : '#fff' }">
      {{ fullscreen ? '' : `${current.label}(${idx + 1}/${COLORS.length})` }}
    </span>
  </div>

  <div class="row mt-12">
    <button
      v-for="(c, i) in COLORS"
      :key="c.hex"
      class="swatch-btn"
      :class="{ active: i === idx }"
      :style="{ background: c.hex }"
      :aria-label="c.label"
      @click="idx = i"
    ></button>
  </div>
</template>

<style scoped>
.test-stage {
  height: 300px;
  border-radius: 14px;
  border: 1px solid var(--border);
  cursor: pointer;
  display: grid;
  place-items: center;
  user-select: none;
}
.test-stage:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.test-stage.fullscreen {
  height: 100vh;
  border: none;
  border-radius: 0;
  cursor: none;
}
.stage-label {
  font-size: 14px;
  font-family: var(--mono);
}
.swatch-btn {
  width: 44px;
  height: 30px;
  border-radius: 8px;
  border: 2px solid var(--border);
  cursor: pointer;
}
.swatch-btn.active {
  border-color: var(--accent);
}
</style>
