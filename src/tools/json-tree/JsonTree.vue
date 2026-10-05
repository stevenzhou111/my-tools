<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { buildJsonTree, nodePath, previewValue, typeName } from '@/utils/jsonTree'
import AppIcon from '@/components/AppIcon.vue'
import { useCopy } from '@/utils/useCopy'

const input = ref(`{
  "name": "我的工具箱",
  "version": "1.0.0",
  "tools": [
    { "id": "json", "tags": ["格式化", "压缩"] },
    { "id": "base64", "tags": [] }
  ],
  "config": { "offline": true, "theme": null }
}`)
const { copiedKey, copy } = useCopy()

const root = ref(null)
const error = ref('')
const stats = ref(null)

// 折叠集合:存路径;小文档默认全展开,超大文档(>1500 节点)自动折叠 2 层以下,防止 DOM 爆炸
const collapsed = reactive(new Set())

function reparse() {
  const next = buildJsonTree(input.value)
  root.value = next.root
  error.value = next.error
  stats.value = next.stats
  collapsed.clear()
  if (next.stats?.nodes > 1500) {
    collectDeep(next.root, '$', 0)
  }
}

function collectDeep(node, path, depth) {
  if (!node.children.length) return
  if (depth >= 2) collapsed.add(path)
  for (const c of node.children) collectDeep(c, nodePath(c.key, path), depth + 1)
}

watch(input, reparse, { immediate: true })

// ---------- 关键字过滤:命中节点 + 其各级上级,过滤期间自动全展开 ----------
const filter = ref('')
const kw = computed(() => filter.value.trim().toLowerCase())

function selfMatch(node, kwStr) {
  if (node.key !== null && String(node.key).toLowerCase().includes(kwStr)) return true
  if (!node.children.length) {
    const pv = previewValue(node)
    return pv != null && String(pv).toLowerCase().includes(kwStr)
  }
  return false
}

const matchCount = computed(() => {
  if (!kw.value || !root.value) return 0
  let n = 0
  const visit = (node) => {
    for (const c of node.children) {
      if (selfMatch(c, kw.value)) n++
      if (c.children.length) visit(c)
    }
  }
  visit(root.value)
  return n
})

// 返回需保留的路径集合(命中节点与其全部祖先);null 表示未启用过滤
const keptPaths = computed(() => {
  if (!kw.value || !root.value) return null
  const keep = new Set()
  const visit = (node, path) => {
    let subtreeHas = false
    for (const c of node.children) {
      const p = nodePath(c.key, path)
      const childHas = c.children.length ? visit(c, p) : false
      if (selfMatch(c, kw.value) || childHas) {
        keep.add(p)
        subtreeHas = true
      }
    }
    return subtreeHas
  }
  visit(root.value, '$')
  return keep
})

// 树 → 可见行:折叠的子树整段跳过,一个 v-for 渲染整棵树
const rows = computed(() => {
  const out = []
  if (!root.value) return out
  const kept = keptPaths.value
  const walk = (node, path, depth) => {
    for (const c of node.children) {
      const p = nodePath(c.key, path)
      const hasKids = c.children.length > 0
      const folded = kept ? false : collapsed.has(p)
      if (!kept || kept.has(p)) {
        out.push({ node: c, path: p, depth, hasKids, folded, hit: kw.value ? selfMatch(c, kw.value) : false })
      }
      if (hasKids && (!folded || kept)) walk(c, p, depth + 1)
    }
  }
  walk(root.value, '$', 0)
  return out
})

/** 把文本按关键字切段供高亮 */
function segments(text, kwStr) {
  const t = String(text ?? '')
  if (!kwStr) return [{ text: t, hit: false }]
  const lower = t.toLowerCase()
  const out = []
  let i = 0
  for (;;) {
    const idx = lower.indexOf(kwStr, i)
    if (idx === -1) {
      out.push({ text: t.slice(i), hit: false })
      return out
    }
    if (idx > i) out.push({ text: t.slice(i, idx), hit: false })
    out.push({ text: t.slice(idx, idx + kwStr.length), hit: true })
    i = idx + kwStr.length
  }
}

function toggle(path) {
  if (collapsed.has(path)) collapsed.delete(path)
  else collapsed.add(path)
}

function collapseAll() {
  if (!root.value) return
  const walk = (node, path) => {
    if (!node.children.length) return
    collapsed.add(path)
    for (const c of node.children) walk(c, nodePath(c.key, path))
  }
  walk(root.value, '$')
}

const TYPE_CLASS = {
  string: 't-string',
  number: 't-number',
  boolean: 't-bool',
  null: 't-null',
  object: 't-object',
  array: 't-array',
}
</script>

<template>
  <div class="field">
    <label class="field-label">输入 JSON</label>
    <textarea v-draft="'json-tree-input'" v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>

  <div v-if="error" class="error-box">✗ {{ error }}</div>

  <template v-else-if="root">
    <div class="row" style="margin-bottom: 10px">
      <span class="tip">共 {{ stats.nodes }} 个节点 · 最大深度 {{ stats.depth }} · 对象 {{ stats.keys }} · 数组 {{ stats.arrays }}</span>
      <button class="btn btn-sm" @click="collapseAll">全部折叠</button>
      <button class="btn btn-sm" @click="collapsed.clear()">全部展开</button>
    </div>

    <div class="field" style="margin-bottom: 10px">
      <input
        v-model="filter"
        class="input"
        type="search"
        placeholder="🔍 输入关键字过滤:匹配键名或值,仅显示命中节点及其上级"
        aria-label="按关键字过滤节点"
        spellcheck="false"
      />
      <p v-if="kw" class="tip" style="margin-top: 6px">
        {{ matchCount > 0 ? `命中 ${matchCount} 个节点,已自动展开其路径` : '没有匹配的节点' }}
        <button class="btn btn-sm" style="margin-left: 8px" @click="filter = ''">清除过滤</button>
      </p>
    </div>

    <div class="panel tree-panel" role="tree">
      <div
        v-for="row in rows"
        :key="row.path"
        class="tree-row"
        :class="{ 'tree-row-hit': row.hit }"
        role="treeitem"
        :aria-expanded="row.hasKids ? !row.folded : undefined"
        :style="{ paddingLeft: row.depth * 16 + 'px' }"
      >
        <button
          v-if="row.hasKids"
          class="caret"
          type="button"
          :aria-label="row.folded ? '展开' : '折叠'"
          @click="toggle(row.path)"
        >
          <AppIcon :name="row.folded ? 'chevron-right' : 'chevron-down'" :size="13" />
        </button>
        <span v-else class="caret caret-blank"></span>

        <span v-if="row.node.key !== null" class="t-key">
          <template v-for="(s, j) in segments(row.node.key, kw)" :key="j">
            <mark v-if="s.hit">{{ s.text }}</mark>
            <template v-else>{{ s.text }}</template>
          </template>
        </span>

        <span class="t-badge" :class="TYPE_CLASS[row.node.type]">{{ typeName(row.node.type) }}</span>

        <span v-if="row.hasKids && row.folded" class="t-value muted">
          <template v-for="(s, j) in segments(row.node.value, kw)" :key="j">
            <mark v-if="s.hit">{{ s.text }}</mark>
            <template v-else>{{ s.text }}</template>
          </template>
        </span>
        <span v-else-if="!row.hasKids" class="t-value">
          <template v-for="(s, j) in segments(previewValue(row.node), kw)" :key="j">
            <mark v-if="s.hit">{{ s.text }}</mark>
            <template v-else>{{ s.text }}</template>
          </template>
        </span>

        <button
          class="path-btn"
          type="button"
          :title="`复制路径 ${row.path}`"
          @click="copy(row.path, row.path)"
        >
          {{ copiedKey === row.path ? '✓ 已复制' : row.path }}
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
.tree-panel {
  padding: 10px 14px;
  overflow: auto;
  max-height: 62vh;
}
.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 6px;
  min-width: max-content;
}
.tree-row:hover {
  background: var(--bg-soft);
}
.tree-row-hit {
  background: var(--accent-soft);
}
.caret {
  width: 18px;
  height: 18px;
  display: inline-grid;
  place-items: center;
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.caret-blank {
  cursor: default;
}
.t-key {
  color: var(--accent);
  font-family: var(--mono);
  font-size: 13.5px;
  flex-shrink: 0;
}
.t-badge {
  font-size: 11px;
  line-height: 1.6;
  padding: 0 6px;
  border-radius: 5px;
  flex-shrink: 0;
}
.t-string { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
.t-number { color: #2563eb; background: rgba(37, 99, 235, 0.1); }
.t-bool { color: #d97706; background: rgba(217, 119, 6, 0.12); }
.t-null { color: var(--muted); background: var(--bg-soft); }
.t-object, .t-array { color: var(--accent); background: var(--accent-soft); }
.t-value {
  font-family: var(--mono);
  font-size: 13.5px;
  color: var(--text);
  word-break: break-all;
  white-space: nowrap;
}
.t-value.muted {
  color: var(--muted);
}
.path-btn {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--muted);
  font-size: 11.5px;
  font-family: var(--mono);
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.12s;
  flex-shrink: 0;
}
.tree-row:hover .path-btn {
  opacity: 1;
}
</style>