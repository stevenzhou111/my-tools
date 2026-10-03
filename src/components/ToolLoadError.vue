<script setup>
import AppIcon from "@/components/AppIcon.vue"

defineEmits(['retry'])
</script>

<template>
  <div class="panel load-error">
    <div class="icon"><AppIcon name="wifi-off" :size="30" /></div>
    <h3>工具加载失败</h3>
    <p>可能是网络波动或新版本刚发布,资源缓存已失效。</p>
    <div class="row" style="justify-content: center">
      <button class="btn btn-primary" @click="$emit('retry')"><AppIcon name="rotate-cw" :size="15" />重新加载</button>
      <router-link to="/" class="btn"><AppIcon name="arrow-left" :size="15" />返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.load-error {
  text-align: center;
  padding: 52px 16px;
}
.icon {
  font-size: 42px;
  margin-bottom: 8px;
}
h3 {
  margin-bottom: 6px;
}
p {
  color: var(--muted);
  margin-bottom: 18px;
}
</style>
