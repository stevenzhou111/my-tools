<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { debounce } from '@/utils/format'

const left = ref(`我的工具箱 v1.0
支持 17 个工具
纯前端本地运行`)

const right = ref(`我的工具箱 v2.0
支持 49 个工具
纯前端本地运行
新增文档处理`)

const MAX_LINES = 2000
const tooLong = ref(false)

// 输入防抖后再执行 LCS,O(n·m) 的动态规划不宜逐键全量重算
const input = ref({ left: left.value, right: right.value })
const syncInput = debounce((l, r) => {
  tooLong.value = l.split('\n').length > MAX_LINES || r.split('\n').length > MAX_LINES
  input.value = { left: l, right: r }
}, 250)
watch([left, right], (v) => syncInput(...v), { immediate: true })
onUnmounted(() => syncInput.cancel())

// 经典 LCS 动态规划求行级差异
function diffLines(aText, bText) {
  const A = aText.split('\n')
  const B = bText.split('\n')
  const n = Math.min(A.length, MAX_LINES)
  const m = Math.min(B.length, MAX_LINES)
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      ops.push({ t: ' ', s: A[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: '-', s: A[i] })
      i++
    } else {
      ops.push({ t: '+', s: B[j] })
      j++
    }
  }
  while (i < n) ops.push({ t: '-', s: A[i++] })
  while (j < m) ops.push({ t: '+', s: B[j++] })
  return ops
}

const ops = computed(() => {
  if (!input.value.left && !input.value.right) return null
  return diffLines(input.value.left, input.value.right)
})

const stats = computed(() => {
  if (!ops.value) return null
  return {
    added: ops.value.filter((o) => o.t === '+').length,
    removed: ops.value.filter((o) => o.t === '-').length,
    same: ops.value.filter((o) => o.t === ' ').length,
  }
})

const { copiedKey, copy } = useCopy()

const diffText = computed(() =>
  ops.value ? ops.value.map((o) => (o.t === ' ' ? '  ' + o.s : o.t + ' ' + o.s)).join('\n') : '',
)
</script>

<template>
  <div class="grid-2" style="margin-bottom: 14px">
    <div class="field" style="margin: 0">
      <label class="field-label">原文本</label>
      <textarea v-draft="'diff-left'" v-model="left" class="textarea" rows="9" spellcheck="false"></textarea>
    </div>
    <div class="field" style="margin: 0">
      <label class="field-label">新文本</label>
      <textarea v-draft="'diff-right'" v-model="right" class="textarea" rows="9" spellcheck="false"></textarea>
    </div>
  </div>

  <div v-if="stats" class="row stats-row" style="margin-bottom: 12px">
    <span class="chip add">+ 新增 {{ stats.added }} 行</span>
    <span class="chip del">- 删除 {{ stats.removed }} 行</span>
    <span class="chip">未变化 {{ stats.same }} 行</span>
    <button class="btn btn-sm" @click="copy('diff', diffText)">
      {{ copiedKey === 'diff' ? '✓ 已复制' : '复制 diff 结果' }}
    </button>
  </div>

  <div v-if="ops" class="panel diff-view">
    <div v-for="(o, i) in ops" :key="i" class="diff-line" :class="o.t === '+' ? 'line-add' : o.t === '-' ? 'line-del' : ''">
      <span class="diff-mark">{{ o.t }}</span>
      <span class="diff-text">{{ o.s || ' ' }}</span>
    </div>
  </div>

  <p v-if="tooLong" class="tip" style="margin-top: 10px">文本超过 {{ MAX_LINES }} 行,只对比前 {{ MAX_LINES }} 行。</p>
</template>

<style scoped>
.stats-row {
  gap: 8px;
}
.chip {
  font-size: 14px;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--bg-soft);
  color: var(--muted);
}
.chip.add {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}
.chip.del {
  background: var(--danger-soft);
  color: var(--danger);
}
.diff-view {
  padding: 8px;
  max-height: 480px;
  overflow: auto;
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1.7;
}
.diff-line {
  display: flex;
  border-radius: 4px;
  padding: 0 6px;
}
.line-add {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}
.line-del {
  background: var(--danger-soft);
  color: var(--danger);
}
.diff-mark {
  width: 18px;
  flex-shrink: 0;
  user-select: none;
  opacity: 0.7;
}
.diff-text {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
