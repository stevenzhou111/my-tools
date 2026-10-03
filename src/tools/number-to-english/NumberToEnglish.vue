<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const mode = ref('toEnglish')
const input = ref('2026')
const { copiedKey, copy } = useCopy()

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES = ['', ' thousand', ' million', ' billion', ' trillion']
const WORD_VALUES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const SCALE_VALUES = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 }

function threeDigits(n) {
  let out = ''
  if (n >= 100) {
    out += ONES[Math.floor(n / 100)] + ' hundred'
    n %= 100
    if (n) out += ' and '
  }
  if (n >= 20) {
    out += TENS[Math.floor(n / 10)]
    if (n % 10) out += '-' + ONES[n % 10]
  } else if (n > 0) {
    out += ONES[n]
  }
  return out
}

function integerToWords(n) {
  if (n === 0) return 'zero'
  const groups = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }
  const parts = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i]) parts.push(threeDigits(groups[i]) + SCALES[i])
  }
  return parts.join(', ')
}

// "two thousand, twenty-six" → 2026
function wordsToInteger(text) {
  const words = text.toLowerCase().replace(/ and /g, ' ').split(/[\s,]+/).filter(Boolean)
  let total = 0
  let group = 0
  for (const w of words) {
    if (w in WORD_VALUES) {
      group += WORD_VALUES[w]
    } else if (w.includes('-')) {
      for (const part of w.split('-')) {
        if (!(part in WORD_VALUES)) throw new Error(`无法识别的单词:「${w}」`)
        group += WORD_VALUES[part]
      }
    } else if (w === 'hundred') {
      group = (group || 1) * 100
    } else if (w in SCALE_VALUES) {
      total += (group || 1) * SCALE_VALUES[w]
      group = 0
    } else {
      throw new Error(`无法识别的单词:「${w}」`)
    }
  }
  return total + group
}

const result = computed(() => {
  const s = input.value.trim()
  if (!s) return { text: '', error: '' }
  if (mode.value === 'toEnglish') {
    const clean = s.replace(/[, ]/g, '')
    if (!/^-?\d+(\.\d+)?$/.test(clean)) return { text: '', error: '请输入有效的数字' }
    const abs = clean.replace('-', '')
    const intPart = abs.split('.')[0]
    const decPart = abs.split('.')[1]
    if (intPart.length > 15) return { text: '', error: '整数部分最多 15 位(千万亿级)' }
    let text = integerToWords(Number(intPart))
    if (clean.startsWith('-')) text = 'negative ' + text
    if (decPart) text += ' point ' + [...decPart].map((d) => ONES[Number(d)]).join(' ')
    return { text, error: '' }
  }
  try {
    let text = s.toLowerCase()
    let sign = 1
    if (/^-|negative\b/.test(text)) sign = -1
    text = text.replace(/^negative\s*/, '').replace(/^-/, '')
    const [intWords, decWords] = text.split(/\s+point\s+/)
    let num = wordsToInteger(intWords)
    if (decWords) {
      const frac = decWords
        .trim()
        .split(/\s+/)
        .map((w) => {
          if (!(w in WORD_VALUES) || WORD_VALUES[w] > 9) throw new Error(`小数部分应为 zero~nine:「${w}」`)
          return WORD_VALUES[w]
        })
        .join('')
      num += Number('0.' + frac)
    }
    return { text: String(sign * num), error: '' }
  } catch (e) {
    return { text: '', error: e.message }
  }
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label class="check"><input v-model="mode" type="radio" value="toEnglish" />数字 → 英文</label>
    <label class="check"><input v-model="mode" type="radio" value="toNumber" />英文 → 数字</label>
  </div>

  <div class="field">
    <label class="field-label">{{ mode === 'toEnglish' ? '输入数字(支持负数与小数)' : '输入英文数字(如 two thousand, twenty-six)' }}</label>
    <input v-model="input" class="input" :placeholder="mode === 'toEnglish' ? '如 1234567 或 -3.14' : '如 one million two hundred'" spellcheck="false" />
  </div>

  <div v-if="result.error" class="error-box">✗ {{ result.error }}</div>

  <template v-else-if="result.text">
    <label class="field-label">转换结果</label>
    <pre class="output">{{ result.text }}</pre>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm" @click="copy('out', result.text)">
        {{ copiedKey === 'out' ? '✓ 已复制' : '复制结果' }}
      </button>
    </div>
  </template>
</template>
