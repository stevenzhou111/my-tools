<script setup>
import { computed, ref } from 'vue'
import { HEADER_GROUPS, allHeaders, DIR_LABEL } from '@/utils/httpHeaders'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const query = ref('')
const dirFilter = ref('all') // all | req | res | both
const { copiedKey, copy } = useCopy()

const ALL = allHeaders()

useUrlState([{ key: 'q', ref: query, parse: shortString(60) }])

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return HEADER_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (dirFilter.value !== 'all' && it.dir !== dirFilter.value) return false
      if (!q) return true
      // 分组标签参与匹配:搜「跨域」「缓存」能带出整组相关头
      return g.label.toLowerCase().includes(q) || it.name.toLowerCase().includes(q) || it.desc.includes(query.value.trim())
    }),
  })).filter((g) => g.items.length)
})

const total = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

const DIRS = [
  { id: 'all', label: '全部' },
  { id: 'req', label: '请求头' },
  { id: 'res', label: '响应头' },
  { id: 'both', label: '双向' },
]
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="方向筛选">
        <button
          v-for="d in DIRS"
          :key="d.id"
          class="btn btn-sm"
          :class="{ 'btn-primary': dirFilter === d.id }"
          role="radio"
          :aria-checked="dirFilter === d.id"
          @click="dirFilter = d.id"
        >
          {{ d.label }}
        </button>
      </div>
      <label class="ctrl-inline grow">
        <AppIcon name="search" :size="15" />
        <input v-model="query" class="input search-mini" type="search" placeholder="搜 Authorization / 缓存 / 跨域 / 重定向…(头名或说明)" />
      </label>
    </div>
    <p class="tip m-0 mt-10">共 {{ total }} / {{ ALL.length }} 条;点击头名复制。方向 = 常见出现位置,部分头两头都合法。</p>
  </div>

  <section v-for="g in groups" :key="g.id" class="hd-group">
    <h2 class="group-title">{{ g.label }}<span class="tip"> · {{ g.items.length }}</span></h2>
    <div class="hd-list">
      <div v-for="it in g.items" :key="it.name" class="hd-item" @click="copy(`hd-${it.name}`, it.name)">
        <span class="hd-name">
          {{ it.name }}
          <AppIcon :name="copiedKey === `hd-${it.name}` ? 'check' : 'clipboard'" :size="12" />
        </span>
        <span class="hd-dir" :class="`dir-${it.dir}`">{{ DIR_LABEL[it.dir] }}</span>
        <span class="hd-desc">{{ it.desc }}</span>
      </div>
    </div>
  </section>

  <div v-if="!total" class="panel empty">没有匹配的请求头</div>

  <div class="panel mt-16">
    <p class="tip m-0">
      请求头由客户端发送、响应头由服务器返回,个别(如 Content-Type)两头都有但含义不同。
      自定义头请加 X- 前缀只是历史习惯,现已不强制;排查跨域问题先看预检(OPTIONS)的 Access-Control-* 应答。
      完整语义以 MDN 与 RFC 9110 系列为准。
    </p>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  color: var(--muted);
}
.search-mini {
  flex: 1;
}
.hd-group {
  margin-bottom: 20px;
}
.group-title {
  font-size: 15.5px;
  font-weight: 700;
  margin-bottom: 10px;
}
.hd-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.hd-item {
  display: grid;
  grid-template-columns: minmax(210px, 1.1fr) 52px 2.2fr;
  gap: 12px;
  align-items: baseline;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: border-color 0.12s;
}
.hd-item:hover {
  border-color: var(--accent);
}
@media (max-width: 720px) {
  .hd-item {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
.hd-name {
  font-family: var(--mono);
  font-weight: 600;
  font-size: 14px;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.hd-dir {
  font-size: 12px;
  border-radius: 999px;
  padding: 1px 8px;
  text-align: center;
  justify-self: start;
}
.dir-req { background: var(--accent-soft); color: var(--accent); }
.dir-res { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.dir-both { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
.hd-desc {
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.6;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 16px;
}
</style>
