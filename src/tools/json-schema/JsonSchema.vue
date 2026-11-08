<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { useCopy } from '@/utils/useCopy'

/**
 * JSON Schema 校验:ajv(懒加载)本地校验数据是否符合 schema。
 * 支持 Draft-07 与 2020-12;校验错误列出实例路径与原因。
 */

const DRAFTS = [
  { id: 'draft-07', label: 'Draft-07(最常见)' },
  { id: '2020-12', label: '2020-12(最新)' },
]

const schemaText = ref(JSON.stringify({
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    email: { type: 'string', format: 'email' },
  },
  additionalProperties: false,
}, null, 2))
const dataText = ref(JSON.stringify({ name: '张三', age: 28, email: 'zhang@example.com' }, null, 2))
const draft = ref('draft-07')
const { copiedKey, copy } = useCopy()

// ajv 懒加载(按草案选择入口),校验结果缓存在 state
const state = ref({ loading: false, out: null, draftInUse: '' })

async function ensureAjv(d) {
  if (d === '2020-12') {
    const { default: Ajv2020 } = await import('ajv/dist/2020')
    return new Ajv2020({ allErrors: true, strict: false })
  }
  const { default: Ajv } = await import('ajv')
  return new Ajv({ allErrors: true, strict: false })
}

async function run() {
  state.value = { loading: true, out: state.value.out, draftInUse: state.value.draftInUse }
  try {
    const AjvClass = await ensureAjv(draft.value)
    let schema, data
    try {
      schema = JSON.parse(schemaText.value)
    } catch (e) {
      state.value = { loading: false, out: { kind: 'schema-error', message: 'Schema 不是合法 JSON:' + e.message }, draftInUse: draft.value }
      return
    }
    try {
      data = JSON.parse(dataText.value)
    } catch (e) {
      state.value = { loading: false, out: { kind: 'data-error', message: '数据不是合法 JSON:' + e.message }, draftInUse: draft.value }
      return
    }
    const validate = AjvClass.compile(schema)
    const ok = validate(data)
    state.value = {
      loading: false,
      draftInUse: draft.value,
      out: ok
        ? { kind: 'pass' }
        : { kind: 'fail', errors: validate.errors.map((e) => ({ path: e.instancePath || '(根)', msg: e.message })) },
    }
  } catch (e) {
    state.value = { loading: false, draftInUse: draft.value, out: { kind: 'schema-error', message: 'Schema 本身不合法:' + e.message } }
  }
}

const errorSummary = computed(() => {
  const out = state.value.out
  if (out?.kind === 'fail') return out.errors.map((e) => `${e.path}: ${e.msg}`).join('\n')
  return ''
})
</script>

<template>
  <div class="row mb-14 ctrl-row">
    <label class="ctrl">
      <span class="field-label">Schema 草案</span>
      <select v-model="draft" class="select">
        <option v-for="d in DRAFTS" :key="d.id" :value="d.id">{{ d.label }}</option>
      </select>
    </label>
    <button class="btn btn-primary" :disabled="state.loading" @click="run">
      {{ state.loading ? '校验中…' : '校验' }}
    </button>
  </div>

  <div class="two-col">
    <div class="field">
      <label class="field-label" for="js-schema">JSON Schema</label>
      <textarea id="js-schema" v-model="schemaText" class="textarea" style="min-height: 220px" spellcheck="false"></textarea>
    </div>
    <div class="field">
      <label class="field-label" for="js-data">待校验数据</label>
      <textarea id="js-data" v-model="dataText" class="textarea" style="min-height: 220px" spellcheck="false"></textarea>
    </div>
  </div>

  <div v-if="state.out" class="panel mt-14" :class="state.out.kind === 'pass' ? 'pass-panel' : ''">
    <template v-if="state.out.kind === 'pass'">
      <p class="m-0 pass-text">✓ 校验通过 — 数据符合该 Schema({{ state.draftInUse }})</p>
    </template>
    <template v-else-if="state.out.kind === 'fail'">
      <p class="m-0 fail-text">✗ 不符合 Schema,共 {{ state.out.errors.length }} 处:</p>
      <pre class="output">{{ errorSummary }}</pre>
      <div class="row mt-10">
        <button class="btn btn-sm" @click="copy('errs', errorSummary)">
          {{ copiedKey === 'errs' ? '✓ 已复制' : '复制错误' }}
        </button>
      </div>
    </template>
    <template v-else>
      <p class="m-0 fail-text">✗ {{ state.out.message }}</p>
    </template>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
.pass-text { color: var(--success, #16a34a); font-weight: 600; }
.fail-text { color: var(--danger, #dc2626); font-weight: 600; }
</style>
