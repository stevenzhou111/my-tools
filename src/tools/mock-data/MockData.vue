<script setup>
import { ref } from 'vue'
import { useCopy } from '@/utils/useCopy'

const count = ref(10)
const fields = ref({ name: true, phone: true, email: false, idcard: false, company: false, address: false, uuid: false })
const rows = ref([])
const { copiedKey, copy } = useCopy()

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗郑梁谢宋唐许韩冯邓曹彭曾萧田董潘袁蔡蒋余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('')
const GIVEN = '伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超霞平刚桂英华建华玉兰春梅国鑫浩宇欣怡子轩梓萱一诺博文思远天佑若曦志强建国晓东雨桐嘉懿可馨海燕雪梅'.split('')
const CITIES = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '成都市高新区', '武汉市洪山区', '南京市鼓楼区', '西安市雁塔区', '重庆市渝北区']
const COMPANIES = ['科技有限公司', '网络科技有限公司', '信息技术有限公司', '电子商务有限公司', '智能科技有限公司']
const PREFIX = ['华', '中', '天', '云', '智', '联', '创', '瑞', '宏', '博']
const AREA_CODES = ['110101', '310104', '440305', '440307', '330106', '510107', '420102', '320106', '610113', '500105']

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

function name() {
  return pick(SURNAMES) + (Math.random() < 0.2 ? '' : pick(GIVEN)) + (Math.random() < 0.5 ? pick(GIVEN) : '')
}

function phone() {
  let s = pick(['133', '149', '153', '155', '158', '166', '177', '180', '186', '189', '199', '130', '135', '138', '150', '187', '152', '157'])
  for (let i = 0; i < 8; i++) s += randInt(0, 9)
  return s
}

function email() {
  const domains = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'example.com']
  let user = ''
  for (let i = 0; i < randInt(6, 10); i++) user += String.fromCharCode(randInt(97, 122))
  return `${user}${randInt(10, 99)}@${pick(domains)}`
}

function idcard() {
  // 随机但校验位合法,仅用于系统测试数据
  const base = pick(AREA_CODES) + `${randInt(1960, 2005)}${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(1, 28)).padStart(2, '0')}${String(randInt(1, 999)).padStart(3, '0')}`
  const W = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const MAP = '10X98765432'
  const sum = base.split('').reduce((acc, ch, i) => acc + Number(ch) * W[i], 0)
  return base + MAP[sum % 11]
}

function uuid() {
  return crypto.randomUUID()
}

function address() {
  return pick(CITIES) + pick(['中山路', '人民路', '科技园', '软件园', '创业大道', '幸福小区']) + randInt(1, 999) + '号'
}

const GENERATORS = {
  name: { label: '中文姓名', fn: name },
  phone: { label: '手机号', fn: phone },
  email: { label: '邮箱', fn: email },
  idcard: { label: '身份证号(测试用)', fn: idcard },
  company: { label: '公司名称', fn: () => pick(PREFIX) + pick(PREFIX) + pick(COMPANIES) },
  address: { label: '地址', fn: address },
  uuid: { label: 'UUID', fn: uuid },
}

function generate() {
  const active = Object.keys(fields.value).filter((k) => fields.value[k])
  if (!active.length) {
    rows.value = []
    return
  }
  const n = Math.min(200, Math.max(1, Number(count.value) || 1))
  rows.value = Array.from({ length: n }, () => {
    const row = {}
    for (const k of active) row[GENERATORS[k].label] = GENERATORS[k].fn()
    return row
  })
}

generate()
</script>

<template>
  <div class="row" style="margin-bottom: 14px">
    <label v-for="(g, key) in GENERATORS" :key="key" class="check">
      <input v-model="fields[key]" type="checkbox" @change="generate" />{{ g.label }}
    </label>
    <label class="check">
      数量
      <input v-model.number="count" type="number" min="1" max="200" class="input num-input" @input="generate" />
    </label>
    <button class="btn btn-primary" @click="generate">🎲 重新生成</button>
  </div>

  <div v-if="!rows.length" class="tip">请至少勾选一种字段。</div>

  <template v-else>
    <div class="table-wrap panel">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th v-for="(v, k) in rows[0]" :key="k">{{ k }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td class="idx">{{ i + 1 }}</td>
            <td v-for="(v, k) in row" :key="k"><code>{{ v }}</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="row" style="margin-top: 12px">
      <button class="btn btn-sm" @click="copy('csv', [Object.keys(rows[0]).join(','), ...rows.map((r) => Object.values(r).join(','))].join('\n'))">
        {{ copiedKey === 'csv' ? '✓ 已复制' : '复制 CSV' }}
      </button>
      <button class="btn btn-sm" @click="copy('json', JSON.stringify(rows, null, 2))">
        {{ copiedKey === 'json' ? '✓ 已复制' : '复制 JSON' }}
      </button>
    </div>

    <p class="tip" style="margin-top: 10px">数据完全随机生成(身份证号校验位合法),仅供开发测试填充使用。</p>
  </template>
</template>

<style scoped>
.num-input {
  width: 80px;
  margin: 0 6px;
}
.table-wrap {
  max-height: 480px;
  overflow: auto;
  padding: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th,
td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}
th {
  position: sticky;
  top: 0;
  background: var(--bg-soft);
  font-size: 13px;
  color: var(--muted);
}
.idx {
  color: var(--muted);
}
</style>
