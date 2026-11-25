<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { convertEnvSource } from '@/utils/envConvert'

const FORMATS = [
  { id: 'env', label: '.env' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
]
const PLACEHOLDER = {
  env: 'NODE_ENV=production\nAPI_BASE="https://api.example.com/v1"\nDEBUG=false',
  json: '{ "NODE_ENV": "production", "API_BASE": "https://api.example.com/v1", "DEBUG": "false" }',
  yaml: 'NODE_ENV: production\nAPI_BASE: https://api.example.com/v1\nDEBUG: "false"',
}
const SAMPLES = {
  env: '# 应用配置\nNODE_ENV=production\nAPI_BASE="https://api.example.com/v1"\nDEBUG=false\nAPP_NAME="My App"',
  json: '{\n  "NODE_ENV": "production",\n  "API_BASE": "https://api.example.com/v1",\n  "DEBUG": "false",\n  "APP_NAME": "My App"\n}',
  yaml: 'NODE_ENV: production\nAPI_BASE: https://api.example.com/v1\nDEBUG: "false"\nAPP_NAME: My App\n',
}

const from = ref('env')
const to = ref('json')
const input = ref('')
const exportPrefix = ref(false)

const result = computed(() =>
  convertEnvSource(input.value, from.value, to.value, { exportPrefix: exportPrefix.value }),
)

function swap() {
  if (result.value.text) input.value = result.value.text
  const t = from.value
  from.value = to.value
  to.value = t
}

function useSample() {
  input.value = SAMPLES[from.value]
}

function clearAll() {
  input.value = ''
}
</script>

<template>
  <p class="tip mb-14">
    在 .env、JSON、YAML 之间互转扁平键值配置。.env 支持 <code>export KEY=</code>、单双引号、转义与行内注释;
    只支持扁平结构,嵌套对象会明确报错。转到 .env 时,含空格、#、引号或换行的值会自动加引号。
  </p>

  <div class="panel">
    <div class="row row-wrap">
      <div class="field fmt-field">
        <label class="field-label" for="ec-from">从</label>
        <select id="ec-from" v-model="from" class="select">
          <option v-for="f in FORMATS" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
      <button class="btn swap-btn" title="交换输入与输出格式" @click="swap">⇄</button>
      <div class="field fmt-field">
        <label class="field-label" for="ec-to">到</label>
        <select id="ec-to" v-model="to" class="select">
          <option v-for="f in FORMATS" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
      </div>
      <label v-if="to === 'env'" class="check ml-auto">
        <input v-model="exportPrefix" type="checkbox" />
        <span>输出 export 前缀</span>
      </label>
    </div>
  </div>

  <div class="grid-2 mt-14">
    <div class="field">
      <div class="row head-row">
        <span class="field-label">{{ FORMATS.find((f) => f.id === from)?.label }} 输入</span>
        <span class="ml-auto"></span>
        <button class="btn btn-sm" @click="useSample">示例</button>
        <button class="btn btn-sm" :disabled="!input" @click="clearAll">清空</button>
      </div>
      <textarea
        v-model="input"
        class="textarea mono"
        spellcheck="false"
        :placeholder="PLACEHOLDER[from]"
      ></textarea>
    </div>

    <div class="field">
      <div class="row head-row">
        <span class="field-label">{{ FORMATS.find((f) => f.id === to)?.label }} 输出</span>
        <span class="ml-auto"></span>
        <CopyButton class="btn btn-sm" :text="result.text" label="复制" copied-label="✓ 已复制" />
      </div>
      <textarea
        class="textarea mono"
        readonly
        spellcheck="false"
        :value="result.text"
        placeholder="转换结果会出现在这里"
      ></textarea>
    </div>
  </div>

  <div v-if="result.error" class="error-box mt-12">✗ {{ result.error }}</div>
  <div v-if="result.warnings.length" class="warn-box mt-12">
    <p v-for="(w, i) in result.warnings" :key="i">! {{ w }}</p>
  </div>

  <p class="tip mt-12">
    配置里常有数据库密码、API Key:本工具不写入地址栏、不保存草稿、不上传网络,
    内容只在当前页面内存中处理。关闭或刷新页面即消失。
  </p>
</template>

<style scoped>
.mono {
  font-family: var(--mono);
}
.row-wrap {
  flex-wrap: wrap;
}
.fmt-field {
  flex: 0 0 110px;
}
.swap-btn {
  align-self: flex-end;
  margin-bottom: 1px;
}
.ml-auto {
  margin-left: auto;
}
.head-row {
  margin-bottom: 6px;
  align-items: center;
  gap: 8px;
}
.textarea {
  min-height: 240px;
  resize: vertical;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  align-self: flex-end;
  padding-bottom: 9px;
}
.warn-box {
  border: 1px solid rgba(217, 119, 6, 0.4);
  background: rgba(217, 119, 6, 0.1);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--muted);
}
.warn-box p {
  margin: 2px 0;
}
@media (max-width: 720px) {
  .textarea {
    min-height: 160px;
  }
}
</style>