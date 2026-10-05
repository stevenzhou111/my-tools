<script setup>
import { computed, ref } from 'vue'
import { parseCurl, toFetchCode, toPythonCode } from '@/utils/curlCode'
import { useCopy } from '@/utils/useCopy'

const cmd = ref(`curl -X POST 'https://api.example.com/v1/users' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Token: abc123' \\
  -d '{"name":"张三","age":25}'`)

const lang = ref('fetch')
const { copiedKey, copy } = useCopy()

const parsed = computed(() => parseCurl(cmd.value))
const code = computed(() => {
  if (!parsed.value.ok) return ''
  return lang.value === 'fetch' ? toFetchCode(parsed.value) : toPythonCode(parsed.value)
})

// curl 里常带密钥,命令本身不同步到地址栏(与 pangu 同策略)
const SAMPLES = [
  {
    label: 'GET 请求',
    cmd: `curl https://api.github.com/repos/vuejs/core`,
  },
  {
    label: '登录表单',
    cmd: `curl -X POST https://a.b/login -u admin:secret -d username=admin -d password=123456`,
  },
  {
    label: '文件上传',
    cmd: `curl -F file=@photo.png -F desc=头像 https://up.example.com/upload`,
  },
  {
    label: '查询参数',
    cmd: `curl --get 'https://a.b/search' --data-urlencode q=你好世界 -d page=2`,
  },
]
</script>

<template>
  <div class="field">
    <label class="field-label" for="curl-in">curl 命令(支持多行续行 \ 与引号)</label>
    <textarea id="curl-in" v-model="cmd" class="textarea" style="min-height: 130px" spellcheck="false" placeholder="粘贴 curl 命令…"></textarea>
    <div class="row" style="margin-top: 8px">
      <button v-for="s in SAMPLES" :key="s.label" class="btn btn-sm" @click="cmd = s.cmd">例:{{ s.label }}</button>
      <button class="btn btn-sm" @click="cmd = ''">清空</button>
    </div>
    <p class="tip" style="margin-top: 6px">命令里常带 Token / 密码,本工具不把命令写入地址栏,也绝不发送任何请求。</p>
  </div>

  <div v-if="!parsed.ok" class="error-box" style="margin-bottom: 14px">✗ {{ parsed.error }}</div>

  <template v-else>
    <div v-if="parsed.unknown.length" class="error-box" style="margin-bottom: 14px">
      ⚠️ 这些旗标没有被识别,已忽略,请手动确认:{{ parsed.unknown.join(' ') }}
    </div>

    <div class="row" style="margin-bottom: 12px" role="tablist">
      <button class="btn" :class="{ 'btn-primary': lang === 'fetch' }" role="tab" :aria-selected="lang === 'fetch'" @click="lang = 'fetch'">
        JavaScript fetch
      </button>
      <button class="btn" :class="{ 'btn-primary': lang === 'python' }" role="tab" :aria-selected="lang === 'python'" @click="lang = 'python'">
        Python requests
      </button>
    </div>

    <pre class="output code-out">{{ code }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copy('code', code)">
        {{ copiedKey === 'code' ? '✓ 已复制' : '复制代码' }}
      </button>
      <span class="tip">{{ parsed.method }} {{ parsed.url }}</span>
    </div>

    <details class="panel" style="margin-top: 14px">
      <summary>📖 支持范围</summary>
      <p class="tip">
        解析 -X 方法、-H 请求头、-d / --data* 请求体(多个自动用 &amp; 连接,JSON 体自动补 Content-Type)、
        -F / --form 表单(含 @文件,生成 FormData / files 代码)、-u 基本认证(现场算出 Authorization 头)、
        --get(数据拼进查询串)。未识别的旗标会列在上方提醒,不会被静默丢弃;
        生成的代码只是模板,网络请求请在你自己的环境里发出。
      </p>
    </details>
  </template>
</template>

<style scoped>
.code-out {
  min-height: 160px;
}
</style>
