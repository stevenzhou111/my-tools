<script setup>
import { computed } from 'vue'
import { ICONS } from '@/assets/icons'

// 图标数据是裁剪过的 lucide 路径(见 src/assets/icons.js),
// 不引入 lucide 组件,避免 100+ 个图标组件打进主包。
const props = defineProps({
  name: { type: String, default: '' },
  size: { type: [Number, String], default: 18 },
  strokeWidth: { type: [Number, String], default: 2 },
})

const nodes = computed(() => ICONS[props.name] || [])
</script>

<template>
  <svg
    class="app-icon"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <component v-for="(n, i) in nodes" :key="i" :is="n[0]" v-bind="n[1]" />
  </svg>
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: -0.15em;
}
</style>