<script setup>
import { onUnmounted, ref } from 'vue'

const mode = ref('custom')
const optionsText = ref(`奶茶
咖啡
冰淇淋
散步`)

const answer = ref('')
const spinning = ref(false)
let timer = null

const options = () =>
  optionsText.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

function spin() {
  const list = options()
  if (!list.length) return
  spinning.value = true
  let ticks = 0
  const totalTicks = 18 + Math.floor(Math.random() * 8)
  clearInterval(timer)
  timer = setInterval(() => {
    answer.value = list[Math.floor(Math.random() * list.length)]
    ticks++
    if (ticks >= totalTicks) {
      clearInterval(timer)
      spinning.value = false
    }
  }, 80)
}

function yesNo() {
  spinning.value = true
  let ticks = 0
  clearInterval(timer)
  timer = setInterval(() => {
    answer.value = Math.random() < 0.5 ? 'YES ✅' : 'NO ❌'
    ticks++
    if (ticks >= 12 + Math.floor(Math.random() * 8)) {
      clearInterval(timer)
      spinning.value = false
    }
  }, 80)
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="row" style="margin-bottom: 16px">
    <label class="check"><input v-model="mode" type="radio" value="custom" @change="answer = ''" />自定义选项随机挑</label>
    <label class="check"><input v-model="mode" type="radio" value="yesno" @change="answer = ''" />是 / 否 快速决定</label>
  </div>

  <div class="panel result-panel">
    <div class="result" :class="{ spinning }">{{ answer || '🤔' }}</div>
    <button
      v-if="mode === 'yesno'"
      class="btn btn-primary"
      :disabled="spinning"
      @click="yesNo"
    >
      🎲 帮我决定!
    </button>
    <button
      v-else
      class="btn btn-primary"
      :disabled="spinning || !options().length"
      @click="spin"
    >
      🎲 随机挑选
    </button>
  </div>

  <div v-if="mode === 'custom'" class="field" style="margin-top: 16px">
    <label class="field-label">候选选项(每行一个)</label>
    <textarea v-model="optionsText" class="textarea" rows="6" spellcheck="false"></textarea>
  </div>
</template>

<style scoped>
.result-panel {
  text-align: center;
  padding: 36px 16px;
}
.result {
  font-size: 40px;
  font-weight: 700;
  color: var(--accent);
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  word-break: break-all;
}
.result.spinning {
  opacity: 0.75;
}
</style>
