<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, onUnmounted, ref } from 'vue'
import { groupNames, pickOne, splitNames } from '@/utils/randomPicker'
import { useCopy } from '@/utils/useCopy'

const text = ref(Array.from({ length: 12 }, (_, i) => `同学${String(i + 1).padStart(2, '0')}`).join('\n'))
const names = computed(() => splitNames(text.value))
const groupCount = ref(4)
const winner = ref('')
const rolling = ref(false)
const groups = ref([])
const history = ref([])
const { copiedKey, copy } = useCopy()

let timer = null

function roll() {
  if (rolling.value || !names.value.length) return
  rolling.value = true
  winner.value = ''
  // 先快速滚动 1.2 秒制造悬念,再定格
  timer = setInterval(() => {
    winner.value = pickOne(names.value)
  }, 80)
  setTimeout(() => {
    clearInterval(timer)
    timer = null
    rolling.value = false
    if (winner.value) history.value = [winner.value, ...history.value].slice(0, 8)
  }, 1200)
}

function doGroup() {
  groups.value = groupNames(names.value, groupCount.value)
}

const groupsText = computed(() =>
  groups.value.map((g, i) => `第 ${i + 1} 组(${g.length} 人):${g.join('、')}`).join('\n'),
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    课堂点名、活动抽奖、团建分组都在本地完成:名单不会上传,每次刷新页面即重置。名单按换行 / 逗号 / 顿号分隔,自动去空去重。
  </p>

  <div class="field">
    <label class="field-label" for="rp-names">名单({{ names.length }} 人)</label>
    <textarea id="rp-names" v-model="text" class="textarea" rows="6" spellcheck="false" placeholder="每行一个名字,也可用逗号、顿号分隔"></textarea>
  </div>

  <div class="picker-panel">
    <div class="rp-left">
      <button class="btn btn-primary" :disabled="rolling || !names.length" @click="roll">
        {{ rolling ? '滚动中…' : '<AppIcon name="dice-5" :size="15" /> 随机抽一个' }}
      </button>
      <div class="winner" :class="{ rolling }">{{ winner || '—' }}</div>
      <div v-if="history.length" class="tip" style="max-width: 220px">
        已抽出:{{ history.join('、') }}
        <button class="btn btn-sm mt-8" @click="history = []">清空记录</button>
      </div>
    </div>

    <div class="rp-right">
      <div class="row" style="margin-bottom: 10px">
        <label class="ctrl">
          <span class="field-label" for="rp-count">分成几组</span>
          <input id="rp-count" v-model.number="groupCount" type="number" min="2" max="20" class="input" style="width: 90px" />
        </label>
        <button class="btn btn-primary" style="margin-top: 22px" :disabled="!names.length" @click="doGroup"><AppIcon name="users" :size="15" /> 均衡分组</button>
      </div>
      <div v-if="groups.length" class="group-grid">
        <div v-for="(g, i) in groups" :key="i" class="group-card">
          <strong>第 {{ i + 1 }} 组</strong>
          <span class="tip">{{ g.join('、') }}</span>
        </div>
      </div>
      <button v-if="groups.length" class="btn btn-sm mt-10" @click="copy('groups', groupsText)">
        {{ copiedKey === 'groups' ? '✓ 已复制分组结果' : '复制分组结果' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker-panel {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-top: 14px;
}
.rp-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 240px;
}
.winner {
  font-size: 34px;
  font-weight: 800;
  font-family: var(--mono);
  color: var(--accent-strong);
  min-height: 48px;
  display: grid;
  place-items: center;
}
.winner.rolling {
  color: var(--muted);
  filter: blur(0.6px);
}
.rp-right {
  flex: 1;
  min-width: 260px;
}
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.group-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--card);
}
</style>
