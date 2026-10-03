<script setup>
import { computed, reactive, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const bits = reactive({
  owner: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: true },
  special: { setuid: false, setgid: false, sticky: false },
})
const octalInput = ref('755')
const { copiedKey, copy } = useCopy()

const GROUPS = [
  { key: 'owner', label: '所有者 (u)' },
  { key: 'group', label: '所属组 (g)' },
  { key: 'other', label: '其他人 (o)' },
]
const PERMS = [
  { key: 'r', label: '读 (4)' },
  { key: 'w', label: '写 (2)' },
  { key: 'x', label: '执行 (1)' },
]

function trio(obj) {
  return (obj.r ? 4 : 0) + (obj.w ? 2 : 0) + (obj.x ? 1 : 0)
}

const octal = computed(() => {
  const special =
    (bits.special.setuid ? 4 : 0) + (bits.special.setgid ? 2 : 0) + (bits.special.sticky ? 1 : 0)
  const base = `${trio(bits.owner)}${trio(bits.group)}${trio(bits.other)}`
  return special ? `${special}${base}` : base
})

const symbolic = computed(() => {
  const t = (o) => `${o.r ? 'r' : '-'}${o.w ? 'w' : '-'}${o.x ? 'x' : '-'}`
  let s = `${t(bits.owner)}${t(bits.group)}${t(bits.other)}`
  if (bits.special.setuid) s = 's' + s.slice(1)
  if (bits.special.setgid) s = s.slice(0, 3) + 's' + s.slice(4)
  if (bits.special.sticky) s = s.slice(0, 6) + 't' + s.slice(7)
  return s
})

// 输入 3~4 位八进制反推勾选
function applyOctal() {
  const s = octalInput.value.replace(/[^0-7]/g, '')
  if (s.length < 3) return
  const [a, b, c] = s.slice(-3).split('').map(Number)
  const set = (obj, n) => {
    obj.r = !!(n & 4)
    obj.w = !!(n & 2)
    obj.x = !!(n & 1)
  }
  set(bits.owner, a)
  set(bits.group, b)
  set(bits.other, c)
  if (s.length === 4) {
    const sp = Number(s[0])
    bits.special.setuid = !!(sp & 4)
    bits.special.setgid = !!(sp & 2)
    bits.special.sticky = !!(sp & 1)
  }
}

const command = computed(() => `chmod ${symbolic.value} file`)
</script>

<template>
  <div class="panel" style="margin-bottom: 14px">
    <div class="perm-grid">
      <div class="perm-col">
        <div class="perm-head">权限位</div>
        <div class="perm-row head">
          <span></span><span>读 r</span><span>写 w</span><span>执行 x</span>
        </div>
        <div v-for="g in GROUPS" :key="g.key" class="perm-row">
          <span class="perm-who">{{ g.label }}</span>
          <label v-for="p in PERMS" :key="p.key" class="perm-check">
            <input v-model="bits[g.key][p.key]" type="checkbox" />{{ p.key }}
          </label>
        </div>
      </div>
      <div class="perm-col">
        <div class="perm-head">特殊权限</div>
        <label class="check"><input v-model="bits.special.setuid" type="checkbox" />setuid(4)</label>
        <label class="check"><input v-model="bits.special.setgid" type="checkbox" />setgid(2)</label>
        <label class="check"><input v-model="bits.special.sticky" type="checkbox" />sticky(1)</label>
      </div>
    </div>
  </div>

  <div class="row" style="margin-bottom: 14px">
    <label class="ctrl">
      <span class="field-label">直接输入八进制(3~4 位)反推</span>
      <input v-model="octalInput" class="input octal-input" spellcheck="false" @input="applyOctal" />
    </label>
  </div>

  <div class="result-boxes">
    <div class="panel">
      <div class="result-head">
        <span class="field-label" style="margin: 0">八进制</span>
        <button class="btn btn-sm" @click="copy('oct', octal)">{{ copiedKey === 'oct' ? '✓' : '复制' }}</button>
      </div>
      <code class="big-val">{{ octal }}</code>
    </div>
    <div class="panel">
      <div class="result-head">
        <span class="field-label" style="margin: 0">符号式</span>
        <button class="btn btn-sm" @click="copy('sym', symbolic)">{{ copiedKey === 'sym' ? '✓' : '复制' }}</button>
      </div>
      <code class="big-val">{{ symbolic }}</code>
    </div>
  </div>

  <div class="panel" style="margin-top: 12px">
    <div class="result-head">
      <span class="field-label" style="margin: 0">Shell 命令</span>
      <button class="btn btn-sm" @click="copy('cmd', command)">{{ copiedKey === 'cmd' ? '✓ 已复制' : '复制' }}</button>
    </div>
    <code class="cmd">{{ command }}</code>
  </div>
</template>

<style scoped>
.perm-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.perm-head {
  font-weight: 700;
  margin-bottom: 8px;
}
.perm-row {
  display: grid;
  grid-template-columns: 110px repeat(3, 64px);
  align-items: center;
  padding: 4px 0;
  font-size: 14px;
}
.perm-row.head {
  color: var(--muted);
  font-size: 13px;
}
.perm-who {
  color: var(--muted);
}
.perm-check {
  display: inline-flex;
  gap: 6px;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.octal-input {
  width: 140px;
  font-family: var(--mono);
}
.result-boxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .result-boxes { grid-template-columns: 1fr; }
}
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.big-val {
  font-size: 26px;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--accent);
}
.cmd {
  font-family: var(--mono);
  font-size: 15px;
  word-break: break-all;
}
</style>
