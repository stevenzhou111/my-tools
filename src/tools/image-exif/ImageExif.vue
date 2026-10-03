<script setup>
import { ref } from 'vue'
import exifr from 'exifr'
import { formatSize } from '@/utils/format'

const fileInput = ref(null)
const dragging = ref(false)
const file = ref(null)
const imageDims = ref('')
const exifRows = ref([])
const gps = ref(null)
const error = ref('')
const busy = ref(false)
const hasExif = ref(false)

function pick() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) load(f)
}
function onDrop(e) {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}

async function load(f) {
  error.value = ''
  exifRows.value = []
  gps.value = null
  hasExif.value = false
  imageDims.value = ''
  if (!f.type.startsWith('image/')) return (error.value = '请选择图片文件')
  file.value = f
  busy.value = true
  try {
    // 基础信息
    const bmp = await createImageBitmap(f)
    imageDims.value = `${bmp.width} × ${bmp.height} px`
    bmp.close?.()
    // EXIF:显式启用各 IFD(默认只解析 IFD0,拍摄参数在 Exif 子 IFD 会缺失)
    const parsed = await exifr.parse(f, { ifd0: true, exif: true, gps: true })
    if (parsed) {
      const LABELS = [
        ['Make', '相机品牌'],
        ['Model', '相机型号'],
        ['LensModel', '镜头'],
        ['DateTimeOriginal', '拍摄时间'],
        ['ExposureTime', '曝光时间', (v) => `${v}s`],
        ['FNumber', '光圈', (v) => `f/${v}`],
        ['ISO', '感光度 ISO'],
        ['FocalLength', '焦距', (v) => `${Math.round(v)}mm`],
        ['ExposureBiasValue', '曝光补偿'],
        ['MeteringMode', '测光模式'],
        ['Flash', '闪光灯'],
        ['WhiteBalance', '白平衡'],
        ['Orientation', '方向标记'],
        ['Software', '处理软件'],
      ]
      for (const [key, label, fmt] of LABELS) {
        if (parsed[key] != null && parsed[key] !== '') {
          exifRows.value.push({ label, value: fmt ? String(fmt(parsed[key])) : String(parsed[key]) })
        }
      }
      // 只有真的解析出条目才算"含 EXIF",避免空结果误判
      hasExif.value = exifRows.value.length > 0
      if (parsed.latitude != null && parsed.longitude != null) {
        gps.value = { lat: +parsed.latitude.toFixed(6), lon: +parsed.longitude.toFixed(6) }
      }
    }
  } catch (e) {
    error.value = '读取失败:' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    class="dropzone"
    :class="{ dragging }"
    @click="pick"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
    <div class="dz-icon">🔍</div>
    <p><strong>点击选择图片</strong> 或拖拽到此处</p>
    <p class="tip">查看尺寸、拍摄参数(相机/光圈/ISO)与 GPS 位置;JPG 原图信息最全</p>
  </div>

  <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>
  <p v-if="busy" class="tip" style="margin-top: 10px">解析中…</p>

  <template v-if="file">
    <div class="panel" style="margin-top: 14px">
      <div class="base-row"><strong>{{ file.name }}</strong></div>
      <div class="base-row tip">类型 {{ file.type || '未知' }} · 大小 {{ formatSize(file.size) }}<template v-if="imageDims"> · 尺寸 {{ imageDims }}</template></div>
    </div>

    <div v-if="!hasExif" class="tip" style="margin-top: 12px">
      该图片不含 EXIF 信息 —— 可能是截图、经社交软件压缩过,或拍摄时关闭了位置等信息。
    </div>

    <div v-else class="panel" style="margin-top: 12px">
      <label class="field-label">EXIF 拍摄信息</label>
      <div v-for="r in exifRows" :key="r.label" class="exif-row">
        <span class="exif-label">{{ r.label }}</span>
        <code>{{ r.value }}</code>
      </div>
    </div>

    <div v-if="gps" class="panel" style="margin-top: 12px">
      <label class="field-label">📍 拍摄位置</label>
      <div class="exif-row">
        <span class="exif-label">经纬度</span>
        <code>{{ gps.lat }}, {{ gps.lon }}</code>
      </div>
      <div class="row" style="margin-top: 8px">
        <a :href="`https://uri.amap.com/marker?position=${gps.lon},${gps.lat}`" target="_blank" rel="noopener noreferrer" class="btn btn-sm">高德地图查看</a>
        <a :href="`https://www.google.com/maps?q=${gps.lat},${gps.lon}`" target="_blank" rel="noopener noreferrer" class="btn btn-sm">Google 地图</a>
      </div>
      <p class="tip" style="margin-top: 8px">⚠️ 分享原图会泄露拍摄位置,发图前建议抹除。</p>
    </div>
  </template>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 42px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: border-color 0.15s, background 0.15s;
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 40px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.base-row {
  padding: 3px 0;
}
.exif-row {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--border);
  font-size: 14.5px;
}
.exif-row:last-child {
  border-bottom: none;
}
.exif-label {
  width: 100px;
  flex-shrink: 0;
  color: var(--muted);
}
.exif-row code {
  word-break: break-all;
}
</style>
