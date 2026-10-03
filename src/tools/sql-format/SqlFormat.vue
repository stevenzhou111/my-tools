<script setup>
import { computed, ref } from 'vue'
import { format } from 'sql-formatter'
import { useCopy } from '@/utils/useCopy'

const input = ref('select u.id,u.name,count(o.id) as order_count from users u left join orders o on u.id=o.user_id where u.created_at>"2026-01-01" group by u.id,u.name having count(o.id)>5 order by order_count desc limit 20;')
const language = ref('sql')
const keywordCase = ref('upper')
const error = ref('')
const { copiedKey, copy } = useCopy()

const LANGUAGES = [
  { id: 'sql', name: '标准 SQL' },
  { id: 'mysql', name: 'MySQL' },
  { id: 'mariadb', name: 'MariaDB' },
  { id: 'postgresql', name: 'PostgreSQL' },
  { id: 'sqlite', name: 'SQLite' },
  { id: 'transactsql', name: 'SQL Server (T-SQL)' },
  { id: 'plsql', name: 'Oracle (PL/SQL)' },
  { id: 'hive', name: 'Hive' },
  { id: 'spark', name: 'Spark' },
  { id: 'bigquery', name: 'BigQuery' },
]

const output = computed(() => {
  error.value = ''
  const s = input.value.trim()
  if (!s) return ''
  try {
    return format(s, {
      language: language.value,
      tabWidth: 2,
      keywordCase: keywordCase.value,
      expressionWidth: 60,
    })
  } catch (e) {
    error.value = '格式化失败:语句可能存在语法错误(' + (e.message || '').slice(0, 120) + ')'
    return ''
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl">
      <span class="field-label">方言</span>
      <select v-model="language" class="select">
        <option v-for="l in LANGUAGES" :key="l.id" :value="l.id">{{ l.name }}</option>
      </select>
    </label>
    <label class="ctrl">
      <span class="field-label">关键字大小写</span>
      <select v-model="keywordCase" class="select">
        <option value="upper">大写 SELECT</option>
        <option value="lower">小写 select</option>
        <option value="preserve">保持原样</option>
      </select>
    </label>
  </div>

  <div class="field">
    <label class="field-label">SQL 语句</label>
    <textarea v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box" style="margin-bottom: 12px">✗ {{ error }}</div>

  <label class="field-label">格式化结果</label>
  <pre class="output">{{ output }}</pre>
  <div class="row" style="margin-top: 10px">
    <button v-if="output" class="btn btn-sm" @click="copy('out', output)">
      {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
    </button>
  </div>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
}
</style>
