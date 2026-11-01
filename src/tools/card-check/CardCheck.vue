<script setup>
import { computed, ref } from 'vue'
import { checkCard } from '@/utils/cardCheck'
import { useCopy } from '@/utils/useCopy'
import { useUrlState, shortString } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const input = ref('')
const { copiedKey, copy } = useCopy()

useUrlState([{ key: 'n', ref: input, parse: shortString(40) }])

const result = computed(() => checkCard(input.value))

// 输入时只留数字与空格,超 25 位截断
function onInput() {
  const clean = input.value.replace(/[^\d ]/g, '').replace(/\D/g, '').slice(0, 25)
  const grouped = clean.replace(/(\d{4})(?=\d)/g, '$1 ')
  if (input.value !== grouped) input.value = grouped
}

// 常见测试卡号(公开的测试段/按 Luhn 构造的演示号,非真实卡)
const SAMPLES = [
  { label: 'Visa', n: '4111 1111 1111 1111' },
  { label: 'Mastercard', n: '5500 0055 5555 5559' },
  { label: 'Amex', n: '3782 822463 10005' },
  { label: '银联', n: '6222 0218 8888 8888 80' },
]
</script>

<template>
  <div class="panel mb-16">
    <label class="field-label" for="card-in">卡号(自动分组,只在本页内存中参与计算,不写入任何存储)</label>
    <input
      id="card-in"
      v-model="input"
      class="input card-input"
      inputmode="numeric"
      autocomplete="off"
      spellcheck="false"
      placeholder="如 6222 0218 8888 8888 88"
      @input="onInput"
    />
    <div class="row sample-row">
      <span class="tip">测试卡号:</span>
      <button v-for="s in SAMPLES" :key="s.label" class="btn btn-sm" @click="input = s.n">{{ s.label }}</button>
    </div>
  </div>

  <div v-if="result.error" class="error-box mb-14">✗ {{ result.error }}</div>

  <template v-else-if="result.data">
    <div class="stat-grid">
      <div class="panel stat-card" :class="result.data.luhn ? 'ok-card' : 'bad-card'">
        <div class="stat-icon-wrap">
          <AppIcon :name="result.data.luhn ? 'circle-check' : 'circle-x'" :size="30" />
        </div>
        <div class="stat-label">{{ result.data.luhn ? 'Luhn 校验通过' : 'Luhn 校验不通过:号码有误或非银行卡号' }}</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ result.data.brand.name }}</div>
        <div class="stat-label">卡组织(BIN:{{ result.data.digits.slice(0, 6) }})</div>
        <div v-if="result.data.lengthOk !== null" class="stat-tag" :class="result.data.lengthOk ? 'tone-ok' : 'tone-warn'">
          {{ result.data.lengthOk ? '位数符合规范' : `位数异常(规范:${result.data.brand.lens.join('/')} 位)` }}
        </div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value mono-line">{{ result.data.masked }}</div>
        <div class="stat-label">打码展示<span class="tip"> · 前 6 后 4</span></div>
        <button class="btn btn-sm mt-8" @click="copy('mask', result.data.masked)">
          <AppIcon :name="copiedKey === 'mask' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'mask' ? '已复制' : '复制打码格式' }}
        </button>
      </div>
    </div>

    <div class="panel mt-16">
      <p class="tip m-0">
        Luhn 算法(ISO/IEC 7812-1)只能验证号码「长得像不像合法卡号」:校验不通过的一定有误,通过也不代表卡真实存在或可用。
        银联卡以 62 开头、16~19 位;Visa 4 开头;Mastercard 51~55 与 2221~2720;Amex 34/37 且 15 位。
        校验全部在本页完成,卡号不会发送到任何服务器——请勿在不可信的网站输入真实卡号。
      </p>
    </div>
  </template>
</template>

<style scoped>
.card-input {
  font-family: var(--mono);
  font-size: 20px;
  letter-spacing: 2px;
}
.sample-row {
  margin-top: 12px;
  gap: 6px;
  flex-wrap: wrap;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 720px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
.stat-card {
  text-align: center;
  padding: 18px 14px;
}
.stat-card.ok-card {
  border-color: color-mix(in srgb, var(--success) 45%, var(--border));
}
.stat-card.bad-card {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
}
.stat-icon-wrap {
  color: var(--success);
  margin-bottom: 8px;
}
.bad-card .stat-icon-wrap {
  color: var(--danger);
}
.stat-value {
  font-family: var(--mono);
  font-size: 21px;
  font-weight: 700;
  color: var(--accent);
  word-break: break-all;
}
.mono-line {
  letter-spacing: 1px;
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.6;
}
.stat-tag {
  margin-top: 8px;
  display: inline-block;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
}
.tone-ok { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.tone-warn { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
</style>
