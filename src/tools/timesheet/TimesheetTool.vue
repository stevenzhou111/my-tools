<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { sumTimesheet } from '@/utils/timesheet'

/**
 * 工时累加:逐行「开始-结束」(支持跨午夜)或纯时长,汇总 + 错行标注。
 * 全部本地计算。
 */

const input = ref('09:00-18:00\n13:00-14:00 休\n19:30-21:00')

const r = computed(() => sumTimesheet(input.value))
const rowsText = computed(() =>
  r.value.rows
    .map((row) => {
      if (row.error) return `第 ${row.line} 行:✗ ${row.error}`
      const h = Math.floor(row.minutes / 60)
      const m = row.minutes % 60
      return `第 ${row.line} 行:${h ? h + ' 小时 ' : ''}${m ? m + ' 分' : h ? '' : '0 分'}`
    })
    .join('\n'),
)
</script>

<template>
  <div class="field">
    <label class="field-label" for="ts-in">每行一条:时间区间或纯时长</label>
    <textarea id="ts-in" v-model="input" class="textarea" rows="6" spellcheck="false"></textarea>
    <p class="tip mt-10">
      支持:09:00-18:00(可 - ~ 至,跨午夜自动进位)、8.5h / 7.5小时、90m / 30分、2:15。空行忽略。
    </p>
  </div>

  <div class="panel mb-16">
    <p class="field-label">汇总</p>
    <p class="total m-0">
      <b>{{ r.human }}</b>
      <span class="tip">({{ r.totalMinutes }} 分钟,共 {{ r.rows.length }} 行有效)</span>
    </p>
  </div>

  <div v-if="r.errors.length" class="error-box mb-14">
    ✗ {{ r.errors.length }} 行看不懂,已跳过:<span class="tip">{{ r.errors.map((e) => `第 ${e.line} 行`).join('、') }}</span>
  </div>

  <label class="field-label" for="ts-rows">逐行明细</label>
  <textarea id="ts-rows" class="textarea" rows="6" readonly :value="rowsText"></textarea>
  <div class="row mt-10">
    <CopyButton class="btn btn-sm" :text="rowsText" label="复制明细" />
  </div>
</template>

<style scoped>
.total { font-size: 20px; }
</style>
