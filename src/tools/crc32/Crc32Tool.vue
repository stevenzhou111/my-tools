<script setup>
import { computed, ref } from 'vue'
import CopyButton from '@/components/CopyButton.vue'
import { crc32Hex } from '@/utils/crc32'
import { formatSize } from '@/utils/format'

/**
 * CRC-32 校验:zip/PNG/以太网同款算法。文本直接算,文件流式读取首尾亦可(此处整读)。
 * 本地计算,文件不上传。
 */

const text = ref('')
const fileHex = ref('')
const fileInfo = ref('')
const fileError = ref('')

const textHex = computed(() => (text.value ? crc32Hex(text.value) : ''))
const result = computed(() => fileHex.value || textHex.value)

async function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  fileError.value = ''
  fileHex.value = ''
  fileInfo.value = ''
  try {
    const buf = await f.arrayBuffer()
    fileHex.value = crc32Hex(new Uint8Array(buf))
    fileInfo.value = `${f.name} · ${formatSize(f.size)}`
  } catch (err) {
    fileError.value = '读取文件失败:' + err.message
  }
}
</script>

<template>
  <div class="field">
    <label class="field-label" for="crc-text">文本</label>
    <textarea id="crc-text" v-model="text" class="textarea" rows="3" placeholder="输入任意文本,按 UTF-8 字节计算"></textarea>
    <div v-if="textHex" class="row mt-10">
      <code class="hex">{{ textHex }}</code>
      <CopyButton class="btn btn-sm" :text="textHex" label="复制" />
    </div>
  </div>

  <div class="panel mt-14">
    <p class="field-label">或校验文件(与下载站/网盘给出的 CRC-32 对一遍)</p>
    <label class="btn btn-sm file-btn">
      选择文件
      <input type="file" class="sr-only" @change="onFileChange" />
    </label>
    <p v-if="fileInfo" class="tip m-0 mt-8">{{ fileInfo }} → <code class="hex">{{ fileHex }}</code></p>
    <p v-if="fileError" class="tip m-0 mt-8">✗ {{ fileError }}</p>
  </div>

  <p class="tip mt-12">
    CRC-32 用于完整性比对(传输是否损坏),不是哈希签名,防篡改请用「文件哈希校验」里的 SHA 系列。结果为 8 位十六进制,部分工具展示的是十进制或补零差异,比对时注意口径。
  </p>
</template>

<style scoped>
.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.hex {
  font-family: var(--mono, monospace);
  font-size: 16px;
  letter-spacing: 1px;
  background: var(--bg-soft);
  padding: 4px 10px;
  border-radius: 6px;
}
</style>
