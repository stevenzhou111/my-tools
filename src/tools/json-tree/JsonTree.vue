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

// 树 → 可见行:折叠的子树整段跳过,一个 v-for 渲染整棵树
const rows = computed(() => {
  const out = []
  if (!root.value) return out
  const walk = (node, path, depth) => {
    for (const c of node.children) {
      const p = nodePath(c.key, path)
      const hasKids = c.children.length > 0
      const folded = collapsed.has(p)
      out.push({ node: c, path: p, depth, hasKids, folded })
      if (hasKids && !folded) walk(c, p, depth + 1)
    }
  }
  walk(root.value, '$', 0)
  return out
})

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

    <div class="panel tree-panel" role="tree">
      <div
        v-for="row in rows"
        :key="row.path"
        class="tree-row"
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

        <span v-if="row.node.key !== null" class="t-key">{{ row.node.key }}</span>

        <span class="t-badge" :class="TYPE_CLASS[row.node.type]">{{ typeName(row.node.type) }}</span>

        <span v-if="row.hasKids && row.folded" class="t-value muted">{{ row.node.value }}</span>
        <span v-else-if="!row.hasKids" class="t-value">{{ previewValue(row.node) }}</span>

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