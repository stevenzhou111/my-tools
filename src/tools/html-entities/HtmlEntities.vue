<script setup>
import { computed, ref } from 'vue'
import { ENTITY_GROUPS, allEntities } from '@/utils/htmlEntities'
import { useCopy } from '@/utils/useCopy'
import AppIcon from '@/components/AppIcon.vue'

const query = ref('')
const mode = ref('entity') // entity: 复制 &amp; 写法;char: 复制字符
const { copiedKey, copy } = useCopy()

const ALL = allEntities()

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return ENTITY_GROUPS
  return ENTITY_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (it) => it.entity.toLowerCase().includes(q) || it.char.includes(query.value.trim()) || it.name.toLowerCase().includes(q),
    ),
  })).filter((g) => g.items.length)
})

const total = computed(() => groups.value.reduce((n, g) => n + g.items.length, 0))

function clickItem(it) {
  copy(`ent-${it.entity}`, mode.value === 'entity' ? it.entity : it.char)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <label class="ctrl-inline grow">
        <AppIcon name="search" :size="15" />
        <input v-model="query" class="input search-mini" type="search" placeholder="搜 copy / &amp;amp; / © / 版权…(名称/实体/字符)" />
      </label>
      <div class="row gap-8" role="radiogroup" aria-label="点击复制的内容">
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'entity' }" role="radio" :aria-checked="mode === 'entity'" @click="mode = 'entity'">复制实体写法</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'char' }" role="radio" :aria-checked="mode === 'char'" @click="mode = 'char'">复制字符</button>
      </div>
    </div>
    <p class="tip m-0 mt-10">
      点击条目即复制;共 {{ total }} / {{ ALL.length }} 条。&lt; &gt; &amp; &quot; 在 HTML 里有语法含义必须转义;
      其余实体主要用于源码里不好直接输入的符号。
    </p>
  </div>

  <section v-for="g in groups" :key="g.id" class="ent-group">
    <h2 class="group-title">{{ g.label }}<span class="tip"> · {{ g.items.length }}</span></h2>
    <div class="ent-grid">
      <button
        v-for="it in g.items"
        :key="it.entity"
        type="button"
        class="ent-item"
        :class="{ hit: copiedKey === `ent-${it.entity}` }"
        :title="`${it.name} — 点击复制`"
        @click="clickItem(it)"
      >
        <span class="ent-char">{{ it.char }}</span>
        <span class="ent-code">{{ mode === 'entity' ? it.entity : it.char }}</span>
      </button>
    </div>
  </section>

  <div v-if="!total" class="panel empty">没有匹配的实体</div>

  <div class="panel mt-16">
    <p class="tip m-0">
      数字实体(&amp;#169; = ©)对任何 Unicode 字符都有效,命名实体更可读但需浏览器支持;
      本表只收录 HTML 标准命名实体,全部条目在所有现代浏览器可用。
      在 Markdown 或纯文本环境里直接写字符本身即可,无需实体。
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
.ent-group {
  margin-bottom: 22px;
}
.group-title {
  font-size: 15.5px;
  font-weight: 700;
  margin-bottom: 10px;
}
.ent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.ent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s, background 0.12s;
}
.ent-item:hover {
  border-color: var(--accent);
}
.ent-item.hit {
  border-color: var(--success);
  background: rgba(21, 128, 61, 0.08);
}
.ent-char {
  font-size: 19px;
  font-weight: 700;
  width: 26px;
  text-align: center;
  flex-shrink: 0;
}
.ent-code {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 16px;
}
</style>
