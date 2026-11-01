<script setup>
import { computed, ref, watch } from 'vue'
import { ddToDms, dmsToDd, parseDmsText } from '@/utils/dms'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'
import AppIcon from '@/components/AppIcon.vue'

const kind = ref('lat') // lat | lon
const dd = ref(31.22949)
const deg = ref(31)
const min = ref(13)
const sec = ref(46.164)
const hemi = ref('N')
const freeText = ref('')

const { copiedKey, copy } = useCopy()

// 切换经纬度时把半球切到合法档(N/S ↔ E/W)
watch(kind, (k) => {
  if (k === 'lon' && ['N', 'S'].includes(hemi.value)) hemi.value = 'E'
  if (k === 'lat' && ['E', 'W'].includes(hemi.value)) hemi.value = 'N'
})

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= -hi && v <= hi ? v : undefined
}
useUrlState([
  { key: 'k', ref: kind, parse: (s) => (['lat', 'lon'].includes(s) ? s : undefined) },
  { key: 'v', ref: dd, parse: num(-180, 180) },
])

const ddResult = computed(() => ddToDms(dd.value, kind.value))

const ddResult2 = computed(() => dmsToDd({ deg: deg.value, min: min.value, sec: sec.value, hemi: hemi.value }))

// 自由文本解析 → DMS → DD
const freeResult = computed(() => {
  const p = parseDmsText(freeText.value)
  if (!p) return null
  return dmsToDd(p)
})

function pasteFromDd() {
  const r = ddResult.value
  if (!r.error) {
    deg.value = r.data.deg
    min.value = r.data.min
    sec.value = r.data.sec
    hemi.value = r.data.hemi
  }
}

function pasteFromDms() {
  const r = ddResult2.value
  if (!r.error) dd.value = r.data.dd
}

function applyFree() {
  const r = freeResult.value
  if (!r || r.error) return
  const isLat = ['N', 'S'].includes(freeResult.value.data.roundTrip?.slice(-1) || 'N')
  kind.value = isLat ? 'lat' : 'lon'
  dd.value = r.data.dd
}
</script>

<template>
  <div class="panel mb-16">
    <div class="row gap-8" role="radiogroup" aria-label="坐标类型">
      <button class="btn btn-sm" :class="{ 'btn-primary': kind === 'lat' }" role="radio" :aria-checked="kind === 'lat'" @click="kind = 'lat'">纬度(N/S,±90)</button>
      <button class="btn btn-sm" :class="{ 'btn-primary': kind === 'lon' }" role="radio" :aria-checked="kind === 'lon'" @click="kind = 'lon'">经度(E/W,±180)</button>
    </div>
  </div>

  <div class="grid-2 mb-16">
    <!-- 十进制 → DMS -->
    <div class="panel">
      <p class="m-0 mb-10"><b>十进制度 → 度分秒</b></p>
      <label class="ctrl mb-10">
        <span class="field-label m-0">十进制度({{ kind === 'lat' ? '负数 = 南纬 S' : '负数 = 西经 W' }})</span>
        <input v-model.number="dd" class="input mono-input" type="number" step="0.000001" :min="kind === 'lat' ? -90 : -180" :max="kind === 'lat' ? 90 : 180" />
      </label>
      <div v-if="ddResult.error" class="error-box my-8">✗ {{ ddResult.error }}</div>
      <template v-else-if="ddResult.data">
        <div class="out-line mono">{{ ddResult.data.text }}</div>
        <div class="row mt-8">
          <button class="btn btn-sm" @click="copy('dd-out', ddResult.data.text)">
            <AppIcon :name="copiedKey === 'dd-out' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'dd-out' ? '已复制' : '复制 DMS' }}
          </button>
          <button class="btn btn-sm" @click="pasteFromDd">填入右侧反向换算 →</button>
        </div>
      </template>
    </div>

    <!-- DMS → 十进制 -->
    <div class="panel">
      <p class="m-0 mb-10"><b>度分秒 → 十进制度</b></p>
      <div class="dms-row">
        <label class="ctrl"><span class="field-label m-0">度</span><input v-model.number="deg" class="input tiny" type="number" min="0" /></label>
        <label class="ctrl"><span class="field-label m-0">分</span><input v-model.number="min" class="input tiny" type="number" min="0" max="59.99" /></label>
        <label class="ctrl"><span class="field-label m-0">秒</span><input v-model.number="sec" class="input tiny" type="number" min="0" max="59.999" step="0.001" /></label>
        <div class="ctrl" role="radiogroup" aria-label="半球">
          <span class="field-label m-0">半球</span>
          <div class="row hemi-row">
            <button
              v-for="h in kind === 'lat' ? ['N', 'S'] : ['E', 'W']"
              :key="h"
              class="btn btn-sm"
              :class="{ 'btn-primary': hemi === h }"
              role="radio"
              :aria-checked="hemi === h"
              @click="hemi = h"
            >
              {{ h }}
            </button>
          </div>
        </div>
      </div>
      <div v-if="ddResult2.error" class="error-box my-8">✗ {{ ddResult2.error }}</div>
      <template v-else-if="ddResult2.data">
        <div class="out-line mono">{{ ddResult2.data.dd }}</div>
        <div class="row mt-8">
          <button class="btn btn-sm" @click="copy('dms-out', String(ddResult2.data.dd))">
            <AppIcon :name="copiedKey === 'dms-out' ? 'check' : 'clipboard'" :size="13" />{{ copiedKey === 'dms-out' ? '已复制' : '复制十进制' }}
          </button>
          <button class="btn btn-sm" @click="pasteFromDms">← 填入左侧反向换算</button>
        </div>
      </template>
    </div>
  </div>

  <div class="panel">
    <p class="m-0 mb-8"><b>整段粘贴识别</b>(支持 31°13′45.2″N / 31 13 45.2 N / 北纬31度13分45秒)</p>
    <div class="row">
      <input v-model="freeText" class="input grow-input" type="text" spellcheck="false" placeholder="粘贴任意写法的坐标…" />
      <button class="btn btn-sm" :disabled="!freeResult || freeResult.error" @click="applyFree">解析并填入</button>
    </div>
    <p v-if="freeText && freeResult && !freeResult.error" class="tip m-0 mt-8">
      识别为 {{ freeResult.data.dd }}(反向自检:{{ freeResult.data.roundTrip }})
    </p>
    <p v-else-if="freeText && (!freeResult || freeResult.error)" class="tip m-0 mt-8">未能识别:需要包含度/分/秒数字与半球(N/S/E/W 或中文)</p>
    <p class="tip m-0 mt-10">
      十进制度是 GPS 与地图软件的通用格式,度分秒常见于测绘与航海记录;1 秒约 30 米。
      也可配合「图片信息/EXIF」查看照片 GPS,再用本工具转成喜欢的格式。
    </p>
  </div>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mono-input {
  font-family: var(--mono);
}
.out-line {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 12px 16px;
  word-break: break-all;
}
.dms-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.tiny {
  width: 86px;
  font-family: var(--mono);
}
.hemi-row {
  gap: 6px;
}
.grow-input {
  flex: 1;
  min-width: 200px;
  font-family: var(--mono);
}
</style>
