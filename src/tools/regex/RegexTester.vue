<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'

const pattern = ref('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
const flags = ref(['g'])
// 正则与 flags 同步到地址栏,可直接分享可复现的测试用例
useUrlState([
  { key: 're', ref: pattern, parse: shortString(300) },
  { key: 'f', ref: flags, parse: (s) => [...s].filter((f) => ['g', 'i', 'm', 's', 'u'].includes(f)), serialize: (v) => [...new Set(v)].join('') },
])
const testText = ref(`请联系 support@example.com 或 sales@test.org,
也可以发邮件到 zhang.san+dev@mail.example.cn 获取帮助。`)

const { copiedKey, copy } = useCopy()

const FLAG_ITEMS = [
  { id: 'g', label: 'g 全局' },
  { id: 'i', label: 'i 忽略大小写' },
  { id: 'm', label: 'm 多行' },
  { id: 's', label: 's 点号匹配换行' },
  { id: 'u', label: 'u Unicode' },
]

// 常用正则速查,点击即填入(点击后自行核对业务边界,如身份证尾号校验位)
const PRESETS = [
  { label: '邮箱', re: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}' },
  { label: '手机号(大陆)', re: '1[3-9]\\d{9}' },
  { label: 'URL', re: 'https?://[^\\s<>"\']+' },
  { label: 'IPv4', re: '(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)' },
  { label: '身份证(18 位)', re: '[1-9]\\d{5}(?:18|19|20)\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]' },
  { label: '日期 YYYY-MM-DD', re: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])' },
  { label: '中文字符', re: '[\\u4e00-\\u9fff]+' },
  { label: '十六进制颜色', re: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b' },
  { label: '正整数', re: '[1-9]\\d*' },
  { label: '空白字符', re: '\\s+' },
]
function usePreset(p) {
  pattern.value = p.re
}

const flagsStr = computed(() => [...new Set(flags.value)].join(''))

const error = computed(() => {
  if (!pattern.value) return ''
  try {
    new RegExp(pattern.value, flagsStr.value)
    return ''
  } catch (e) {
    return e.message
  }
})

// 检测常见的嵌套量词写法,提醒灾难性回溯风险(同步正则无法中断,只能预防)
const backtrackRisk = computed(() => {
  if (!pattern.value) return false
  return /\([^()]*[+*]\)[+*{]|\([^()]*\{\d+,?\d*\}\)[+*{]/.test(pattern.value)
})

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const MATCH_LIMIT = 500

const result = computed(() => {
  if (!pattern.value || error.value || !testText.value) return null
  let re
  try {
    re = new RegExp(pattern.value, flagsStr.value.includes('g') ? flagsStr.value : flagsStr.value + 'g')
  } catch {
    return null
  }
  const parts = []
  const matches = []
  let last = 0
  let m
  let count = 0
  let truncated = false
  while ((m = re.exec(testText.value)) !== null) {
    if (count >= MATCH_LIMIT) {
      truncated = true
      break
    }
    if (m[0] === '') {
      // 零宽匹配:跳过高亮并前移,避免死循环
      re.lastIndex++
      continue
    }
    if (m.index > last) parts.push(escapeHtml(testText.value.slice(last, m.index)))
    parts.push(`<mark>${escapeHtml(m[0])}</mark>`)
    matches.push({ index: m.index, text: m[0], groups: m.slice(1) })
    last = re.lastIndex
    count++
  }
  parts.push(escapeHtml(testText.value.slice(last)))
  return { html: parts.join(''), matches, truncated }
})
</script>

<template>
  <div class="field">
    <label class="field-label">正则表达式</label>
    <div class="pattern-row">
      <span class="slash">/</span>
      <input v-model="pattern" v-draft="'regex-pattern'" class="input pattern-input" spellcheck="false" placeholder="输入正则表达式" />
      <span class="slash">/{{ flagsStr }}</span>
    </div>
    <div class="row" style="margin-top: 8px">
      <label v-for="f in FLAG_ITEMS" :key="f.id" class="check">
        <input v-model="flags" type="checkbox" :value="f.id" />{{ f.label }}
      </label>
    </div>

    <details class="panel" style="margin-top: 12px">
      <summary>📋 常用正则速查(点击填入)</summary>
      <div class="row preset-row">
        <button v-for="p in PRESETS" :key="p.label" class="btn btn-sm" :title="p.re" @click="usePreset(p)">
          {{ p.label }}
        </button>
      </div>
    </details>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ 无效正则:{{ error }}</div>

  <div class="field">
    <label class="field-label">测试文本</label>
    <textarea v-draft="'regex-text'" v-model="testText" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <div v-if="backtrackRisk" class="error-box" style="margin-bottom: 12px">
    ⚠️ 检测到嵌套量词(如 (a+)+),这类正则可能引发灾难性回溯导致页面卡死,请谨慎测试
  </div>

  <template v-if="result">
    <label class="field-label">
      高亮结果(匹配 {{ result.matches.length }} 处{{ result.truncated ? ',已达上限仅展示前 500 处' : '' }})
    </label>
    <!-- eslint-disable-next-line vue/no-v-html — 测试文本已做 HTML 转义 -->
    <pre class="output highlight-out" v-html="result.html"></pre>

    <div v-if="result.matches.length" class="match-list">
      <div v-for="(m, i) in result.matches" :key="i" class="match-item">
        <span class="match-no">#{{ i + 1 }}</span>
        <code class="match-text">{{ m.text }}</code>
        <span class="match-pos">@ {{ m.index }}</span>
        <template v-if="m.groups.length">
          <span v-for="(g, gi) in m.groups" :key="gi" class="match-group">
            分组{{ gi + 1 }}: <code>{{ g ?? '—' }}</code>
          </span>
        </template>
      </div>
    </div>

    <div class="row" style="margin-top: 10px">
      <button
        v-if="result.matches.length"
        class="btn btn-sm"
        @click="copy('matches', result.matches.map((m) => m.text).join('\n'))"
      >
        {{ copiedKey === 'matches' ? '✓ 已复制全部匹配' : '复制全部匹配' }}
      </button>
    </div>
  </template>
</template>

<style scoped>
.pattern-row {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.pattern-row:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.pattern-input {
  border: none;
  box-shadow: none !important;
  font-family: var(--mono);
  flex: 1;
}
.slash {
  padding: 0 10px;
  color: var(--muted);
  font-family: var(--mono);
}
.preset-row {
  margin-top: 8px;
}
.highlight-out {
  white-space: pre-wrap;
}
.match-list {
  margin-top: 14px;
  display: grid;
  gap: 6px;
}
.match-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  padding: 6px 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.match-no {
  color: var(--muted);
  font-family: var(--mono);
}
.match-text {
  color: var(--accent);
  word-break: break-all;
}
.match-pos {
  color: var(--muted);
}
.match-group {
  color: var(--muted);
}
</style>
