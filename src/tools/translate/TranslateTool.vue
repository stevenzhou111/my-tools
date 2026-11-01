<script setup>
import { computed, onMounted, ref } from 'vue'
import { translate, byteLength, MAX_BYTES, LANGS, langName } from '@/utils/translate'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const input = ref('')
const output = ref('')
const from = ref('zh-CN')
const to = ref('en')
const loading = ref(false)
const error = ref('')
const fromCache = ref(false)

const { copiedKey, copy } = useCopy()

useUrlState([
  { key: 'f', ref: from, parse: (s) => (LANGS.some((l) => l.code === s) ? s : undefined) },
  { key: 't', ref: to, parse: (s) => (LANGS.some((l) => l.code === s) ? s : undefined) },
])

const bytes = computed(() => byteLength(input.value))
const overLimit = computed(() => bytes.value > MAX_BYTES)

async function run() {
  if (overLimit.value || !input.value.trim()) return
  loading.value = true
  error.value = ''
  const r = await translate(input.value, from.value, to.value)
  loading.value = false
  if (r.error && !r.text) {
    error.value = r.error
    output.value = ''
    return
  }
  output.value = r.text
  fromCache.value = r.fromCache
  if (r.error) error.value = r.error // 缓存回退的提示,翻译结果仍展示
}

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
  if (output.value) {
    input.value = output.value
    output.value = ''
    run()
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <div class="online-banner panel mb-16">
    <AppIcon name="wifi" :size="15" />
    <span>本工具需要联网(MyMemory 免费翻译,无密钥;匿名额度约 5000 字节/日,结果缓存在本机 24 小时)。</span>
  </div>

  <div class="panel mb-16">
    <div class="lang-row">
      <label class="ctrl">
        <span class="field-label m-0">源语言</span>
        <select v-model="from" class="select lang-select">
          <option v-for="l in LANGS" :key="l.code" :value="l.code">{{ l.name }}({{ l.code }})</option>
        </select>
      </label>
      <button class="btn swap-btn self-end" title="交换语言并续翻结果" aria-label="交换语言" @click="swap">
        <AppIcon name="arrow-left-right" :size="16" />
      </button>
      <label class="ctrl">
        <span class="field-label m-0">目标语言</span>
        <select v-model="to" class="select lang-select">
          <option v-for="l in LANGS" :key="l.code" :value="l.code">{{ l.name }}({{ l.code }})</option>
        </select>
      </label>
      <div class="ops self-end">
        <button class="btn btn-primary" :disabled="loading || !input.trim() || overLimit" @click="run">
          <AppIcon :name="loading ? 'loader' : 'languages'" :size="14" />{{ loading ? '翻译中' : '翻译' }}
        </button>
        <button class="btn" @click="clearAll">清空</button>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="label-row">
        <label class="field-label" for="trans-in">{{ langName(from) }}</label>
        <span class="tip mono-count" :class="{ over: overLimit }">{{ bytes }} / {{ MAX_BYTES }} 字节</span>
      </div>
      <textarea
        id="trans-in"
        v-model="input"
        v-draft="'translate-in'"
        class="textarea src-area"
        spellcheck="false"
        placeholder="输入要翻译的文本…(单次上限 500 字节,中文约 166 字)"
      ></textarea>
    </div>
    <div>
      <div class="label-row">
        <label class="field-label" for="trans-out">{{ langName(to) }}</label>
        <span class="row gap-8">
          <span v-if="fromCache" class="tip cache-tag">来自缓存</span>
          <button class="btn btn-sm" :disabled="!output" @click="copy('trans', output)">
            <AppIcon :name="copiedKey === 'trans' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'trans' ? '已复制' : '复制' }}
          </button>
        </span>
      </div>
      <textarea
        id="trans-out"
        class="textarea src-area"
        readonly
        :value="output"
        :placeholder="loading ? '翻译中…' : '翻译结果'"
        aria-label="翻译结果"
      ></textarea>
    </div>
  </div>

  <div v-if="error" class="error-box mt-14">✗ {{ error }}</div>
  <p v-else-if="overLimit" class="tip warn-tip mt-14">⚠ 内容超过 {{ MAX_BYTES }} 字节,请缩短或分段翻译(MyMemory 免费接口按字节计,中文每字 3 字节)。</p>

  <div class="panel mt-16">
    <p class="tip m-0">
      翻译引擎为 MyMemory 翻译记忆库(机器翻译 + 人工语料),质量适合大意理解,正式文档请人工校对;
      匿名额度按 IP 计约 5000 字节/日,同一文本 24 小时内重复翻译不重复消耗额度。
      源语言不支持自动检测,请手动选择;本站不存储任何翻译内容。
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
.lang-row {
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
.lang-select {
  min-width: 160px;
}
.swap-btn {
  height: 40px;
  width: 40px;
  display: grid;
  place-items: center;
  padding: 0;
}
.ops {
  display: flex;
  gap: 8px;
}
.self-end {
  align-self: flex-end;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.mono-count {
  font-family: var(--mono);
}
.mono-count.over {
  color: var(--danger);
  font-weight: 700;
}
.src-area {
  min-height: 190px;
  font-size: 14.5px;
}
.cache-tag {
  color: var(--muted);
  background: var(--bg-soft);
  border-radius: 999px;
  padding: 2px 10px;
}
.warn-tip {
  color: var(--warning);
}
</style>
