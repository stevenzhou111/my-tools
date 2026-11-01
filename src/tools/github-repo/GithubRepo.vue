<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchRepo, parseRepoInput, formatCount } from '@/utils/ghRepo'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const input = ref('vuejs/core')
const loading = ref(false)
const result = ref(null)
const error = ref('')

const { copiedKey, copy } = useCopy()

const short = (s) => (s && s.length <= 200 ? s : undefined)
useUrlState([{ key: 'r', ref: input, parse: short }])

async function load() {
  loading.value = true
  error.value = ''
  result.value = null
  result.value = await fetchRepo(input.value)
  loading.value = false
}
onMounted(() => load())

const d = computed(() => result.value?.data || null)
const inputOk = computed(() => !parseRepoInput(input.value).error)

const CARDS = [
  { key: 'stars', label: 'Stars', icon: 'star' },
  { key: 'forks', label: 'Forks', icon: 'git-fork' },
  { key: 'openIssues', label: 'Open Issues', icon: 'circle-dot' },
]
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网(GitHub API 免登录 60 次/小时,结果缓存 30 分钟省额度)。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="ctrl grow">
        <span class="field-label m-0">仓库(owner/repo 或完整链接)</span>
        <input v-model="input" class="input repo-input" type="text" spellcheck="false" placeholder="vuejs/core 或 https://github.com/vuejs/core" @keydown.enter="load" />
      </label>
      <button class="btn btn-primary self-end" :disabled="loading || !inputOk" @click="load">
        <AppIcon :name="loading ? 'loader' : 'search'" :size="14" />{{ loading ? '查询中' : '查询仓库' }}
      </button>
    </div>
    <p v-if="input && !inputOk" class="tip warn-tip m-0 mt-8">{{ parseRepoInput(input).error }}</p>
  </div>

  <div v-if="error" class="error-box mb-14">
    ✗ {{ error }}
    <button v-if="!error.includes('额度')" class="btn btn-sm retry-btn" @click="load">重试</button>
  </div>

  <template v-else-if="d">
    <div class="panel result-panel mb-16">
      <div class="repo-head">
        <div>
          <a :href="d.url" target="_blank" rel="noopener" class="repo-name">{{ d.slug }}</a>
          <p class="repo-desc m-0" v-if="d.description">{{ d.description }}</p>
        </div>
        <span v-if="result.stale" class="tip stale-tip">缓存回退({{ result.fetchedAt ? '数据截至最近一次成功查询' : '' }})</span>
      </div>

      <div class="num-grid">
        <div v-for="c in CARDS" :key="c.key" class="num-card">
          <AppIcon :name="c.icon" :size="16" />
          <b>{{ formatCount(d[c.key]) }}</b>
          <span>{{ c.label }}</span>
        </div>
      </div>

      <div class="detail-list">
        <div class="detail-row"><span class="k">主语言</span><span class="v">{{ d.language || '—' }}</span></div>
        <div class="detail-row"><span class="k">开源协议</span><span class="v">{{ d.license }}</span></div>
        <div class="detail-row"><span class="k">默认分支</span><span class="v mono">{{ d.defaultBranch }}</span></div>
        <div class="detail-row"><span class="k">创建 / 最近推送</span><span class="v mono">{{ d.createdAt }} / {{ d.pushedAt }}</span></div>
        <div class="detail-row"><span class="k">最新 Release</span>
          <span class="v">
            <template v-if="d.release">
              <a :href="d.release.url" target="_blank" rel="noopener" class="mono">{{ d.release.tag }}</a>
              <span class="tip"> · {{ d.release.date }}</span>
            </template>
            <template v-else>—</template>
          </span>
        </div>
        <div class="detail-row"><span class="k">主页</span>
          <span class="v">
            <template v-if="d.homepage"><a :href="d.homepage" target="_blank" rel="noopener">{{ d.homepage }}</a></template>
            <template v-else>—</template>
          </span>
        </div>
        <div v-if="d.topics.length" class="detail-row"><span class="k">Topics</span><span class="v"><code v-for="t in d.topics.slice(0, 8)" :key="t" class="topic">{{ t }}</code></span></div>
      </div>

      <div class="row mt-10">
        <button class="btn btn-sm" @click="copy('ghdesc', d.description || d.slug)">
          <AppIcon :name="copiedKey === 'ghdesc' ? 'check' : 'clipboard'" :size="12" />复制简介
        </button>
        <button class="btn btn-sm" @click="copy('ghurl', d.url)">
          <AppIcon :name="copiedKey === 'ghurl' ? 'check' : 'clipboard'" :size="12" />复制仓库地址
        </button>
      </div>
    </div>
  </template>
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
.search-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grow {
  flex: 1;
  min-width: 240px;
}
.repo-input {
  font-family: var(--mono);
}
.self-end {
  align-self: flex-end;
}
.warn-tip {
  color: var(--warning);
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.repo-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.repo-name {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  text-decoration: none;
}
.repo-name:hover {
  text-decoration: underline;
}
.repo-desc {
  margin-top: 6px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}
.stale-tip {
  color: var(--warning);
}
.num-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.num-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: var(--bg-soft);
  border-radius: 12px;
  padding: 12px 8px;
  color: var(--accent);
}
.num-card b {
  font-family: var(--mono);
  font-size: 20px;
  color: var(--text);
}
.num-card span {
  font-size: 12.5px;
  color: var(--muted);
}
.detail-list {
  display: flex;
  flex-direction: column;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.detail-k {
  color: var(--muted);
  flex-shrink: 0;
}
.detail-v {
  text-align: right;
  word-break: break-all;
}
.mono {
  font-family: var(--mono);
}
.topic {
  font-family: var(--mono);
  font-size: 12.5px;
  background: var(--bg-soft);
  border-radius: 6px;
  padding: 2px 8px;
  margin-left: 6px;
}
.retry-btn {
  margin-left: 10px;
}
</style>
