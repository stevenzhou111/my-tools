<script setup>
import { computed, ref } from 'vue'
import { SOFT_CATS, SOFTWARE } from '@/data/software'
import AppIcon from '@/components/AppIcon.vue'

const query = ref('')
const cat = ref('all')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return SOFTWARE.filter(
    (s) =>
      (cat.value === 'all' || s.cat === cat.value) &&
      (!q || `${s.name} ${s.desc} ${s.tag} ${s.platform}`.toLowerCase().includes(q)),
  )
})

function catName(id) {
  return SOFT_CATS.find((c) => c.id === id)?.name || ''
}
function catIcon(id) {
  return SOFT_CATS.find((c) => c.id === id)?.icon || ''
}

const TAG_CLASS = {
  '免费': 'tag-free',
  '免费+开源': 'tag-oss',
  '开源': 'tag-oss',
  '个人免费': 'tag-free',
  '社区版免费': 'tag-free',
  '基础免费': 'tag-freemium',
  '系统内置': 'tag-os',
  '网页': 'tag-os',
  '付费': 'tag-paid',
}
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check cat-chip" :class="{ active: cat === 'all' }" @click="cat = 'all'">
      全部({{ SOFTWARE.length }})
    </label>
    <label
      v-for="c in SOFT_CATS"
      :key="c.id"
      class="check cat-chip"
      :class="{ active: cat === c.id }"
      @click="cat = c.id"
    >
      <AppIcon :name="c.icon" :size="14" />{{ c.name }}({{ SOFTWARE.filter((s) => s.cat === c.id).length }})
    </label>
  </div>

  <div class="field">
    <label class="field-label">搜索软件</label>
    <input v-model="query" class="input" type="search" placeholder="如 截图、笔记、下载、开源…" />
  </div>

  <div class="soft-grid">
    <div v-for="s in filtered" :key="s.name" class="panel soft-card">
      <div class="soft-head">
        <strong class="soft-name">{{ s.name }}</strong>
        <span class="tag" :class="TAG_CLASS[s.tag] || 'tag-os'">{{ s.tag }}</span>
      </div>
      <p class="soft-desc">{{ s.desc }}</p>
      <span v-if="s.aud" class="soft-aud">👥 适合:{{ s.aud }}</span>
      <div class="soft-foot">
        <span class="tip">{{ catIcon(s.cat) }} {{ catName(s.cat) }} · {{ s.platform }}</span>
        <a :href="s.site" target="_blank" rel="noopener noreferrer" class="btn btn-sm">官网 ↗</a>
      </div>
    </div>
  </div>

  <div v-if="!filtered.length" class="tip" style="margin-top: 16px">没有匹配的软件,换个关键词试试。</div>

  <p class="tip" style="margin-top: 16px">
    以上为个人长期使用与社区口碑整理的人工精选,与这些软件没有任何推广合作;下载时请认准官网,谨防第三方捆绑。
  </p>
</template>

<style scoped>
.cat-chip {
  padding: 5px 13px;
  border: 1px solid var(--border);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14.5px;
  background: var(--card);
  transition: all 0.12s;
}
.cat-chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cat-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.soft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.soft-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 15px;
}
.soft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.soft-name {
  font-size: 16px;
}
.tag {
  font-size: 12px;
  padding: 1px 9px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}
.tag-free { background: var(--accent-soft); color: var(--accent); }
.tag-oss { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.tag-freemium { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.tag-os { background: var(--bg-soft); color: var(--muted); }
.tag-paid { background: var(--danger-soft); color: var(--danger); }
.soft-desc {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
  flex: 1;
}
.soft-aud {
  font-size: 12.5px;
  color: var(--accent);
}
.soft-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
