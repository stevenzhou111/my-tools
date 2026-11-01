<script setup>
import { computed, ref } from 'vue'
import { caesar, atbash, vigenere, caesarAllShifts, letterFreq } from '@/utils/classicCipher'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const SAMPLE = 'The quick brown fox jumps over the lazy dog'

const algo = ref('caesar') // caesar | vigenere | atbash
const dir = ref('enc') // enc | dec
const key = ref(3)
const vkey = ref('KEY')
const input = ref('')

const { copiedKey, copy } = useCopy()

useUrlState([
  { key: 'a', ref: algo, parse: (s) => (['caesar', 'vigenere', 'atbash'].includes(s) ? s : undefined) },
  { key: 'd', ref: dir, parse: (s) => (['enc', 'dec'].includes(s) ? s : undefined) },
  { key: 'k', ref: key, parse: (s) => { const v = Number(s); return Number.isFinite(v) && v >= 0 && v <= 25 ? v : undefined } },
  { key: 'vk', ref: vkey, parse: (s) => (s.length <= 30 ? s : undefined) },
])

const result = computed(() => {
  const t = input.value
  if (!t.trim()) return ''
  try {
    if (algo.value === 'atbash') return atbash(t)
    if (algo.value === 'vigenere') return vigenere(t, vkey.value, dir.value === 'dec' ? -1 : 1)
    return caesar(t, dir.value === 'dec' ? -Number(key.value) : Number(key.value))
  } catch (e) {
    return e.message
  }
})

const shifts = computed(() => (input.value.trim() ? caesarAllShifts(input.value) : []))
const freq = computed(() => letterFreq(input.value).slice(0, 8))
// 英文高频字母 E/T/A,频次最高者大概率对应 E → 快速猜位移
const guessShift = computed(() => {
  if (!freq.value.length) return null
  const top = freq.value[0].ch.charCodeAt(0) - 65
  return (top - 4 + 26) % 26 // E = 4
})

function swap() {
  if (!result.value) return
  input.value = result.value
  dir.value = dir.value === 'enc' ? 'dec' : 'enc'
}
</script>

<template>
  <div class="panel mb-16">
    <div class="form-row">
      <div class="row gap-8" role="radiogroup" aria-label="算法">
        <button class="btn btn-sm" :class="{ 'btn-primary': algo === 'caesar' }" role="radio" :aria-checked="algo === 'caesar'" @click="algo = 'caesar'">凯撒</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': algo === 'vigenere' }" role="radio" :aria-checked="algo === 'vigenere'" @click="algo = 'vigenere'">维吉尼亚</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': algo === 'atbash' }" role="radio" :aria-checked="algo === 'atbash'" @click="algo = 'atbash'">Atbash</button>
      </div>
      <div v-if="algo !== 'atbash'" class="row gap-8" role="radiogroup" aria-label="方向">
        <button class="btn btn-sm" :class="{ 'btn-primary': dir === 'enc' }" role="radio" :aria-checked="dir === 'enc'" @click="dir = 'enc'">加密</button>
        <button class="btn btn-sm" :class="{ 'btn-primary': dir === 'dec' }" role="radio" :aria-checked="dir === 'dec'" @click="dir = 'dec'">解密</button>
      </div>
      <label v-if="algo === 'caesar'" class="ctrl-inline">
        <span class="tip">位移 k:</span>
        <input v-model.number="key" class="input tiny" type="number" min="0" max="25" />
      </label>
      <label v-if="algo === 'vigenere'" class="ctrl-inline grow">
        <span class="tip">密钥(英文字母):</span>
        <input v-model="vkey" class="input key-input" type="text" spellcheck="false" placeholder="如 SECRET" />
      </label>
      <button v-if="algo !== 'atbash'" class="btn btn-sm self-end" @click="swap">
        <AppIcon name="arrow-left-right" :size="13" />用结果反向
      </button>
    </div>
    <div v-if="algo === 'caesar'" class="row quick-row">
      <span class="tip">经典位移:</span>
      <button v-for="k in [3, 13, 7]" :key="k" class="btn btn-sm" @click="key = k">k={{ k }}{{ k === 13 ? '(ROT13)' : '' }}</button>
    </div>
  </div>

  <div class="grid-2">
    <div>
      <div class="label-row">
        <label class="field-label" for="cipher-in">原文 / 密文</label>
        <button class="btn btn-sm" :disabled="!input" @click="input = ''">清空</button>
      </div>
      <textarea id="cipher-in" v-model="input" v-draft="'classic-cipher-in'" class="textarea src-area" spellcheck="false" :placeholder="`输入内容,如:${SAMPLE}`"></textarea>
    </div>
    <div>
      <div class="label-row">
        <label class="field-label" for="cipher-out">结果</label>
        <button class="btn btn-sm" :disabled="!result" @click="copy('cipher', result)">
          <AppIcon :name="copiedKey === 'cipher' ? 'check' : 'clipboard'" :size="14" />{{ copiedKey === 'cipher' ? '已复制' : '复制' }}
        </button>
      </div>
      <textarea id="cipher-out" class="textarea src-area" readonly :value="result" aria-label="密码运算结果"></textarea>
    </div>
  </div>

  <details v-if="algo === 'caesar' && shifts.length" class="panel crack-panel">
    <summary>破解辅助:26 种位移全表(拿密文来,哪行读得通明文就是哪个 k)</summary>
    <p v-if="guessShift !== null" class="tip m-0 mb-8">
      频次最高字母是「{{ freq[0].ch }}」,按英文高频猜 k ≈ <b>{{ guessShift }}</b>(最高频通常对应 E)
    </p>
    <div class="shift-list">
      <div v-for="s in shifts" :key="s.shift" class="shift-row" :class="{ hot: s.shift === guessShift }">
        <span class="shift-k">k={{ s.shift }}</span>
        <span class="shift-text">{{ s.text }}</span>
      </div>
    </div>
  </details>

  <div class="panel mt-16">
    <p class="tip m-0">
      三种经典密码仅作学习演示:凯撒与 Atbash 26 种可能一秒穷举,维吉尼亚在密钥较长时历史上也曾被破。
      只转换英文字母,汉字数字原样保留;想防窥可以说「文本清理 + Base64」,想真保密请用「AES 文本加解密」。
    </p>
  </div>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
}
.ctrl-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.grow {
  flex: 1;
  min-width: 220px;
}
.tiny {
  width: 80px;
  font-family: var(--mono);
}
.key-input {
  font-family: var(--mono);
  text-transform: uppercase;
}
.self-end {
  align-self: flex-end;
}
.quick-row {
  margin-top: 12px;
  gap: 6px;
  flex-wrap: wrap;
}
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.src-area {
  min-height: 190px;
  font-family: var(--mono);
  font-size: 13.5px;
}
.crack-panel {
  margin-top: 16px;
  padding: 12px 18px;
}
.crack-panel summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  user-select: none;
}
.shift-list {
  max-height: 260px;
  overflow-y: auto;
  margin-top: 8px;
}
.shift-row {
  display: flex;
  gap: 12px;
  padding: 4px 8px;
  font-size: 13.5px;
  border-radius: 8px;
}
.shift-row.hot {
  background: var(--accent-soft);
}
.shift-k {
  font-family: var(--mono);
  color: var(--muted);
  flex-shrink: 0;
  width: 48px;
}
.shift-text {
  font-family: var(--mono);
  word-break: break-all;
}
</style>
