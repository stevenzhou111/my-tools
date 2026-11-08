<script setup>
import { useCopy } from '@/utils/useCopy'

/**
 * 统一的「点击复制」按钮:自带 ✓ 已复制 反馈,每个实例独立状态。
 * 此前约 100 个工具组件各自手写 copy(key, text) + copiedKey 三元文案。
 *
 * 样式类不设默认值,由调用方传入(与原写法一致,绝大多数是 class="btn btn-sm");
 * title / aria-label / :disabled / v-if 等原生属性经 fallthrough 直达内部 button。
 */
defineProps({
  text: { type: [String, Number], default: '' },
  label: { type: String, default: '复制结果' },
  copiedLabel: { type: String, default: '✓ 已复制' },
})
const { copiedKey, copy } = useCopy()
</script>

<template>
  <button type="button" @click="copy('self', String(text))">
    {{ copiedKey === 'self' ? copiedLabel : label }}
  </button>
</template>
