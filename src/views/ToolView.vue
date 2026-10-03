<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getTool, TOOLS } from '@/tools/registry'
import { useToolPrefs } from '@/utils/prefs'
import { useCopy } from '@/utils/useCopy'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const { isFav, toggleFav } = useToolPrefs()
const { copiedKey, copy } = useCopy()
const tool = computed(() => getTool(route.params.id))

// 工具状态带上了 URL 参数(可分享)时,标题栏出现"分享"按钮
const hasQuery = computed(() => Object.keys(route.query).length > 0)

// 同分类的其他工具,给用户一个"顺手看看"的出口;单工具分类(如软件推荐)不显示
const related = computed(() =>
  tool.value ? TOOLS.filter((t) => t.category === tool.value.category && t.id !== tool.value.id) : [],
)

// 工具切换或"重新加载"时强制重挂载异步组件
const attempts = ref(0)
const componentKey = computed(() => `${route.params.id}-${attempts.value}`)

function share() {
  copy('share', route.fullPath.startsWith('http') ? route.fullPath : location.origin + route.fullPath)
}
</script>

<template>
  <div>
    <template v-if="tool">
      <div class="tool-head">
        <div class="title-row">
          <span class="icon"><AppIcon :name="tool.icon" :size="28" /></span>
          <div>
            <h1>{{ tool.name }}</h1>
            <p class="desc">{{ tool.desc }}</p>
          </div>
          <button
            v-if="hasQuery"
            class="btn btn-sm"
            title="复制带当前参数的链接"
            @click="share"
          >
            <AppIcon name="clipboard" :size="14" />{{ copiedKey === 'share' ? '✓ 已复制' : '分享状态' }}
          </button>
          <button
            class="btn btn-sm fav-btn"
            :class="{ starred: isFav(tool.id) }"
            :title="isFav(tool.id) ? '取消收藏' : '收藏此工具'"
            @click="toggleFav(tool.id)"
          >
            <AppIcon :name="isFav(tool.id) ? 'star' : 'star-off'" :size="14" />{{ isFav(tool.id) ? '已收藏' : '收藏' }}
          </button>
        </div>
      </div>
      <component :is="tool.component" :key="componentKey" @retry="attempts++" />

      <details v-if="tool.about" class="about panel">
        <summary><AppIcon name="info" :size="15" />关于这个工具</summary>
        <p>{{ tool.about }}</p>
      </details>

      <section v-if="related.length" class="related">
        <h3 class="related-title">同分类工具</h3>
        <div class="related-grid">
          <router-link v-for="t in related" :key="t.id" :to="`/tool/${t.id}`" class="related-item">
            <AppIcon :name="t.icon" :size="15" />
            <span>{{ t.name }}</span>
          </router-link>
        </div>
      </section>
    </template>

    <div v-else class="panel empty">
      <h2>工具不存在</h2>
      <p>没有找到「{{ route.params.id }}」这个工具,可能已被移除或链接有误。</p>
      <router-link to="/"><AppIcon name="arrow-left" :size="14" />返回首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.tool-head {
  margin-bottom: 22px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.icon {
  width: 56px;
  height: 56px;
  font-size: 32px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-radius: 15px;
  flex-shrink: 0;
  color: var(--accent);
}
.title-row h1 {
  font-size: 26px;
  font-weight: 800;
  margin: 0;
}
.desc {
  color: var(--muted);
  font-size: 15px;
  margin: 3px 0 0;
}
.fav-btn {
  margin-left: auto;
  flex-shrink: 0;
}
.fav-btn.starred {
  border-color: #f59e0b;
  color: #f59e0b;
}
.about {
  margin-top: 22px;
  padding: 12px 18px;
  color: var(--muted);
}
.about summary {
  cursor: pointer;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--muted);
  user-select: none;
}
.about summary:hover {
  color: var(--accent);
}
.about p {
  margin: 10px 0 4px;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text);
}
.empty {
  text-align: center;
  padding: 48px 16px;
}
.related {
  margin-top: 22px;
}
.related-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
}
.related-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.related-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 13.5px;
  color: var(--text);
  text-decoration: none;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.related-item:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
