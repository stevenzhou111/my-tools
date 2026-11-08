<script setup>
import AppIcon from '@/components/AppIcon.vue'

/**
 * 联网工具统一的「需联网」横幅:wifi 图标 + 说明文案(slot)。
 * 此前 markup + scoped 样式在 7 个联网工具组件里各复制一份。
 * 顶部间距等修饰类经 class fallthrough 追加(如 class="mb-16")。
 */
</script>

<template>
  <div class="online-banner panel">
    <AppIcon name="wifi" :size="15" />
    <span><slot /></span>
  </div>
</template>

<style scoped>
.online-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--muted);
  padding: 10px 16px;
  border-color: color-mix(in srgb, var(--warning) 35%, var(--border));
}
</style>
