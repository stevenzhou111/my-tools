<script setup>
import { computed, ref } from 'vue'
import { sizeMB, bitrateKbps, downloadSeconds, humanSeconds } from '@/utils/mediaCalc'

/**
 * 码率/体积计算:剪视频前估文件大小、下片前估等待时间。
 * 口径:码率 kbps(千比特/秒),体积 MB(兆字节)。总码率 = 视频码率 + 音频码率。
 */

const min = ref(0)
const sec = ref(0)
const videoKbps = ref(8000)
const audioKbps = ref(128)
const sizeInput = ref(500)
const bandwidth = ref(50)

const durationSec = computed(() => (Number(min.value) || 0) * 60 + (Number(sec.value) || 0))

const estSize = computed(() => {
  const total = (Number(videoKbps.value) || 0) + (Number(audioKbps.value) || 0)
  if (durationSec.value <= 0 || total <= 0) return null
  return sizeMB(durationSec.value, total)
})

const estBitrate = computed(() => {
  if (durationSec.value <= 0 || !(Number(sizeInput.value) > 0)) return null
  return bitrateKbps(Number(sizeInput.value), durationSec.value)
})

const download = computed(() => {
  const mb = Number(sizeInput.value)
  const bw = Number(bandwidth.value)
  if (!(mb > 0) || !(bw > 0)) return null
  return humanSeconds(downloadSeconds(mb, bw))
})

function fmtMB(v) {
  return v >= 1024 ? `${(v / 1024).toFixed(2)} GB(${v.toFixed(1)} MB)` : `${v.toFixed(1)} MB`
}
</script>

<template>
  <div class="panel mb-16">
    <p class="field-label">按时长与码率估算体积</p>
    <div class="row ctrl-row">
      <label class="ctrl">
        <span class="field-label">时长(分)</span>
        <input v-model.number="min" class="input" type="number" min="0" style="width: 90px" />
      </label>
      <label class="ctrl">
        <span class="field-label">时长(秒)</span>
        <input v-model.number="sec" class="input" type="number" min="0" max="59" style="width: 90px" />
      </label>
      <label class="ctrl">
        <span class="field-label">视频码率(kbps)</span>
        <input v-model.number="videoKbps" class="input" type="number" min="0" style="width: 120px" />
      </label>
      <label class="ctrl">
        <span class="field-label">音频码率(kbps)</span>
        <input v-model.number="audioKbps" class="input" type="number" min="0" style="width: 110px" />
      </label>
    </div>
    <p class="result m-0 mt-10">
      <template v-if="estSize !== null">预计体积 <b>{{ fmtMB(estSize) }}</b></template>
      <template v-else><span class="tip">填入时长与码率后自动计算</span></template>
    </p>
    <p class="tip m-0 mt-8">参考:1080p 直出 8000~12000kbps、B 站投稿推荐 ≤18000kbps;音频 AAC 常用 128~256kbps。</p>
  </div>

  <div class="panel mb-16">
    <p class="field-label">按体积反推总码率</p>
    <div class="row ctrl-row">
      <label class="ctrl">
        <span class="field-label">体积(MB)</span>
        <input v-model.number="sizeInput" class="input" type="number" min="0" style="width: 120px" />
      </label>
      <span class="ctrl-result tip">同一时长:{{ durationSec > 0 ? durationSec + ' 秒' : '请先填上方时长' }}</span>
    </div>
    <p class="result m-0 mt-10">
      <template v-if="estBitrate !== null">总码率 <b>{{ Math.round(estBitrate).toLocaleString() }} kbps</b>(视频可按 {{ Math.max(0, Math.round(estBitrate) - (Number(audioKbps) || 0)).toLocaleString() }} kbps 预留)</template>
      <template v-else><span class="tip">填入体积后自动计算</span></template>
    </p>
  </div>

  <div class="panel">
    <p class="field-label">下载时间估算</p>
    <div class="row ctrl-row">
      <label class="ctrl">
        <span class="field-label">体积(MB)</span>
        <input v-model.number="sizeInput" class="input" type="number" min="0" style="width: 120px" />
      </label>
      <label class="ctrl">
        <span class="field-label">带宽(Mbps)</span>
        <input v-model.number="bandwidth" class="input" type="number" min="0" style="width: 110px" />
      </label>
    </div>
    <p class="result m-0 mt-10">
      <template v-if="download !== null">预计耗时 <b>{{ download }}</b>(100MB @ 100Mbps ≈ 8 秒,理论值)</template>
      <template v-else><span class="tip">填入体积与带宽后自动计算</span></template>
    </p>
  </div>
</template>

<style scoped>
.ctrl-row {
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 14px;
}
.result {
  font-size: 15px;
}
.ctrl-result {
  padding-bottom: 10px;
}
</style>
