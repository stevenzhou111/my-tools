<script setup>
import { computed, ref } from 'vue'
import { calcSubnet } from '@/utils/subnet'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const input = ref('192.168.1.100/24')
useUrlState([{ key: 'q', ref: input, parse: shortString(80) }])
const { copiedKey, copy } = useCopy()

const result = computed(() => calcSubnet(input.value))

const SAMPLES = ['192.168.1.100/24', '10.1.2.3/8', '172.16.4.6 255.255.255.240', '8.8.8.8/32']

const ROWS = computed(() => {
  const r = result.value
  if (!r || r.error || !r.network) return []
  return [
    ['网络地址', r.network],
    ['子网掩码', r.mask],
    ['反掩码(Wildcard)', r.wildcard],
    ['广播地址', r.broadcast],
    ['可用主机范围', r.usable ? `${r.firstHost} ~ ${r.lastHost}` : '无(RFC 3021 点对点/单机)'],
    ['地址总数', r.total.toLocaleString()],
    ['可用主机数', r.usable.toLocaleString()],
    ['地址类型', r.isPrivate ? '私有 / 内网地址' : '公网地址'],
  ]
})

function copyAll() {
  const text = ROWS.value.map(([k, v]) => `${k}: ${v}`).join('\n')
  copy('all', `${input.value}\n${text}`)
}
</script>

<template>
  <div class="field">
    <label class="field-label">IP / 前缀 或 IP + 掩码</label>
    <input v-model="input" class="input" placeholder="如 192.168.1.100/24 或 10.0.0.0 255.255.0.0" spellcheck="false" />
  </div>

  <div class="row" style="margin-bottom: 14px">
    <button v-for="s in SAMPLES" :key="s" class="btn btn-sm" @click="input = s">{{ s }}</button>
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.network">
    <div class="kv-table panel">
      <div v-for="[k, v] in ROWS" :key="k" class="kv-row">
        <span class="kv-key">{{ k }}</span>
        <code class="kv-val">{{ v }}</code>
      </div>
    </div>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copyAll">
        {{ copiedKey === 'all' ? '✓ 已复制' : '复制全部' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.kv-table {
  padding: 6px 0;
  overflow: hidden;
}
.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 9px 16px;
}
.kv-row + .kv-row {
  border-top: 1px solid var(--border);
}
.kv-key {
  color: var(--muted);
  font-size: 14px;
  flex-shrink: 0;
}
.kv-val {
  font-family: var(--mono);
  font-size: 14.5px;
  text-align: right;
  word-break: break-all;
}
</style>