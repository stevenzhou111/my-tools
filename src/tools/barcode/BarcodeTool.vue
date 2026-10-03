<script setup>
import { ref } from 'vue'
import JsBarcode from 'jsbarcode'
import { downloadCanvas } from '@/utils/image'
import { debounce } from '@/utils/format'

const text = ref('CN-2026-0930')
const format = ref('CODE128')
const width = ref(2)
const height = ref(80)
const showText = ref(true)
const error = ref('')
const dataUrl = ref('')

const FORMATS = [
  { id: 'CODE128', hint: '最常用,支持任意字母数字' },
  { id: 'CODE39', hint: '支持大写字母、数字与 - . $ / + % 空格' },
  { id: 'EAN13', hint: '商品条码,需 12 或 13 位数字' },
  { id: 'EAN8', hint: '短版商品条码,需 7 或 8 位数字' },
  { id: 'UPC', hint: '北美商品条码,需 11 或 12 位数字' },
  { id: 'ITF14', hint: '物流条码,需 14 位数字' },
  { id: 'codabar', hint: '图书馆/血库,数字与 -$:/.+' },
]

function doGenerate() {
    error.value = ''
    dataUrl.value = ''
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, text.value, {
        format: format.value,
        width: width.value,
        height: height.value,
        displayValue: showText.value,
        fontSize: 16,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
      })
      dataUrl.value = canvas.toDataURL('image/png')
    } catch (e) {
      error.value = String(e.message || e).replace('Error: ', '')
    }
}

// 输入防抖:条码渲染不需要逐键执行
const generate = debounce(doGenerate, 200)
generate()

function download() {
  const canvas = document.createElement('canvas')
  try {
    JsBarcode(canvas, text.value, {
      format: format.value,
      width: width.value,
      height: height.value,
      displayValue: showText.value,
      fontSize: 16,
      margin: 10,
      background: '#ffffff',
    })
    downloadCanvas(canvas, 'barcode-' + format.value + '.png', 'image/png')
  } catch (e) {
    // 输入在生成与下载之间可能被用户改动(竞态),失败不能静默
    error.value = '生成或下载失败:' + (e?.message || e)
  }
}
</script>

<template>
  <div class="grid-2 barcode-grid">
    <div>
      <div class="field">
        <label class="field-label">条形码内容</label>
        <input v-model="text" class="input" spellcheck="false" @input="generate" />
      </div>
      <div class="field">
        <label class="field-label">码制</label>
        <select v-model="format" class="select" @change="generate">
          <option v-for="f in FORMATS" :key="f.id" :value="f.id">{{ f.id }}</option>
        </select>
        <p class="tip" style="margin-top: 6px">{{ FORMATS.find((f) => f.id === format).hint }}</p>
      </div>
      <div class="row">
        <label class="ctrl">
          <span class="field-label">粗细 {{ width }}</span>
          <input v-model.number="width" type="range" min="1" max="6" @input="generate" />
        </label>
        <label class="ctrl">
          <span class="field-label">高度 {{ height }} px</span>
          <input v-model.number="height" type="range" min="40" max="160" step="10" @input="generate" />
        </label>
        <label class="check" style="margin-top: 20px">
          <input v-model="showText" type="checkbox" @change="generate" />显示文字
        </label>
      </div>
      <div v-if="error" class="error-box" style="margin-top: 12px">✗ {{ error }}</div>
    </div>

    <div class="panel preview-panel">
      <img v-if="dataUrl" :src="dataUrl" class="barcode-img" alt="条形码" />
      <div v-else class="tip">输入内容后自动生成</div>
      <button v-if="dataUrl" class="btn btn-primary" style="margin-top: 14px" @click="download">
        ⬇️ 下载 PNG
      </button>
    </div>
  </div>
</template>

<style scoped>
.barcode-grid {
  align-items: start;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 150px;
}
.preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}
.barcode-img {
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
}
</style>
