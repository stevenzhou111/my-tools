<script setup>
import { computed, ref } from 'vue'
import { checkDigit, maskIdCard, parseIdCard } from '@/utils/idCard'
import { useCopy } from '@/utils/useCopy'

const input = ref('11010519491231002X')
const { copiedKey, copy } = useCopy()

const result = computed(() => parseIdCard(input.value))
const masked = computed(() => maskIdCard(input.value))

const SAMPLES = [
  { label: '样例(北京)', v: '11010519491231002X' },
  { label: '女性 2000 年生', v: '110101200001010029' },
  { label: '校验位错误', v: '110105194912310021' },
]
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    解析 18 位身份证号:省级行政区、出生日期、性别、年龄,并按 GB 11643-1999 校验末位校验码。
    全部在本地计算;身份证号是敏感信息,本工具不把号码写入地址栏,请勿粘贴他人真实号码。
  </p>

  <div class="field">
    <label class="field-label" for="id-in">身份证号</label>
    <input id="id-in" v-model="input" class="input" style="font-family: var(--mono); font-size: 17px" spellcheck="false" placeholder="18 位身份证号" />
    <div class="row" style="margin-top: 8px">
      <button v-for="s in SAMPLES" :key="s.v" class="btn btn-sm" @click="input = s.v">{{ s.label }}</button>
    </div>
  </div>

  <div v-if="input && !result.ok" class="error-box">✗ {{ result.error }}</div>

  <template v-if="result.ok">
    <div class="stat-grid">
      <div class="panel stat">
        <div class="stat-value">{{ result.province }}</div>
        <div class="stat-label">省级行政区(前 2 位:{{ input.slice(0, 2) }})</div>
      </div>
      <div class="panel stat">
        <div class="stat-value">{{ result.birth }}</div>
        <div class="stat-label">出生日期(第 7–14 位)</div>
      </div>
      <div class="panel stat">
        <div class="stat-value">{{ result.gender }}</div>
        <div class="stat-label">性别(第 17 位 {{ result.sexCode }},{{ +result.sexCode % 2 === 1 ? '奇' : '偶' }}数)</div>
      </div>
      <div class="panel stat">
        <div class="stat-value">{{ result.age }} 岁</div>
        <div class="stat-label">周岁(按今天计算)</div>
      </div>
    </div>

    <div class="panel" style="margin-top: 14px">
      <div class="row" style="justify-content: space-between">
        <div>
          <span class="field-label" style="margin: 0">校验</span>
          <p class="tip" style="margin: 4px 0 0">
            ✅ 校验位正确:第 18 位由前 17 位按 GB 11643-1999 加权取模得出,应为
            <code>{{ checkDigit(input.slice(0, 17)) }}</code>,实际 <code>{{ input.slice(17).toUpperCase() }}</code>。
            <template v-if="masked">打码展示:<code>{{ masked }}</code></template>
          </p>
        </div>
        <button class="btn btn-sm" @click="copy('masked', masked ?? '')">
          {{ copiedKey === 'masked' ? '✓ 已复制' : '复制打码号码' }}
        </button>
      </div>
    </div>
  </template>

  <details class="panel" style="margin-top: 14px">
    <summary>📖 说明与边界</summary>
    <p class="tip">
      校验位算法:前 17 位分别乘权重 [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2] 求和,模 11 映射到
      「10X98765432」。本工具只内置省级行政区代码(市县级全表数万条且逐年更新,不在此范围);
      校验位正确不代表号码真实存在,仅供开发测试时验证格式(可配合「随机测试数据」生成假号码)。
    </p>
  </details>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat {
  text-align: center;
  padding: 16px 12px;
}
.stat-value {
  font-family: var(--mono);
  font-size: 21px;
  font-weight: 700;
  color: var(--accent);
  word-break: break-all;
}
.stat-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--muted);
}
</style>
