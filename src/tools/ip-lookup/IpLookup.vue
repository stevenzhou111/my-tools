<script setup>
import { computed, onMounted, ref } from 'vue'
import { lookupIp } from '@/utils/ipLookup'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const ipInput = ref('')
const loading = ref(false)
const result = ref(null)
const error = ref('')

const { copiedKey, copy } = useCopy()

const short = (s) => (s && s.length <= 60 ? s : undefined)
useUrlState([{ key: 'ip', ref: ipInput, parse: short }])

async function load() {
  loading.value = true
  error.value = ''
  result.value = await lookupIp(ipInput.value.trim())
  loading.value = false
}
onMounted(() => load())

const d = computed(() => result.value?.data || null)
const cacheAgeText = computed(() => {
  if (!result.value?.fetchedAt) return ''
  const mins = Math.max(0, Math.round((Date.now() - result.value.fetchedAt) / 60000))
  return mins < 60 ? `${mins} 分钟前` : `${Math.round(mins / 60)} 小时前`
})

const ROWS = computed(() => {
  if (!d.value) return []
  return [
    { k: '位置', v: [d.value.country, d.value.region, d.value.city].filter(Boolean).join(' · ') || '—' },
    { k: '运营商 / 组织', v: d.value.isp || '—' },
    { k: 'IP 类型', v: d.value.type || '—' },
    { k: '时区', v: [d.value.timezone, d.value.utcOffset ? `UTC${d.value.utcOffset}` : ''].filter(Boolean).join(' ') || '—' },
    { k: '经纬度', v: d.value.latitude != null ? `${d.value.latitude}, ${d.value.longitude}` : '—' },
  ]
})

const MAPS = computed(() => {
  if (d.value?.latitude == null) return []
  const { latitude: la, longitude: lo } = d.value
  return [
    { name: '高德地图', url: `https://uri.amap.com/marker?position=${lo},${la}` },
    { name: 'Google 地图', url: `https://www.google.com/maps?q=${la},${lo}` },
  ]
})
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网(ipwho.is 优先、ip.sb 兜底,免费无密钥);查询记录仅缓存在本机浏览器。</span>
  </div>

  <div class="panel mb-16">
    <div class="search-row">
      <label class="ctrl grow">
        <span class="field-label m-0">IP 地址(留空 = 查本机公网 IP)</span>
        <input v-model="ipInput" class="input ip-input" type="text" spellcheck="false" placeholder="如 8.8.8.8 或 2606:4700::1111,回车查询" @keydown.enter="load" />
      </label>
      <button class="btn btn-primary self-end" :disabled="loading" @click="load">
        <AppIcon :name="loading ? 'loader' : 'search'" :size="14" />{{ loading ? '查询中' : ipInput.trim() ? '查询该 IP' : '查本机 IP' }}
      </button>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">
    ✗ {{ error }}
    <button class="btn btn-sm retry-btn" @click="load">重试</button>
  </div>

  <template v-else-if="d">
    <div class="panel result-panel mb-16">
      <div class="ip-row">
        <span class="ip-value">{{ d.ip }}</span>
        <span v-if="result.source" class="ip-source tip">{{ result.source }}{{ result.stale ? '(缓存回退)' : '' }} · {{ cacheAgeText }}</span>
        <button class="btn btn-sm" @click="copy('ip', d.ip)">
          <AppIcon :name="copiedKey === 'ip' ? 'check' : 'clipboard'" :size="12" />复制 IP
        </button>
      </div>
      <div class="detail-list">
        <div v-for="r in ROWS" :key="r.k" class="detail-row">
          <span class="detail-k">{{ r.k }}</span>
          <span class="detail-v">{{ r.v }}</span>
        </div>
      </div>
      <div v-if="MAPS.length" class="row map-row">
        <span class="tip">在地图查看:</span>
        <a v-for="m in MAPS" :key="m.name" :href="m.url" target="_blank" rel="noopener" class="btn btn-sm">{{ m.name }}</a>
      </div>
    </div>
  </template>

  <div class="panel mt-16">
    <p class="tip m-0">
      归属地数据库由第三方提供,城市级精度仅供大体参考(移动网络与 CDN 出口常会偏移);
      查询记录仅缓存在本机。查本机时显示的是你的出口公网 IP——公司内网下多为出口网关地址。
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
.ip-input {
  font-family: var(--mono);
}
.self-end {
  align-self: flex-end;
}
.result-panel {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
.ip-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.ip-value {
  font-family: var(--mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--accent);
  word-break: break-all;
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
}
.detail-v {
  font-weight: 600;
  text-align: right;
  word-break: break-all;
}
.map-row {
  margin-top: 12px;
  gap: 8px;
  align-items: center;
}
.retry-btn {
  margin-left: 10px;
}
</style>
