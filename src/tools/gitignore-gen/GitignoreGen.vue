<script setup>
import { computed, ref } from 'vue'
import { GITIGNORE_GROUPS, mergeGitignore } from '@/utils/gitignore'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

// 常见组合一键勾选
const PRESETS = [
  { id: 'node-full', label: 'Node 全家桶', ids: ['node', 'frontend', 'env', 'logs', 'coverage', 'ide-idea', 'ide-vscode', 'os-mac', 'os-windows'] },
  { id: 'py-full', label: 'Python 全家桶', ids: ['python', 'env', 'logs', 'coverage', 'ide-idea', 'ide-vscode', 'os-mac', 'os-windows'] },
  { id: 'basic', label: '通用基础', ids: ['env', 'logs', 'coverage', 'os-mac', 'os-windows'] },
]

const selected = ref(new Set(['node', 'frontend', 'env', 'logs', 'ide-idea', 'os-mac']))
const { copiedKey, copy } = useCopy()

useUrlState([
  {
    key: 's',
    ref: selected,
    serialize: (set) => [...set].join(','),
    parse: (s) => {
      const ids = s.split(',').filter((id) => GITIGNORE_GROUPS.some((g) => g.id === id))
      return ids.length ? new Set(ids) : undefined
    },
  },
])

const output = computed(() => mergeGitignore([...selected.value]))

function toggle(id) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function applyPreset(preset) {
  selected.value = new Set(preset.ids)
}

function download() {
  if (!output.value) return
  const blob = new Blob([output.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = '.gitignore'
  a.click()
  URL.revokeObjectURL(a.href)
}

// 预设高亮:当前选择与预设完全一致时标出
const activePreset = computed(() => {
  const cur = [...selected.value].sort().join(',')
  return PRESETS.find((p) => [...p.ids].sort().join(',') === cur)?.id || ''
})
</script>

<template>
  <div class="panel mb-16">
    <div class="row preset-row">
      <span class="tip">常用组合:</span>
      <button
        v-for="p in PRESETS"
        :key="p.id"
        class="btn btn-sm"
        :class="{ 'btn-primary': activePreset === p.id }"
        @click="applyPreset(p)"
      >
        {{ p.label }}
      </button>
      <button class="btn btn-sm" :disabled="!selected.size" @click="selected = new Set()">清空</button>
    </div>

    <div class="chip-grid" role="group" aria-label="选择要忽略的内容">
      <button
        v-for="g in GITIGNORE_GROUPS"
        :key="g.id"
        class="chip"
        :class="{ on: selected.has(g.id) }"
        :aria-pressed="selected.has(g.id)"
        :title="g.note"
        @click="toggle(g.id)"
      >
        <AppIcon :name="selected.has(g.id) ? 'check-square' : 'square'" :size="15" />
        {{ g.label }}
      </button>
    </div>
  </div>

  <div class="field">
    <div class="label-row">
      <label class="field-label" for="gitignore-out">.gitignore 内容({{ output ? output.split('\n').length : 0 }} 行)</label>
      <span class="row gap-8">
        <button class="btn btn-sm" :disabled="!output" @click="copy('gitignore', output)">
          <AppIcon :name="copiedKey === 'gitignore' ? 'check' : 'clipboard'" :size="14" />{{ copiedKey === 'gitignore' ? '已复制' : '复制' }}
        </button>
        <button class="btn btn-sm btn-primary" :disabled="!output" @click="download">
          <AppIcon name="download" :size="14" />下载 .gitignore
        </button>
      </span>
    </div>
    <textarea id="gitignore-out" class="textarea out-area" readonly :value="output" aria-label="gitignore 输出"></textarea>
  </div>

  <p class="tip m-0">
    已选中 {{ selected.size }} 组规则,重复行自动去重。若某个文件已被 Git 追踪,加入 .gitignore 不会自动停止追踪,
    需要执行 <code>git rm --cached 文件名</code> 后再提交。密钥与 .env 建议无论项目大小都勾选。
  </p>
</template>

<style scoped>
.preset-row {
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 13.5px;
  color: var(--muted);
  background: var(--card);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.chip.on {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.out-area {
  min-height: 320px;
  font-family: var(--mono);
  font-size: 13.5px;
  white-space: pre;
}
</style>
