<script setup>
import { computed, onMounted, ref } from 'vue'
import { callFunction } from '@/utils/functions'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const url = ref('')
const loading = ref(false)
const feed = ref(null) // { title, link, items }
const error = ref('')

const { copiedKey, copy } = useCopy()

const short = (s) => (s && s.length <= 500 ? s : undefined)
useUrlState([{ key: 'u', ref: url, parse: short }])

const CACHE_KEY = 'toolbox-rss-last'
const CACHE_TTL = 15 * 60 * 1000

async function load(force = false) {
  const u = url.value.trim()
  if (!u) return
  // 本机缓存:15 分钟内同源免请求(纯展示缓存,不做订阅管理)
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (c && c.url === u && Date.now() - c.fetchedAt < CACHE_TTL) {
        feed.value = c.feed
        error.value = ''
        return
      }
    } catch { /* 忽略 */ }
  }
  loading.value = true
  error.value = ''
  feed.value = null
  try {
    const data = await callFunction('/api/rss', { url: u })
    feed.value = data
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ url: u, feed: data, fetchedAt: Date.now() }))
    } catch { /* 忽略 */ }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  if (url.value.trim()) load()
})

const items = computed(() => feed.value?.items || [])
const siteLink = computed(() => feed.value?.link || url.value)
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网,经本站 Functions 代理抓取 RSS/Atom 源(只读公开内容);本站不做订阅管理,数据不留在服务端。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="ctrl grow">
        <span class="field-label m-0">RSS / Atom 源地址</span>
        <input v-model="url" class="input url-input" type="text" spellcheck="false" placeholder="https://example.com/feed.xml" @keydown.enter="load()" />
      </label>
      <button class="btn btn-primary self-end" :disabled="loading || !url.trim()" @click="load(true)">
        <AppIcon :name="loading ? 'loader' : 'rss'" :size="14" />{{ loading ? '抓取中' : '载入订阅源' }}
      </button>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">
    ✗ {{ error }}
    <button class="btn btn-sm retry-btn" @click="load(true)">重试</button>
    <p v-if="error.includes('wrangler')" class="tip m-0 mt-8">提示:/api 接口由 Cloudflare Pages Functions 提供,本地纯 vite 环境没有;线上部署后自动可用。</p>
  </div>

  <template v-if="feed">
    <div class="panel feed-head mb-16">
      <div class="feed-title-row">
        <b class="feed-title">{{ feed.title || '未命名的订阅源' }}</b>
        <span class="tip">{{ items.length }} 条</span>
        <a :href="siteLink" target="_blank" rel="noopener" class="btn btn-sm">
          <AppIcon name="external-link" :size="13" />访问源站点
        </a>
      </div>
      <p class="tip m-0 mt-4">列表按源内顺序展示;点击标题在新标签打开原文。</p>
    </div>

    <div class="feed-list">
      <div v-for="(it, i) in items" :key="i" class="feed-item">
        <div class="fi-head">
          <a :href="it.link || siteLink" target="_blank" rel="noopener" class="fi-title">{{ it.title || '(无标题)' }}</a>
          <span v-if="it.date" class="fi-date">{{ it.date }}</span>
        </div>
        <p v-if="it.summary" class="fi-summary m-0">{{ it.summary }}</p>
        <div class="fi-ops">
          <button class="btn btn-sm" @click="copy(`rss-${i}`, it.link)">
            <AppIcon :name="copiedKey === `rss-${i}` ? 'check' : 'clipboard'" :size="12" />复制链接
          </button>
          <button v-if="it.summary" class="btn btn-sm" @click="copy(`rsst-${i}`, it.title)">
            <AppIcon :name="copiedKey === `rsst-${i}` ? 'check' : 'clipboard'" :size="12" />复制标题
          </button>
        </div>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      支持 RSS 2.0 与 Atom;抓取经本站 Functions 代理(绕开跨域,只读前 800KB),条目上限 50 条。
      最近一次载入的源缓存在本机浏览器(15 分钟),刷新页面免请求;换源即覆盖。
      找不到 RSS 地址?很多博客/新闻站把入口放在页面底部的 RSS 图标,或试着访问 域名/feed、域名/rss。
    </p>
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
.url-input {
  font-family: var(--mono);
}
.self-end {
  align-self: flex-end;
}
.feed-head {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.feed-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.feed-title {
  font-size: 16px;
}
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feed-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 16px;
}
.fi-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: baseline;
}
.fi-title {
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
  font-size: 15px;
  line-height: 1.6;
}
.fi-title:hover {
  color: var(--accent);
}
.fi-date {
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--muted);
  flex-shrink: 0;
}
.fi-summary {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.7;
}
.fi-ops {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.retry-btn {
  margin-left: 10px;
}
</style>
