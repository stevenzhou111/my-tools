<script setup>
import { computed, ref } from 'vue'
import { float32Bits, float64Bits } from '@/utils/floatBits'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const raw = ref('0.1')
useUrlState([{ key: 'n', ref: raw, parse: (s) => (s.length <= 30 && Number.isFinite(Number(s)) ? s : undefined) }])
const { copiedKey, copy } = useCopy()

const value = computed(() => Number(raw.value))
const valid = computed(() => raw.value.trim() !== '' && Number.isFinite(value.value))

const f64 = computed(() => (valid.value ? float64Bits(value.value) : null))
const f32 = computed(() => (valid.value ? float32Bits(value.value) : null))

const KIND_NAMES = {
  normal: '常规数',
  subnormal: '次正规数(精度下降)',
  zero: '零',
  infinity: '无穷大',
  nan: '非数 NaN',
}

const PRESETS = [
  { label: '0.1', v: '0.1' },
  { label: '0.1 + 0.2', v: String(0.1 + 0.2) },
  { label: '0.3', v: '0.3' },
  { label: '1 / 3', v: String(1 / 3) },
  { label: '1e308 × 10', v: String(1e308 * 10) },
  { label: '最大安全整数', v: String(Number.MAX_SAFE_INTEGER) },
  { label: 'π', v: String(Math.PI) },
]
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    输入任意数字,看它在 IEEE 754 双精度(64 位,JS 的 number)与单精度(32 位,C 的 float)下实际存储的位型——
    理解 <code>0.1 + 0.2 !== 0.3</code> 的关键就是看尾数那位没算完的 1。
  </p>

  <div class="field">
    <label class="field-label" for="fb-in">数值(支持科学计数法)</label>
    <input id="fb-in" v-model="raw" class="input" style="font-family: var(--mono); font-size: 17px" spellcheck="false" placeholder="如 0.1 或 1e-300" />
    <div class="row" style="margin-top: 8px">
      <button v-for="p in PRESETS" :key="p.label" class="btn btn-sm" @click="raw = p.v">{{ p.label }}</button>
    </div>
  </div>

  <div v-if="!valid" class="error-box">✗ 请输入一个有限数字</div>

  <template v-else>
    <div class="panel" style="margin-top: 4px">
      <div class="bits-head">
        <span>双精度 double(64 位)</span>
        <button class="btn btn-sm" @click="copy('f64', f64.hex)">{{ copiedKey === 'f64' ? '✓ 已复制' : f64.hex }}</button>
      </div>
      <div class="bits-line" aria-label="64 位位型">
        <span class="b-sign" :title="`符号位 = ${f64.signBit}`">{{ f64.signBit }}</span>
        <span class="b-exp" :title="`指数位(11 位)= ${f64.expBits}`">{{ f64.expBits }}</span>
        <span class="b-frac" :title="`尾数位(52 位)`">{{ f64.fracBits }}</span>
      </div>
      <p class="tip" style="margin: 8px 0 0">
        {{ KIND_NAMES[f64.kind] }} · 符号 {{ f64.sign }} · 指数域 {{ parseInt(f64.expBits, 2) }}(真实指数 {{ f64.exponent }})
        <template v-if="f64.kind === 'normal'"> · 值 = (1 + 尾数) × 2<sup>{{ f64.exponent }}</sup></template>
      </p>
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="bits-head">
        <span>单精度 float(32 位)</span>
        <button class="btn btn-sm" @click="copy('f32', f32.hex)">{{ copiedKey === 'f32' ? '✓ 已复制' : f32.hex }}</button>
      </div>
      <div class="bits-line small" aria-label="32 位位型">
        <span class="b-sign" :title="`符号位 = ${f32.signBit}`">{{ f32.signBit }}</span>
        <span class="b-exp" :title="`指数位(8 位)= ${f32.expBits}`">{{ f32.expBits }}</span>
        <span class="b-frac" :title="`尾数位(23 位)`">{{ f32.fracBits }}</span>
      </div>
      <p class="tip" style="margin: 8px 0 0">
        {{ KIND_NAMES[f32.kind] }} · 真实指数 {{ f32.exponent }} ·
        舍入回读值 <code>{{ f32.value }}</code>
        <template v-if="f32.value !== value">(<b>与原值有差</b>,精度已损失)</template>
      </p>
    </div>

    <p class="tip" style="margin-top: 12px">
      红色为符号位、黄色为指数位、绿色为尾数位。位型由 DataView 写入后按字节读出,与平台无关;
      数值会同步到地址栏,复制链接即可分享当前位型。
    </p>
  </template>
</template>

<style scoped>
.bits-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 10px;
}
.bits-head .btn {
  font-family: var(--mono);
}
.bits-line {
  font-family: var(--mono);
  font-size: 13.5px;
  letter-spacing: 2px;
  word-break: break-all;
  line-height: 2;
}
.bits-line.small {
  font-size: 13.5px;
}
.b-sign {
  background: rgba(220, 38, 38, 0.22);
  border-radius: 3px;
  padding: 1px 3px;
}
.b-exp {
  background: rgba(217, 119, 6, 0.25);
  border-radius: 3px;
  padding: 1px 3px;
}
.b-frac {
  background: rgba(22, 163, 74, 0.2);
  border-radius: 3px;
  padding: 1px 3px;
}
</style>
