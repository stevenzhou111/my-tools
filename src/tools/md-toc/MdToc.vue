<script setup>
import { computed, ref } from 'vue'
import { buildToc } from '@/utils/toc'
import { useCopy } from '@/utils/useCopy'
import { useUrlState } from '@/utils/urlState'

const md = ref(`# 我的项目

一个纯前端的工具箱。

## 安装

先装依赖再启动。

### 依赖说明

Node 18+。

#### 子依赖

按需安装。

## 使用

见示例。`)

const minLevel = ref(2)
const maxLevel = ref(4)
const ordered = ref(false)

const flag = (key, refVal) => ({ key, ref: refVal, parse: (s) => (s === '1' ? true : s === '0' ? false : undefined) })
useUrlState([
  { key: 'lo', ref: minLevel, parse: (s) => ([1, 2, 3, 4, 5, 6].includes(Number(s)) ? Number(s) : undefined) },
  { key: 'hi', ref: maxLevel, parse: (s) => ([1, 2, 3, 4, 5, 6].includes(Number(s)) ? Number(s) : undefined) },
  flag('o', ordered),
])

const { copiedKey, copy } = useCopy()

const toc = computed(() => buildToc(md.value, { minLevel: minLevel.value, maxLevel: maxLevel.value, ordered: ordered.value }))
const LEVELS = [1, 2, 3, 4, 5, 6]
</script>

<template>
  <div class="grid-2" style="margin-bottom: 14px; align-items: start">
    <div class="field" style="margin: 0">
      <label class="field-label" for="toc-in">Markdown 原文</label>
      <textarea id="toc-in" v-model="md" v-draft="'md-toc-input'" class="textarea" style="min-height: 320px" spellcheck="false"></textarea>
    </div>
    <div class="field" style="margin: 0">
      <label class="field-label" for="toc-out">
        目录
        <span v-if="md" class="tip">{{ toc ? '锚点为 GitHub 风格' : '没有提取到标题' }}</span>
      </label>
      <textarea id="toc-out" class="textarea" style="min-height: 320px" readonly :value="toc" placeholder="目录实时生成…"></textarea>
    </div>
  </div>

  <div class="panel" style="margin-bottom: 16px">
    <div class="row">
      <label class="ctrl">
        <span class="field-label" style="margin: 0">最小层级</span>
        <select v-model.number="minLevel" class="select level-select">
          <option v-for="l in LEVELS" :key="'lo' + l" :value="l">H{{ l }}</option>
        </select>
      </label>
      <label class="ctrl">
        <span class="field-label" style="margin: 0">最大层级</span>
        <select v-model.number="maxLevel" class="select level-select">
          <option v-for="l in LEVELS" :key="'hi' + l" :value="l">H{{ l }}</option>
        </select>
      </label>
      <label class="check" style="align-self: flex-end"><input v-model="ordered" type="checkbox" />有序列表</label>
    </div>
    <div class="row" style="margin-top: 12px">
      <button class="btn btn-sm btn-primary" :disabled="!toc" @click="copy('toc', toc)">
        {{ copiedKey === 'toc' ? '✓ 已复制' : '复制目录' }}
      </button>
      <span v-if="minLevel > maxLevel" class="tip" style="color: var(--danger)">最小层级大于最大层级,已按空区间处理</span>
    </div>
  </div>

  <details class="panel">
    <summary>📖 锚点规则</summary>
    <p class="tip">
      锚点与 GitHub 一致:小写化、剔除字母/数字/汉字/空格/连字符/下划线以外的字符、空格转
      <code>-</code>(连续连字符不合并)。代码块内的 # 行不会当作标题。粘贴到
      README / 博客正文顶部,链接即可在 GitHub、语雀等支持锚点的平台跳转。
      选项会同步到地址栏,点标题栏「分享状态」或直接复制链接即可分享当前配置。
    </p>
  </details>
</template>

<style scoped>
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.level-select {
  width: 100px;
}
</style>
