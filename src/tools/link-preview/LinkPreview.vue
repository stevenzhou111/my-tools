<script setup>
import { computed, onMounted, ref } from 'vue'
import { callFunction } from '@/utils/functions'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const url = ref('')
const loading = ref(false)
const result = ref(null)
const error = ref('')

const { copiedKey, copy } = useCopy()

useUrlState([{ key: 'u', ref: url, parse: shortString(500) }])

async function fetchMeta() {
  const u = url.value.trim()
  if (!u) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await callFunction('/api/fetch-meta', { url: u })
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  if (url.value.trim()) fetchMeta()
})

const displayTitle = computed(() => result.value?.ogTitle || result.value?.title || '')
const ROWS = computed(() => {
  if (!result.value) return []
  return [
    { label: '标题', value: displayTitle.value, key: 'title' },
    { label: '描述', value: result.value.description, key: 'desc' },
    { label: 'og:image', value: result.value.ogImage, key: 'og' },
    { label: '最终地址(重定向后)', value: result.value.url, key: 'url' },
  ].filter((r) => r.value)
})

const devHint = computed(() => error.value.includes('wrangler'))
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网,经本站 Functions 代理抓取目标页(不带你的 Cookie,不注入脚本)。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="ctrl grow">
        <span class="field-label m-0">网页地址</span>
        <input v-model="url" class="input url-input" type="text" spellcheck="false" placeholder="https://example.com/article" @keydown.enter="fetchMeta" />
      </label>
      <button class="btn btn-primary self-end" :disabled="loading || !url.trim()" @click="fetchMeta">
        <AppIcon :name="loading ? 'loader' : 'search'" :size="14" />{{ loading ? '抓取中' : '抓取元信息' }}
      </button>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">
    ✗ {{ error }}
    <button class="btn btn-sm retry-btn" @click="fetchMeta">重试</button>
    <p v-if="devHint" class="tip m-0 mt-8">提示:/api 接口由 Cloudflare Pages Functions 提供,本地纯 vite 环境没有;请用 <code>wrangler pages dev</code> 体验,线上部署后自动可用。</p>
  </div>

  <div v-if="result" class="panel result-panel mb-16">
    <p class="m-0 mb-10"><b>元信息</b>(分享卡片用的就是这些字段)</p>
    <div v-for="r in ROWS" :key="r.key" class="meta-row">
      <span class="meta-label">{{ r.label }}</span>
      <span class="meta-value">{{ r.value }}</span>
      <button class="btn btn-sm" @click="copy(r.key, r.value)">
        <AppIcon :name="copiedKey === r.key ? 'check' : 'clipboard'" :size="12" />{{ copiedKey === r.key ? '已复制' : '复制' }}
      </button>
    </div>
  </div>

  <div class="panel mt-16">
    <p class="tip m-0">
      抓取经本站 Functions 代理完成(绕开浏览器跨域限制):不携带你的任何 Cookie、不执行页面脚本,只读前 400KB 的 HTML 提取元信息;
      内网地址被拒绝访问。分享卡片(微信/Twitter 卡片)展示的就是 title / description / og:image 三个字段,写文章配链接时可以核对效果。
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
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.meta-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.meta-row:last-child {
  border-bottom: none;
}
.meta-label {
  color: var(--muted);
  flex-shrink: 0;
}
.meta-value {
  word-break: break-all;
  line-height: 1.7;
}
.retry-btn {
  margin-left: 10px;
}
@media (max-width: 720px) {
  .meta-row {
    grid-template-columns: 1fr auto;
  }
  .meta-label {
    grid-column: 1 / -1;
  }
}
</style>
