<script setup>
import { computed, ref, watch } from 'vue'
import { parseTable, toMarkdown, ALIGN_OPTIONS } from '@/utils/mdTable'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const input = ref('')
const headerOn = ref(true) // 首行作为表头
const aligns = ref([]) // 每列对齐方式('none' | 'left' | 'center' | 'right')

const { copiedKey, copy } = useCopy()

useUrlState([{ key: 'h', ref: headerOn, parse: (s) => (s === '0' ? false : s === '1' ? true : undefined) }])

const SAMPLE = `姓名\t部门\t入职日期\t月薪
张三\t研发部\t2021-07-01\t25000
李四\t市场部\t2022-03-15\t18000
王五\t人事部\t2020-11-02\t15500`

// 解析结果随输入联动;正文太长时不再同步(编辑输出不被覆盖)
const parsed = computed(() => parseTable(input.value))
const colCount = computed(() => Math.max(0, ...parsed.value.rows.map((r) => r.length)))

// 列数变化时保持对齐设置
watch(colCount, (n) => {
  aligns.value = Array.from({ length: n }, (_, i) => aligns.value[i] || 'none')
})

const output = computed(() => {
  if (!parsed.value.rows.length) return ''
  const rows = headerOn.value ? parsed.value.rows : [[''], ...parsed.value.rows]
  return toMarkdown(rows, aligns.value)
})

const dataRows = computed(() => (headerOn.value ? parsed.value.rows.length - 1 : parsed.value.rows.length))
const cellCount = computed(() => parsed.value.rows.reduce((n, r) => n + r.length, 0))

function cycleAlign(i) {
  const ids = ALIGN_OPTIONS.map((a) => a.id)
  const next = ids[(ids.indexOf(aligns.value[i] || 'none') + 1) % ids.length]
  aligns.value = aligns.value.map((v, j) => (j === i ? next : v))
}

function loadSample() {
  input.value = SAMPLE
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    input.value = String(reader.result || '')
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>

<template>
  <div class="grid-2">
    <div>
      <div class="field">
        <div class="label-row">
          <label class="field-label" for="mdtable-input">粘贴表格文本(Excel 直接 Ctrl+V 即可,自动识别 Tab/CSV/竖线)</label>
          <span class="label-actions">
            <label class="btn btn-sm file-btn">
              <AppIcon name="folder-open" :size="14" />载入文件
              <input type="file" accept=".csv,.tsv,.txt,text/*" class="sr-only" @change="onFileChange" />
            </label>
            <button class="btn btn-sm" @click="loadSample">示例</button>
            <button class="btn btn-sm" :disabled="!input" @click="input = ''">清空</button>
          </span>
        </div>
        <textarea
          id="mdtable-input"
          v-model="input"
          v-draft="'md-table-input'"
          class="textarea src-area"
          spellcheck="false"
          placeholder="姓名&#9;部门&#9;月薪&#10;张三&#9;研发部&#9;25000&#10;&#10;支持:Excel 复制的 TSV、CSV、已是 | 分隔的表格…"
        ></textarea>
      </div>

      <label class="check"><input v-model="headerOn" type="checkbox" />首行作为表头</label>

      <p v-if="parsed.error" class="tip warn-tip">{{ parsed.error }}</p>
      <p v-else-if="parsed.rows.length" class="tip">
        解析到 {{ parsed.rows.length }} 行 × {{ colCount }} 列(表头 {{ colCount }} 列 + 数据 {{ dataRows }} 行,共 {{ cellCount }} 个单元格)
      </p>
    </div>

    <div>
      <div class="field">
        <div class="label-row">
          <label class="field-label" for="mdtable-output">Markdown 结果</label>
          <button class="btn btn-sm" :disabled="!output" @click="copy('mdtable', output)">
            <AppIcon :name="copiedKey === 'mdtable' ? 'check' : 'clipboard'" :size="14" />{{ copiedKey === 'mdtable' ? '已复制' : '复制' }}
          </button>
        </div>

        <div v-if="colCount" class="align-row" role="group" aria-label="列对齐方式">
          <span class="tip">对齐:</span>
          <button
            v-for="i in colCount"
            :key="i"
            class="btn btn-sm align-btn"
            :title="`第 ${i} 列对齐方式,点击切换`"
            @click="cycleAlign(i - 1)"
          >
            {{ i }}·{{ ALIGN_OPTIONS.find((a) => a.id === (aligns[i - 1] || 'none'))?.label }}
          </button>
        </div>

        <textarea
          id="mdtable-output"
          class="textarea out-area"
          readonly
          :value="output"
          placeholder="| 姓名 | 部门 |&#10;| --- | --- |&#10;| 张三 | 研发部 |"
          aria-label="Markdown 表格输出"
        ></textarea>
      </div>

      <p class="tip m-0">
        单元格内的 <code>|</code> 会自动转义、换行转为 <code>&lt;br&gt;</code>;不足的列以空单元格补齐。
        粘贴后如需微调,直接编辑右侧结果即可(编辑后清空左侧再粘贴可重新生成)。
      </p>
    </div>
  </div>
</template>

<style scoped>
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.label-actions {
  display: inline-flex;
  gap: 6px;
}
.file-btn {
  position: relative;
  overflow: hidden;
}
.src-area {
  min-height: 280px;
  font-family: var(--mono);
  font-size: 13.5px;
}
.out-area {
  min-height: 280px;
  font-family: var(--mono);
  font-size: 13.5px;
  white-space: pre;
}
.warn-tip {
  color: var(--warning);
}
.align-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.align-btn {
  font-size: 12.5px;
}
</style>
