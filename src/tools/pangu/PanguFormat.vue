<script setup>
import { computed, ref } from 'vue'
import { formatPangu } from '@/utils/pangu'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const text = ref('')

const spaceCjk = ref(true)
const fullwidthHalf = ref(false)
const halfPunctFull = ref(false)
const collapseSpaces = ref(false)
const trimTrailing = ref(false)

// 只把开关同步到地址栏;正文不进 URL,避免超长链接也利于隐私
const flag = (key, refVal) => ({
  key,
  ref: refVal,
  parse: (s) => (s === '1' ? true : s === '0' ? false : undefined),
})
useUrlState([
  flag('s', spaceCjk),
  flag('f', fullwidthHalf),
  flag('p', halfPunctFull),
  flag('c', collapseSpaces),
  flag('t', trimTrailing),
])

const { copiedKey, copy } = useCopy()

const output = computed(() =>
  text.value
    ? formatPangu(text.value, { spaceCjk: spaceCjk.value, fullwidthHalf: fullwidthHalf.value, halfPunctFull: halfPunctFull.value, collapseSpaces: collapseSpaces.value, trimTrailing: trimTrailing.value })
    : '',
)
const changed = computed(() => output.value !== text.value)

const OPTIONS = [
  { ref: spaceCjk, label: '中英文/数字之间加空格', hint: '「使用Vue3开发」→「使用 Vue3 开发」' },
  { ref: fullwidthHalf, label: '全角字母数字转半角', hint: '「ＡＢＣ１２３」→「ABC123」' },
  { ref: halfPunctFull, label: '中文后的半角标点转全角', hint: '「你好,世界」→「你好,世界」,不碰 3.5 这类小数点' },
  { ref: collapseSpaces, label: '连续空格合并为一个', hint: '' },
  { ref: trimTrailing, label: '去除每行行尾空白', hint: '保留行首缩进' },
]

const SAMPLE = `这是一段随手粘贴的文本, mixing English and 中文,标点也很随意!
带有的全角字母ＡＢＣ和数字１２３,连续的   空格,以及行尾多余空白
数字2026年10月,价格3.5元`
</script>

<template>
  <div class="field">
    <label class="field-label" for="pangu-in">原文</label>
    <textarea id="pangu-in" v-model="text" class="textarea" style="min-height: 150px" placeholder="粘贴要排版的文本…" spellcheck="false"></textarea>
    <div class="row" style="margin-top: 8px">
      <button class="btn btn-sm" @click="text = SAMPLE">填入示例</button>
      <button class="btn btn-sm" :disabled="!text" @click="text = ''">清空</button>
    </div>
  </div>

  <div class="panel" style="margin-bottom: 16px">
    <span class="field-label">选项</span>
    <div class="opt-list">
      <label v-for="o in OPTIONS" :key="o.label" class="check opt-item">
        <input v-model="o.ref.value" type="checkbox" />
        <span>
          {{ o.label }}
          <span v-if="o.hint" class="tip">({{ o.hint }})</span>
        </span>
      </label>
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="pangu-out">
      结果
      <span v-if="text" class="tip">{{ changed ? '已调整' : '没有需要调整的内容' }}</span>
    </label>
    <textarea id="pangu-out" class="textarea" style="min-height: 150px" readonly :value="output" placeholder="结果实时生成…"></textarea>
    <div class="row" style="margin-top: 10px">
      <button class="btn btn-sm btn-primary" :disabled="!output" @click="copy('pangu', output)">
        {{ copiedKey === 'pangu' ? '✓ 已复制' : '复制结果' }}
      </button>
      <button v-if="output" class="btn btn-sm" :disabled="!output" @click="text = output">↑ 用结果覆盖原文(可叠加处理)</button>
    </div>
  </div>

  <details class="panel">
    <summary>📖 排版说明</summary>
    <p class="tip">
      中英文之间加空格(俗称「盘古之白」)是中文社区长期形成的排版惯例,微信公众号排版、技术文档写作都推荐。
      半角标点转全角只处理紧跟在汉字后的 , . : ; ! ?,英文句子与 3.5 这类小数不受影响;
      % 与°等符号默认不与数字拆开。正文不会写入地址栏,分享链接只携带排版选项。
    </p>
  </details>
</template>

<style scoped>
.opt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
