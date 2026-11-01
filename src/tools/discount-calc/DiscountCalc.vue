<script setup>
import { computed, ref } from 'vue'
import { stackedDiscount, normalizeTiers, manjianPlan } from '@/utils/discount'
import { useUrlState } from '@/utils/urlState'

const mode = ref('discount') // discount | manjian

// --- 折扣模式 ---
const price = ref(199)
const d1 = ref(8.5)
const d2 = ref(null) // 第二重折扣,空 = 不启用

// --- 满减模式 ---
const cart = ref(168)
const tierText = ref('满 200 减 30\n满 400 减 70')

const num = (lo, hi) => (s) => {
  const v = Number(s)
  return Number.isFinite(v) && v >= lo && v <= hi ? v : undefined
}
useUrlState([
  { key: 'm', ref: mode, parse: (v) => (['discount', 'manjian'].includes(v) ? v : undefined) },
  { key: 'p', ref: price, parse: num(0.01, 100000000) },
  { key: 'd1', ref: d1, parse: num(0.01, 10) },
  { key: 'd2', ref: d2, parse: num(0.01, 10) },
  { key: 'c', ref: cart, parse: num(0, 100000000) },
  { key: 't', ref: tierText, parse: (s) => (s.length <= 300 ? s : undefined) },
])

const discountResult = computed(() => {
  try {
    const ds = [d1.value, d2.value].filter((d) => d != null)
    return { error: '', data: stackedDiscount(price.value, ds) }
  } catch (e) {
    return { error: e.message, data: null }
  }
})

// 「满 X 减 Y」/「X-Y」/「X,Y」混合格式逐行解析
function parseTierLines(text) {
  const tiers = []
  const push = (min, off) => {
    const m = Number(String(min).replace(/,/g, ''))
    const o = Number(String(off).replace(/,/g, ''))
    if (Number.isFinite(m) && Number.isFinite(o) && m > 0 && o > 0) tiers.push({ min: m, off: o })
  }
  for (const line of text.split('\n')) {
    const cn = line.match(/满\s*([\d.,]+)\s*减\s*([\d.,]+)/)
    if (cn) {
      push(cn[1], cn[2])
      continue
    }
    const compact = line.replace(/\s/g, '').match(/^([\d.,]+?)[-–—](\d[\d.,]*)$/)
    if (compact) push(compact[1], compact[2])
  }
  return normalizeTiers(tiers)
}

const tiers = computed(() => parseTierLines(tierText.value))
const tiersInvalid = computed(() => tiers.value.length === 0)

const manjianResult = computed(() => {
  if (tiersInvalid.value) return null
  try {
    return manjianPlan(cart.value, tiers.value)
  } catch {
    return null
  }
})

const fmt = (n) => `¥${(+n.toFixed(2)).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
</script>

<template>
  <div class="panel mb-16">
    <div class="row gap-8" role="radiogroup" aria-label="计算模式">
      <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'discount' }" role="radio" :aria-checked="mode === 'discount'" @click="mode = 'discount'">
        折扣计算
      </button>
      <button class="btn btn-sm" :class="{ 'btn-primary': mode === 'manjian' }" role="radio" :aria-checked="mode === 'manjian'" @click="mode = 'manjian'">
        满减凑单
      </button>
    </div>
  </div>

  <!-- 折扣模式 -->
  <template v-if="mode === 'discount'">
    <div class="panel mb-16">
      <div class="form-row">
        <label class="ctrl">
          <span class="field-label m-0">原价(元)</span>
          <input v-model.number="price" class="input num-input" type="number" min="0.01" step="0.01" />
        </label>
        <label class="ctrl">
          <span class="field-label m-0">折扣(8.5 = 85 折)</span>
          <input v-model.number="d1" class="input num-input" type="number" min="0.01" max="10" step="0.1" />
        </label>
        <label class="ctrl">
          <span class="field-label m-0">第二重折扣(可选)</span>
          <input v-model.number="d2" class="input num-input" type="number" min="0.01" max="10" step="0.1" placeholder="折上折再填" />
        </label>
      </div>
      <div class="row quick-row">
        <span class="tip">快捷:</span>
        <button class="btn btn-sm" @click="d1 = 9">9 折</button>
        <button class="btn btn-sm" @click="d1 = 8.5">85 折</button>
        <button class="btn btn-sm" @click="d1 = 8">8 折</button>
        <button class="btn btn-sm" @click="d1 = 5">5 折</button>
        <button class="btn btn-sm" @click="d2 = d2 == null ? 9.5 : null">{{ d2 == null ? '加一重折扣' : '去掉第二重' }}</button>
      </div>
    </div>

    <div v-if="discountResult.error" class="error-box mb-14">✗ {{ discountResult.error }}</div>
    <div v-else-if="discountResult.data" class="stat-grid">
      <div class="panel stat-card">
        <div class="stat-value">{{ fmt(discountResult.data.final) }}</div>
        <div class="stat-label">到手价</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value saved">{{ fmt(discountResult.data.saved) }}</div>
        <div class="stat-label">共省</div>
      </div>
      <div class="panel stat-card">
        <div class="stat-value">{{ (discountResult.data.rate * 100).toFixed(1) }}%</div>
        <div class="stat-label">实际折扣率(约 {{ (discountResult.data.rate * 10).toFixed(2) }} 折)</div>
      </div>
    </div>
    <div class="panel mt-16">
      <p class="tip m-0">折上折按两重连乘:如「85 折再 95 折」= 原价 × 0.85 × 0.95,实际是 8.075 折,不是 8 折。</p>
    </div>
  </template>

  <!-- 满减模式 -->
  <template v-else>
    <div class="panel mb-16">
      <div class="form-row">
        <label class="ctrl">
          <span class="field-label m-0">当前购物车金额(元)</span>
          <input v-model.number="cart" class="input num-input" type="number" min="0" step="0.01" />
        </label>
        <label class="ctrl grow">
          <span class="field-label m-0">满减规则(每行一档,如「满 200 减 30」)</span>
          <textarea v-model="tierText" rows="3" class="textarea mono" spellcheck="false"></textarea>
        </label>
      </div>
    </div>

    <div v-if="tiersInvalid" class="error-box mb-14">✗ 没有解析到有效的满减档位,请按「满 200 减 30」或「200-30」每行一档填写</div>

    <template v-else-if="manjianResult">
      <div class="stat-grid two">
        <div class="panel stat-card">
          <div class="stat-value saved">{{ fmt(manjianResult.save) }}</div>
          <div class="stat-label">当前档可省</div>
          <div v-if="manjianResult.tier" class="stat-tag tone-ok">已满足 {{ fmt(manjianResult.tier.min) }} 减 {{ fmt(manjianResult.tier.off) }}</div>
          <div v-else class="stat-tag tone-warn">未达最低门槛 {{ fmt(tiers[0].min) }}</div>
        </div>
        <div class="panel stat-card">
          <div class="stat-value">{{ fmt(Math.max(0, cart - manjianResult.save)) }}</div>
          <div class="stat-label">当前实付(未含凑单)</div>
        </div>
      </div>

      <div v-if="manjianResult.next" class="panel mt-16 suggestion" :class="{ worth: manjianResult.worth }">
        <template v-if="manjianResult.gap > 0">
          <p class="m-0">
            再买 <b class="gap-num">{{ fmt(manjianResult.gap) }}</b> 可凑到
            「满 {{ fmt(manjianResult.next.min) }} 减 {{ fmt(manjianResult.next.off) }}」档
            <template v-if="manjianResult.worth">
              —— <b>值得凑</b>:多花 {{ fmt(manjianResult.gap) }} 垫付,多省 {{ fmt(manjianResult.next.off - manjianResult.save) }},净赚 {{ fmt(manjianResult.addWorth) }}。
            </template>
            <template v-else>
              —— <b>不值得</b>:为了多省 {{ fmt(manjianResult.next.off - manjianResult.save) }} 要多花 {{ fmt(manjianResult.gap) }} 垫付(净亏 {{ fmt(-manjianResult.addWorth) }}),除非本来就想要这件。
            </template>
          </p>
          <p v-if="manjianResult.worth" class="tip m-0 mt-8">
            凑单后实付约 {{ fmt(cart + manjianResult.gap - manjianResult.next.off) }},比不凑单省 {{ fmt(manjianResult.addWorth) }}。
          </p>
        </template>
      </div>

      <div class="panel mt-16">
        <p class="tip m-0">
          凑单建议只看金额收支:值得凑指「省的 > 垫付的」;凑来的商品若用不上,净收益仍以实际需要为准。
          平台满减通常按实付金额累计,叠加店铺券与红包后门槛判定可能不同,请以结算页为准。
        </p>
      </div>
    </template>
  </template>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-start;
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grow {
  flex: 1;
  min-width: 240px;
}
.num-input {
  width: 150px;
  font-family: var(--mono);
}
.mono {
  font-family: var(--mono);
  font-size: 14px;
}
.quick-row {
  margin-top: 12px;
  gap: 6px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat-grid.two {
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 720px) {
  .stat-grid,
  .stat-grid.two {
    grid-template-columns: 1fr;
  }
}
.stat-card {
  text-align: center;
  padding: 18px 14px;
}
.stat-value {
  font-family: var(--mono);
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}
.stat-value.saved {
  color: var(--success);
}
.stat-label {
  margin-top: 4px;
  font-size: 14px;
  color: var(--muted);
}
.stat-tag {
  margin-top: 8px;
  display: inline-block;
  font-size: 12.5px;
  padding: 2px 10px;
  border-radius: 999px;
}
.tone-ok { background: rgba(21, 128, 61, 0.12); color: var(--success); }
.tone-warn { background: rgba(180, 83, 9, 0.12); color: var(--warning); }
.suggestion {
  border-color: var(--border);
  font-size: 15px;
  line-height: 1.8;
}
.suggestion.worth {
  border-color: color-mix(in srgb, var(--success) 45%, var(--border));
}
.gap-num {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 17px;
}
</style>
