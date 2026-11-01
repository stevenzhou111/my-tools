<script setup>
import { computed, ref } from 'vue'
import { asciiTable, filterRows } from '@/utils/asciiTable'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const ROWS = asciiTable()
const TYPES = [
  { id: 'all', label: '全部' },
  { id: 'ctrl', label: '控制字符' },
  { id: 'punct', label: '标点符号' },
  { id: 'digit', label: '数字' },
  { id: 'upper', label: '大写字母' },
  { id: 'lower', label: '小写字母' },
]

const type = ref('all')
const query = ref('')
const base = ref('dec') // 高亮显示的进制列

const { copiedKey, copy } = useCopy()

useUrlState([
  { key: 't', ref: type, parse: (s) => (TYPES.some((x) => x.id === s) ? s : undefined) },
  { key: 'b', ref: base, parse: (s) => (['dec', 'hex', 'oct', 'bin'].includes(s) ? s : undefined) },
])

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return filterRows(ROWS, type.value).filter((r) => {
    if (!q) return true
    return (
      String(r.dec) === q ||
      r.hex.toLowerCase() === q ||
      r.char.toLowerCase() === q ||
      (r.abbr || '').toLowerCase().includes(q) ||
      (r.name || '').includes(query.value.trim())
    )
  })
})

function clickRow(r) {
  // 控制字符复制其转义写法,可打印字符复制字符本身
  copy(`asc-${r.dec}`, r.dec < 32 || r.dec === 127 ? r.esc || r.abbr : r.char)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="字符分类">
        <button
          v-for="t in TYPES"
          :key="t.id"
          class="btn btn-sm"
          :class="{ 'btn-primary': type === t.id }"
          role="radio"
          :aria-checked="type === t.id"
          @click="type = t.id"
        >
          {{ t.label }}
        </button>
      </div>
      <label class="ctrl-inline grow">
        <AppIcon name="search" :size="15" />
        <input v-model="query" class="input search-mini" type="search" placeholder="搜 65 / 0x41 / A / 换行…(十进制/十六进制/字符/名称)" />
      </label>
    </div>
    <p class="tip m-0 mt-10">
      点击任意行复制字符(控制字符复制转义写法,如 \n);共 {{ rows.length }} / 128 条。
    </p>
  </div>

  <div class="panel table-panel">
    <table class="ascii-table">
      <thead>
        <tr>
          <th>十进制</th>
          <th>十六进制</th>
          <th>八进制</th>
          <th>二进制</th>
          <th>字符</th>
          <th>名称 / 缩写</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in rows"
          :key="r.dec"
          :class="{ [r.type]: true, hit: copiedKey === `asc-${r.dec}` }"
          @click="clickRow(r)"
        >
          <td class="mono">{{ r.dec }}</td>
          <td class="mono">0x{{ r.hex }}</td>
          <td class="mono">{{ r.oct }}</td>
          <td class="mono bin">{{ r.bin }}</td>
          <td class="mono char">{{ r.char || '—' }}</td>
          <td class="name-cell">
            <template v-if="r.abbr"><code>{{ r.abbr }}</code> {{ r.name }}<span v-if="r.esc" class="esc">({{ r.esc }})</span></template>
            <template v-else>{{ r.name || '' }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="panel mt-16">
    <p class="tip m-0">
      标准 ASCII 共 128 个字符(0~127):0~31 与 127 是控制字符(不可打印,终端与协议里用转义表示),
      32 是空格,48~57 数字、65~90 大写、97~122 小写——记住这几段能看懂大半的编码问题。
      扩展区(128~255)由 Latin-1 等编码各自定义,排查乱码请用「乱码修复/编码检测」。
    </p>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  color: var(--muted);
}
.search-mini {
  flex: 1;
}
.table-panel {
  padding: 0;
  overflow: hidden;
}
.ascii-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
.ascii-table th,
.ascii-table td {
  padding: 6px 14px;
  text-align: left;
}
.ascii-table thead th {
  position: sticky;
  top: 0;
  background: var(--bg-soft);
  color: var(--muted);
  font-size: 12.5px;
  border-bottom: 1px solid var(--border);
}
.ascii-table tbody tr {
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}
.ascii-table tbody tr:hover {
  background: var(--accent-soft);
}
tr.hit {
  background: var(--accent-soft);
}
.mono {
  font-family: var(--mono);
}
.bin {
  color: var(--muted);
  font-size: 12.5px;
}
.char {
  font-weight: 700;
  font-size: 15px;
}
tr.ctrl .char {
  color: var(--muted);
}
tr.digit .char,
tr.upper .char,
tr.lower .char {
  color: var(--accent);
}
.name-cell code {
  font-family: var(--mono);
  background: var(--bg-soft);
  border-radius: 5px;
  padding: 1px 6px;
  margin-right: 6px;
  font-size: 12.5px;
}
.esc {
  color: var(--muted);
  margin-left: 4px;
  font-family: var(--mono);
  font-size: 12.5px;
}
</style>
