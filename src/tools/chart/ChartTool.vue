<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart, RadarChart, ScatterChart, FunnelChart, GaugeChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { downloadUrl } from '@/utils/image'

echarts.use([
  BarChart, LineChart, PieChart, RadarChart, ScatterChart, FunnelChart, GaugeChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer,
])

const chartEl = ref(null)
const title = ref('月度支出')
const chartType = ref('bar')
let chart = null
let canvasDataUrl = ''

const TYPES = [
  { id: 'bar', name: '柱状图' },
  { id: 'barh', name: '条形图' },
  { id: 'line', name: '折线图' },
  { id: 'area', name: '面积图' },
  { id: 'pie', name: '饼图' },
  { id: 'ring', name: '环形图' },
  { id: 'radar', name: '雷达图' },
  { id: 'scatter', name: '散点图' },
  { id: 'funnel', name: '漏斗图' },
  { id: 'gauge', name: '仪表盘' },
]

const input = ref(`一月,3200,2800
二月,4100,2600
三月,3600,3100
四月,5200,2900
五月,4800,3300
六月,5600,3600`)

// 第一列为标签,其余各列是一个数据系列
const parsed = computed(() => {
  const rows = input.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,，\t]/).map((c) => c.trim()))
  if (!rows.length) return { labels: [], series: [] }
  const first = rows[0].slice(1)
  // 首行若为非数字则视为表头
  const hasHeader = first.length > 0 && first.some((c) => c !== '' && Number.isNaN(Number(c)))
  const dataRows = hasHeader ? rows.slice(1) : rows
  const labels = dataRows.map((r) => r[0] ?? '')
  const series = []
  const colCount = hasHeader ? rows[0].length : Math.max(...dataRows.map((r) => r.length))
  for (let c = 1; c < colCount; c++) {
    series.push({
      name: hasHeader ? rows[0][c] || `系列 ${c}` : `系列 ${c}`,
      values: dataRows.map((r) => Number(r[c]) || 0),
    })
  }
  return { labels, series }
})

const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16']

function buildOption() {
  const { labels, series } = parsed.value
  const t = title.value
  const common = {
    title: { text: t || undefined, left: 'center', top: 8, textStyle: { fontSize: 16, color: '#1f2430' } },
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { bottom: 6, textStyle: { color: '#4b5563' } } : undefined,
    color: PALETTE,
    animation: false,
  }
  switch (chartType.value) {
    case 'bar':
    case 'barh': {
      const vertical = chartType.value === 'barh'
      return {
        ...common,
        grid: { top: 56, left: 60, right: 30, bottom: 56 },
        [vertical ? 'yAxis' : 'xAxis']: { type: 'category', data: labels },
        [vertical ? 'xAxis' : 'yAxis']: { type: 'value' },
        series: series.map((s) => ({ name: s.name, type: 'bar', data: s.values, barMaxWidth: 42 })),
      }
    }
    case 'line':
    case 'area':
      return {
        ...common,
        grid: { top: 56, left: 60, right: 30, bottom: 56 },
        xAxis: { type: 'category', data: labels },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name, type: 'line', data: s.values, smooth: true,
          areaStyle: chartType.value === 'area' ? { opacity: 0.25 } : undefined,
        })),
      }
    case 'pie':
    case 'ring':
      return {
        ...common,
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: chartType.value === 'ring' ? ['42%', '68%'] : '68%',
          center: ['50%', '54%'],
          data: labels.map((l, i) => ({ name: l, value: series[0]?.values[i] ?? 0 })),
          label: { formatter: '{b}: {d}%' },
        }],
      }
    case 'radar': {
      // 逐维度取各系列最大值作为刻度上限(避免标签重复时 indexOf 错位)
      const maxByRow = labels.map((_, i) => Math.max(...series.map((s) => s.values[i] ?? 0), 1))
      return {
        ...common,
        tooltip: {},
        radar: {
          indicator: labels.map((l, i) => ({ name: l, max: Math.ceil(maxByRow[i] * 1.3) })),
          radius: '58%',
          center: ['50%', '54%'],
        },
        series: [{ type: 'radar', data: series.map((s) => ({ name: s.name, value: s.values })) }],
      }
    }
    case 'scatter':
      return {
        ...common,
        grid: { top: 56, left: 60, right: 30, bottom: 56 },
        xAxis: { type: 'value', name: labels[0] },
        yAxis: { type: 'value' },
        series: series.map((s) => ({
          name: s.name, type: 'scatter', data: s.values.map((y, i) => [i + 1, y]), symbolSize: 14,
        })),
      }
    case 'funnel':
      return {
        ...common,
        tooltip: { trigger: 'item' },
        series: [{
          type: 'funnel', left: '15%', width: '70%', top: 56, bottom: 20,
          data: labels.map((l, i) => ({ name: l, value: series[0]?.values[i] ?? 0 })).sort((a, b) => b.value - a.value),
          label: { formatter: '{b} {c}' },
        }],
      }
    case 'gauge':
      return {
        ...common,
        series: [{
          type: 'gauge', center: ['50%', '60%'],
          min: 0,
          max: Math.max(100, Math.ceil((series[0]?.values[0] ?? 100) * 1.2)),
          detail: { formatter: '{value}', fontSize: 28, offsetCenter: [0, '62%'] },
          data: [{ value: series[0]?.values[0] ?? 0, name: labels[0] || '' }],
        }],
      }
    default:
      return common
  }
}

function render() {
  if (!chartEl.value) return
  if (!chart) {
    chart = echarts.init(chartEl.value, null, { renderer: 'canvas' })
  }
  chart.setOption(buildOption(), true)
  canvasDataUrl = chart.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' })
}

watch([title, chartType, parsed], () => render(), { deep: true })

onMounted(() => render())

function download() {
  downloadUrl(canvasDataUrl, (title.value || 'chart') + '.png')
}

function resize() {
  chart?.resize()
}
window.addEventListener('resize', resize)
onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label v-for="t in TYPES" :key="t.id" class="check">
      <input v-model="chartType" type="radio" :value="t.id" />{{ t.name }}
    </label>
  </div>

  <div class="field">
    <label class="field-label">图表标题</label>
    <input v-model="title" class="input" spellcheck="false" />
  </div>

  <div class="field">
    <label class="field-label">
      数据(每行一条,逗号分隔;第一列是标签,其余列是数值;首行非数字时视为系列名)
    </label>
    <textarea v-model="input" class="textarea" rows="7" spellcheck="false"></textarea>
  </div>

  <div class="panel chart-panel">
    <div ref="chartEl" class="chart"></div>
  </div>

  <div class="row" style="margin-top: 12px">
    <button class="btn btn-primary" @click="download">⬇️ 下载 PNG</button>
    <span class="tip">共 {{ parsed.labels.length }} 行数据 · {{ parsed.series.length }} 个系列</span>
  </div>
</template>

<style scoped>
.chart-panel {
  padding: 8px;
}
.chart {
  width: 100%;
  height: 420px;
}
</style>
