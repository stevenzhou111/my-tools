<script setup>
import { computed, ref } from 'vue'
import { REGEX_SYNTAX, REGEX_PATTERNS, verifyPattern } from '@/utils/regexCheat'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const tab = ref('patterns') // patterns | syntax
const query = ref('')
const { copiedKey, copy } = useCopy()

useUrlState([
  { key: 't', ref: tab, parse: (s) => (['patterns', 'syntax'].includes(s) ? s : undefined) },
])

// 模式库:搜索 + 每条实时自检(正反例徽标)
const patterns = computed(() => {
  const q = query.value.trim().toLowerCase()
  return REGEX_PATTERNS.map((p) => ({ ...p, check: verifyPattern(p) }))
    .filter((p) => !q || p.name.includes(query.value.trim()) || p.desc.includes(query.value.trim()) || p.source.toLowerCase().includes(q))
})

const syntaxGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return REGEX_SYNTAX
  return REGEX_SYNTAX.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.token.toLowerCase().includes(q) || it.desc.includes(query.value.trim())),
  })).filter((g) => g.items.length)
})

function copyPattern(p) {
  copy(`re-${p.id}`, `/${p.source}/${p.flags}`)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="内容">
        <button class="btn btn-sm" :class="{ 'btn-primary': tab === 'patterns' }" role="radio" :aria-checked="tab === 'patterns'" @click="tab = 'patterns'">常用模式({{ REGEX_PATTERNS.length }})</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': tab === 'syntax' }" role="radio" :aria-checked="tab === 'syntax'" @click="tab = 'syntax'">语法速查</button>
      </div>
      <label class="ctrl-inline grow">
        <AppIcon name="search" :size="15" />
        <input v-model="query" class="input search-mini" type="search" placeholder="搜 手机号 / 邮箱 / 量词 / 断言…(名称/说明/正则)" />
      </label>
    </div>
    <p class="tip m-0 mt-10">
      每条模式都附带正反例样本,页面加载时实时运行自检(✓ 徽标 = 该正则对所有样本行为正确);
      需要动手调试请用「正则测试」。模式均按 JavaScript 正则语法书写。
    </p>
  </div>

  <template v-if="tab === 'patterns'">
    <div v-for="p in patterns" :key="p.id" class="pat-card">
      <div class="pat-head">
        <b>{{ p.name }}</b>
        <span class="pat-badge" :class="p.check.pass ? 'ok' : 'bad'">
          <AppIcon :name="p.check.pass ? 'circle-check' : 'circle-x'" :size="13" />
          {{ p.check.pass ? '样本自检通过' : `样本未通过:${p.check.failedSample}` }}
        </span>
        <button class="btn btn-sm" @click="copyPattern(p)">
          <AppIcon :name="copiedKey === `re-${p.id}` ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === `re-${p.id}` ? '已复制' : '复制' }}
        </button>
      </div>
      <code class="pat-src">/{{ p.source }}/{{ p.flags }}</code>
      <p class="tip m-0">{{ p.desc }}</p>
      <div class="samples">
        <span v-for="s in p.valid" :key="s" class="sample ok"><AppIcon name="check" :size="11" />{{ s }}</span>
        <span v-for="s in p.invalid" :key="s" class="sample bad"><AppIcon name="x" :size="11" />{{ s }}</span>
      </div>
    </div>
    <div v-if="!patterns.length" class="panel empty">没有匹配的模式</div>
  </template>

  <template v-else>
    <section v-for="g in syntaxGroups" :key="g.id" class="syn-group">
      <h2 class="group-title">{{ g.label }}</h2>
      <div class="syn-list">
        <div v-for="it in g.items" :key="it.token" class="syn-item">
          <code class="syn-token">{{ it.token }}</code>
          <span class="syn-desc">{{ it.desc }}</span>
        </div>
      </div>
    </section>
    <div v-if="!syntaxGroups.length" class="panel empty">没有匹配的语法</div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      提醒:解析 HTML/JSON 请用 DOM API 与 JSON.parse 而不是正则,闭合标签之类的结构正则写不可靠;
      用户提供的正则要做灾难性回溯防护(嵌套量词),「正则测试」里已有此类告警。
      手机号/身份证等模式仅校验格式,不代表人真实存在。
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
.pat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 12px;
}
.pat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pat-head b {
  font-size: 15.5px;
}
.pat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
}
.pat-badge.ok {
  background: rgba(21, 128, 61, 0.12);
  color: var(--success);
}
.pat-badge.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.pat-head .btn {
  margin-left: auto;
}
.pat-src {
  display: block;
  font-family: var(--mono);
  font-size: 14px;
  background: var(--bg-soft);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  word-break: break-all;
}
.samples {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.sample {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--mono);
  font-size: 12.5px;
  border-radius: 999px;
  padding: 2px 10px;
}
.sample.ok {
  background: rgba(21, 128, 61, 0.1);
  color: var(--success);
}
.sample.bad {
  background: var(--danger-soft);
  color: var(--danger);
}
.syn-group {
  margin-bottom: 18px;
}
.group-title {
  font-size: 15.5px;
  font-weight: 700;
  margin-bottom: 8px;
}
.syn-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 6px;
}
@media (max-width: 720px) {
  .syn-list {
    grid-template-columns: 1fr;
  }
}
.syn-item {
  display: flex;
  gap: 12px;
  align-items: baseline;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 7px 12px;
}
.syn-token {
  font-family: var(--mono);
  font-weight: 700;
  color: var(--accent);
  min-width: 90px;
  flex-shrink: 0;
}
.syn-desc {
  font-size: 13.5px;
  color: var(--muted);
}
.empty {
  text-align: center;
  color: var(--muted);
  padding: 40px 16px;
}
</style>
