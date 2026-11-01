<script setup>
import { computed, onMounted, ref } from 'vue'
import { resolveDns, DNS_TYPES, statusText } from '@/utils/dnsQuery'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const name = ref('github.com')
const type = ref('A')
const loading = ref(false)
const result = ref(null) // { status, records, source, stale, fetchedAt, error }

const { copiedKey, copy } = useCopy()

const short = (s) => (s && s.length <= 100 ? s : undefined)
useUrlState([
  { key: 'n', ref: name, parse: short },
  { key: 't', ref: type, parse: (s) => (DNS_TYPES.some((x) => x.id === s) ? s : undefined) },
])

async function lookup() {
  loading.value = true
  result.value = await resolveDns(name.value, type.value)
  loading.value = false
}
onMounted(() => {
  if (name.value.trim()) lookup()
})

const statusLine = computed(() => {
  if (!result.value || result.value.status === -1) return ''
  return statusText(result.value.status)
})

const cacheAgeText = computed(() => {
  if (!result.value?.fetchedAt) return ''
  const mins = Math.max(0, Math.round((Date.now() - result.value.fetchedAt) / 60000))
  return mins < 60 ? `${mins} 分钟前` : `${Math.round(mins / 60)} 小时前`
})
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网(DNS over HTTPS:阿里 DNS 优先、Google 兜底;免费无密钥)。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="ctrl grow">
        <span class="field-label m-0">域名</span>
        <input v-model="name" class="input domain-input" type="text" spellcheck="false" placeholder="example.com" @keydown.enter="lookup" />
      </label>
      <label class="ctrl">
        <span class="field-label m-0">记录类型</span>
        <select v-model="type" class="select type-select">
          <option v-for="t in DNS_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
      </label>
      <button class="btn btn-primary self-end" :disabled="loading" @click="lookup">
        <AppIcon :name="loading ? 'loader' : 'search'" :size="14" />{{ loading ? '查询中' : '查询' }}
      </button>
    </div>
  </div>

  <div v-if="result?.error" class="error-box mb-14">
    ✗ {{ result.error }}
    <button class="btn btn-sm retry-btn" @click="lookup">重试</button>
  </div>

  <template v-else-if="result && result.status !== -1">
    <div class="panel result-panel mb-16">
      <div class="status-row">
        <span class="status-badge" :class="{ nx: result.status === 3 }">{{ statusLine }}</span>
        <span class="tip">{{ name }} · {{ type }}</span>
        <span class="tip source-tip">解析源:{{ result.source }}{{ result.stale ? '(缓存回退)' : '' }}</span>
      </div>
      <p v-if="result.stale" class="tip stale-tip m-0 mt-8">⚠ 当前为缓存数据({{ cacheAgeText }}获取),网络恢复后重新查询更新。</p>
      <p v-else class="tip m-0 mt-8">查询{{ result.fetchedAt ? `于 ${cacheAgeText}完成` : '' }} · 结果缓存 5 分钟</p>
    </div>

    <div v-if="result.records.length" class="panel">
      <p class="m-0 mb-10"><b>{{ result.records.length }} 条 {{ type }} 记录</b></p>
      <div v-for="(r, i) in result.records" :key="i" class="rec-row">
        <span class="rec-ttl">TTL {{ r.TTL }}</span>
        <span class="rec-data">{{ r.data }}</span>
        <button class="btn btn-sm" @click="copy(`dns-${i}`, r.data)">
          <AppIcon :name="copiedKey === `dns-${i}` ? 'check' : 'clipboard'" :size="12" />复制
        </button>
      </div>
    </div>
    <div v-else class="panel empty-hint">
      <p class="m-0 tip">该域名没有 {{ type }} 记录{{ result.status === 3 ? '(域名不存在或已过期)' : '' }}。</p>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      DNS over HTTPS(DoH)把域名查询也走了加密通道,可用来排查解析记录、验证 CDN/邮件配置(TXT/SPF、MX)。
      结果按「域名+类型」缓存 5 分钟;刚改完解析想立刻验证,请点查询强制刷新本机缓存外的数据。
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
  min-width: 220px;
}
.domain-input {
  font-family: var(--mono);
}
.type-select {
  min-width: 170px;
}
.self-end {
  align-self: flex-end;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.status-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(21, 128, 61, 0.12);
  color: var(--success);
}
.status-badge.nx {
  background: var(--danger-soft);
  color: var(--danger);
}
.source-tip {
  margin-left: auto;
}
.stale-tip {
  color: var(--warning);
}
.rec-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14px;
}
.rec-row:last-child {
  border-bottom: none;
}
.rec-ttl {
  font-family: var(--mono);
  color: var(--muted);
  font-size: 12.5px;
  flex-shrink: 0;
  width: 80px;
}
.rec-data {
  flex: 1;
  font-family: var(--mono);
  word-break: break-all;
}
.empty-hint {
  text-align: center;
  padding: 28px 16px;
}
.retry-btn {
  margin-left: 10px;
}
</style>
