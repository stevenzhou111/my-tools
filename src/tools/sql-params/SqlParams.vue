<script setup>
import { computed, ref } from 'vue'
import { fillSqlParams } from '@/utils/sqlFill'
import { useCopy } from '@/utils/useCopy'

const sql = ref(`SELECT u.id, u.name, o.amount
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.city = ? AND o.created_at > ? AND o.amount > ?
  AND u.remark <> ?`)

const params = ref(`[
  "北京",
  "2026-01-01 00:00:00",
  199.9,
  "N/A"
]`)

const mysqlBackslash = ref(false)
const { copiedKey, copy } = useCopy()

const parsedParams = computed(() => {
  const src = params.value.trim()
  if (!src) return { ok: true, list: [] }
  try {
    const v = JSON.parse(src)
    if (!Array.isArray(v)) return { ok: false, error: '参数必须是 JSON 数组,如 ["北京", 199.9, null]' }
    return { ok: true, list: v }
  } catch (e) {
    return { ok: false, error: '参数 JSON 不合法:' + e.message }
  }
})

const result = computed(() => {
  const p = parsedParams.value
  if (!p.ok) return { ok: false, error: p.error }
  if (!sql.value.trim()) return { ok: true, text: '' }
  try {
    return fillSqlParams(sql.value, p.list, { mysqlBackslash: mysqlBackslash.value })
  } catch (e) {
    return { ok: false, error: e.message }
  }
})
</script>

<template>
  <div class="grid-2" style="margin-bottom: 14px; align-items: start">
    <div class="field" style="margin: 0">
      <label class="field-label" for="sp-sql">SQL 模板(? 或 $1 / $2 占位符)</label>
      <textarea id="sp-sql" v-model="sql" v-draft="'sql-params'" class="textarea" style="min-height: 210px; font-size: 13.5px" spellcheck="false"></textarea>
    </div>
    <div class="field" style="margin: 0">
      <label class="field-label" for="sp-params">参数(JSON 数组,顺序对应 ?)</label>
      <textarea id="sp-params" v-model="params" v-draft="'sql-params-args'" class="textarea" style="min-height: 210px; font-size: 13.5px" spellcheck="false"></textarea>
    </div>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mysqlBackslash" type="checkbox" />MySQL 转义风格(反斜杠 + \')</label>
    <span class="tip">关闭时用标准 SQL 的 '' 转义(PostgreSQL / SQLite 默认)</span>
  </div>

  <div v-if="parsedParams.error" class="error-box" style="margin-bottom: 14px">✗ {{ parsedParams.error }}</div>
  <div v-else-if="result.error" class="error-box" style="margin-bottom: 14px">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label" for="sp-out">填充结果(可直接执行)</label>
    <textarea id="sp-out" class="textarea" style="min-height: 210px; font-size: 13.5px" readonly :value="result.text"></textarea>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" @click="copy('sp', result.text)">
        {{ copiedKey === 'sp' ? '✓ 已复制' : '复制填充后的 SQL' }}
      </button>
    </div>
  </template>

  <p class="tip" style="margin-top: 12px">
    场景:慢查询日志 / ORM 只给出参数化 SQL 与绑定参数,想手动执行排查时把两段拼起来。
    字符串里的 ' 会被转义、SQL 字符串字面量与行注释里的 ? 不会误当占位符;
    JSON 里的 null / true / false / 数字分别输出为 NULL / TRUE / FALSE / 数字字面量。
    SQL 与参数不写入地址栏,避免带密钥的语句外泄。
  </p>
</template>
