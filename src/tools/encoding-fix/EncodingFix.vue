<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, ref } from 'vue'
import { CANDIDATES, decodeWith, detectEncoding, repairLatin1 } from '@/utils/encodingDetect'
import { downloadBlob } from '@/utils/image'

const fileName = ref('')
const bytes = ref(null)
const picked = ref('utf-8')
const error = ref('')
const pasteText = ref('')
const pasteResult = ref(null)

const result = computed(() => (bytes.value ? detectEncoding(bytes.value) : null))
const current = computed(() => result.value?.results.find((r) => r.enc === picked.value))

function pick() {}
function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) load(f)
}
function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (f) load(f)
}
async function load(f) {
  error.value = ''
  // 只取前 256KB 做检测与预览,避免超大文件整读
  bytes.value = new Uint8Array(await f.slice(0, 256 * 1024).arrayBuffer())
  fileName.value = f.name
  const r = detectEncoding(bytes.value)
  picked.value = r.best
}
function downloadAs() {
  const r = current.value
  if (!r?.ok) return
  downloadBlob(new Blob([r.text], { type: 'text/plain;charset=utf-8' }), (fileName.value.replace(/\.[^.]+$/, '') || 'file') + '-utf8.txt')
}

function repairPaste() {
  pasteResult.value = repairLatin1(pasteText.value)
  if (!pasteResult.value) error.value = '这段文本不是 Latin-1 乱码形态(没有高位字节可反转),或反转后不是合法 UTF-8'
  else error.value = ''
}
</script>

<template>
  <p class="tip" style="margin-bottom: 14px">
    打开文本文件(TXT/CSV/JSON/MD 等)后,用多种常见编码<b>全矩阵试解</b>并按可读性自动评分,一键以 UTF-8 重新导出;也可粘贴「ä½ å¥½」这类 Latin-1 乱码做反转修复。⚠️ 浏览器无法把字符串重新编码为 GBK,因此「UTF-8 被按 GBK 误读」且已产生替换符(�)的内容属于有损损坏,无法还原。
  </p>

  <div class="dropzone" @click="pick" @dragover.prevent @drop.prevent="onDrop">
    <input type="file" class="sr-only" aria-label="选择文本文件" @change="onFileChange" />
    <div class="dz-icon"><AppIcon name="type" :size="30" /></div>
    <p v-if="!fileName"><strong>点击选择文本文件</strong> 或拖拽到此处(取前 256KB 检测)</p>
    <p v-else>{{ fileName }}</p>
  </div>

  <template v-if="result">
    <div class="row mt-12" style="flex-wrap: wrap">
      <label class="ctrl">
        <span class="field-label" for="enc-pick">以哪种编码解读</span>
        <select id="enc-pick" v-model="picked" class="select" style="width: 220px">
          <option v-for="r in result.results" :key="r.enc" :value="r.enc" :disabled="!r.ok">
            {{ r.label }}{{ r.enc === result.best ? '(自动推荐)' : r.ok ? '' : '(无法解读)' }}
          </option>
        </select>
      </label>
      <button class="btn btn-primary" :disabled="!current?.ok" @click="downloadAs">⬇️ 按 UTF-8 导出</button>
    </div>

    <div v-if="current" class="panel mt-12">
      <p class="tip" style="margin-bottom: 8px">预览(前 1200 字符):</p>
      <pre class="output enc-preview">{{ current.text ? current.text.slice(0, 1200) : '(空文件)' }}</pre>
    </div>

    <div class="panel mt-12">
      <p class="tip" style="margin-bottom: 8px">各编码评分(越高越像正确解码):</p>
      <div v-for="r in result.results" :key="r.enc" class="score-row">
        <span style="width: 170px">{{ r.label }}</span>
        <div class="score-bar">
          <div class="score-fill" :style="{ width: Math.max(0, Math.min(100, r.score + 20)) + '%', background: r.enc === result.best ? 'var(--accent)' : 'var(--border)' }"></div>
        </div>
        <span class="tip" style="width: 90px; text-align: right">{{ r.ok ? r.score.toFixed(1) : '无法解读' }}</span>
      </div>
    </div>
  </template>

  <div class="field mt-14">
    <label class="field-label" for="enc-paste">粘贴 Latin-1 形态乱码修复(如 ä½ å¥½)</label>
    <textarea id="enc-paste" v-model="pasteText" class="textarea" rows="3" spellcheck="false"></textarea>
    <button class="btn mt-8" @click="repairPaste">尝试修复</button>
    <p v-if="pasteResult" class="repair-ok">修复结果:{{ pasteResult }}</p>
    <div v-if="error && pasteText" class="error-box mt-8">✗ {{ error }}</div>
  </div>
</template>

<style scoped>
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
}
.dropzone:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.dz-icon {
  font-size: 36px;
  margin-bottom: 6px;
}
.dropzone p { margin: 4px 0; }
.enc-preview {
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-all;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  padding: 3px 0;
}
.score-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-soft);
  border-radius: 5px;
  overflow: hidden;
}
.score-fill {
  height: 100%;
  border-radius: 5px;
}
.repair-ok {
  color: var(--success);
  font-size: 14px;
  margin-top: 8px;
  word-break: break-all;
}
</style>
