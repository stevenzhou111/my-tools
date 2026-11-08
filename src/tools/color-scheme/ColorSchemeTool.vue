<script setup>
import { computed, ref } from 'vue'
import { useCopy } from '@/utils/useCopy'
import { colorScheme } from '@/utils/colorScheme'

/**
 * 配色方案:从一个基色按色相环推导互补/邻近/三角/分裂互补/四角五类和谐配色。
 * 复用 colorScale 的 hex↔hsl;纯计算,点击色块复制。
 */

const base = ref('#6366f1')
const { copiedKey, copy } = useCopy()

const result = computed(() => {
  try {
    return colorScheme(base.value.trim())
  } catch {
    return null
  }
})

function copyColor(hex) {
  copy(hex, hex)
}
</script>

<template>
  <div class="panel mb-16">
    <div class="row ctrl-row">
      <label class="ctrl">
        <span class="field-label">基色</span>
        <input v-model="base" class="input" style="width: 130px" spellcheck="false" placeholder="#6366f1" />
      </label>
      <input v-model="base" type="color" class="color-input" aria-label="选取基色" />
      <span v-if="result" class="tip">HSL 坐标只转色相,保持基色的饱和度与明度</span>
    </div>
    <p v-if="!result && base.trim()" class="tip m-0 mt-8">✗ 请输入合法的十六进制颜色(如 #6366f1)</p>
  </div>

  <template v-if="result">
    <div v-for="s in result.schemes" :key="s.id" class="panel mb-16">
      <p class="field-label">{{ s.label }}({{ s.colors.length }} 色)</p>
      <div class="row swatch-row">
        <button
          v-for="(c, i) in s.colors"
          :key="s.id + i"
          type="button"
          class="swatch"
          :title="`点击复制 ${c}`"
          @click="copyColor(c)"
        >
          <span class="chip" :style="{ background: c }"></span>
          <span class="hex">{{ copiedKey === c ? '✓ 已复制' : c }}</span>
        </button>
      </div>
    </div>

    <p class="tip">
      第一个色块始终是基色本身;互补/三角等方案适合点缀与强调,实际排版还需结合明度层次(可用「色阶生成」细调)与对比度检查。
    </p>
  </template>
</template>

<style scoped>
.ctrl-row {
  align-items: center;
}
.color-input {
  width: 52px;
  height: 42px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
}
.swatch-row {
  flex-wrap: wrap;
  gap: 14px;
}
.swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}
.chip {
  display: block;
  width: 74px;
  height: 52px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
.hex {
  font-size: 12.5px;
  color: var(--muted);
  font-family: var(--mono, monospace);
}
</style>
