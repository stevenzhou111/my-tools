<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { downloadBlob } from '@/utils/image'
import { csvToJson, jsonToCsv } from '@/utils/csvJson'

/**
 * CSV ↔ JSON 互转:RFC 4180 解析(引号包裹/字段内逗号换行/双写转义),
 * 类型推断可关(前导零的区号保持字符串)。双向均可下载文件。
 */

const dir = ref('csv2json') // csv2json | json2csv
const input = ref('')
const error = ref('')
const headerRow = ref(true)
const infer = ref(true)
const delimiter = ref(',')
const pretty = ref(true)

const output = computed(() => {
  error.value = ''
  if (!input.value.trim()) return ''
  try {
    if (dir.value === 'csv2json') {
      const rows = csvToJson(input.value, { headerRow: headerRow.value, infer: infer.value, delimiter: delimiter.value })
      return JSON.stringify(rows, null, pretty.value ? 2 : 0) || '[]'
    }
    const rows = JSON.parse(input.value)
    if (!Array.isArray(rows)) return (error.value = 'JSON 需要是数组(对象数组或二维数组)'), ''
    return jsonToCsv(rows, { delimiter: delimiter.value, header: headerRow.value })
  } catch (e) {
    error.value = e.message
    return ''
  }
})

function download() {
  if (!output.value) return
  const name = dir.value === 'csv2json' ? 'data.json' : 'data.csv'
  const type = dir.value === 'csv2json' ? 'application/json' : 'text/csv'
  downloadBlob(new Blob(['\uFEFF' + output.value], { type: `${type};charset=utf-8` }), name)
}

function loadFile(e) {
  const f = e.target.files?.[0]
  if (f) f.text().then((t) => { input.value = t })
  e.target.value = ''
}

const PLACEHOLDERS = {
  csv2json: 'name,note\n"a","含,逗号"',
  json2csv: '[{"name": "a", "note": "b"}, {"name": "c"}]',
}
</script>

<template>
  <div class="row mb-14 ctrl-row">
    <label class="ctrl">
      <span class="field-label">方向</span>
      <select v-model="dir" class="select">
        <option value="csv2json">CSV → JSON</option>
        <option value="json2csv">JSON → CSV</option>
      </select>
    </label>
    <label v-if="dir === 'csv2json'" class="check"><input v-model="headerRow" type="checkbox" />首行作表头</label>
    <label v-if="dir === 'csv2json'" class="check"><input v-model="infer" type="checkbox" />类型推断(数字/布尔)</label>
    <label v-if="dir === 'json2csv'" class="check"><input v-model="headerRow" type="checkbox" />输出表头行</label>
    <label class="ctrl">
      <span class="field-label">分隔符</span>
      <select v-model="delimiter" class="select">
        <option value=",">逗号 ,</option>
        <option value=";">分号 ;</option>
        <option value="\t">制表符 Tab</option>
      </select>
    </label>
    <label v-if="dir === 'csv2json'" class="check"><input v-model="pretty" type="checkbox" />美化缩进</label>
  </div>

  <div class="field">
    <label class="field-label" for="cj-in">输入</label>
    <textarea id="cj-in" v-model="input" class="textarea" style="min-height: 160px" spellcheck="false" :placeholder="PLACEHOLDERS[dir]"></textarea>
    <div class="row mt-10">
      <label class="btn btn-sm file-btn">
        从文件载入
        <input type="file" accept=".csv,.tsv,.json,text/csv,application/json" class="sr-only" @change="loadFile" />
      </label>
    </div>
  </div>

  <div v-if="error" class="error-box mb-14">✗ {{ error }}</div>

  <template v-if="output">
    <label class="field-label" for="cj-out">输出</label>
    <textarea id="cj-out" class="textarea" style="min-height: 160px" readonly :value="output"></textarea>
    <div class="row mt-10">
      <CopyButton class="btn btn-sm" :text="output" />
      <button class="btn btn-sm" @click="download"><AppIcon name="download" :size="14" />下载</button>
    </div>
    <p class="tip mt-12">
      解析遵循 RFC 4180:引号包裹的字段可含逗号/换行,双写引号转义;类型推断会跳过前导零数字(区号 "007" 不会被改成 7)。
    </p>
  </template>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
</style>
