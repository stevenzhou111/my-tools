<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`联系我们:support@example.com 或 sales@test.org
官网:https://example.com/docs?q=工具&page=1
电话:13812345678,备用 159 8765 4321
服务器 IP:192.168.1.100 和 10.0.0.1
数量:42 件,单价 3.5 元`)

const mode = ref('url')
const dedupe = ref(true)
const { copiedKey, copy } = useCopy()

const PATTERNS = {
  url: { label: 'URL 链接', re: /https?:\/\/[^\s"'<>）】]+/g },
  email: { label: '邮箱地址', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  number: { label: '数字', re: /-?\d+(?:\.\d+)?/g },
  // 用捕获组替代 lookbehind,兼容 Safari < 16.4
  phone: { label: '手机号', re: /(^|\D)(1[3-9]\d{9})(?=\D|$)/g, group: 2 },
  ipv4: {
    label: 'IPv4 地址',
    re: /(^|\D)((?:\d{1,3}\.){3}\d{1,3})(?=\D|$)/g,
    group: 2,
    validate: (ip) => ip.split('.').every((n) => +n <= 255),
  },
}

const results = computed(() => {
  const p = PATTERNS[mode.value]
  if (!input.value.trim()) return []
  const found = []
  for (const m of input.value.matchAll(p.re)) {
    const value = p.group ? m[p.group] : m[0]
    if (p.validate && !p.validate(value)) continue
    found.push(value)
  }
  return dedupe.value ? [...new Set(found)] : found
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label v-for="(p, key) in PATTERNS" :key="key" class="check">
      <input v-model="mode" type="radio" :value="key" />{{ p.label }}
    </label>
    <label class="check"><input v-model="dedupe" type="checkbox" />去重</label>
  </div>

  <div class="field">
    <label class="field-label">输入文本</label>
    <textarea v-draft="'extract'" v-model="input" class="textarea" rows="7" spellcheck="false"></textarea>
  </div>

  <template v-if="results.length">
    <label class="field-label">提取结果({{ results.length }} 条)</label>
    <pre class="output">{{ results.join('\n') }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', results.join('\n'))">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
      </button>
      <button class="btn btn-sm" @click="copy('comma', results.join(', '))">
        {{ copiedKey === 'comma' ? '✓ 已复制' : '复制(逗号分隔)' }}
      </button>
    </div>
  </template>
  <p v-else class="tip">没有提取到匹配内容。</p>
</template>
