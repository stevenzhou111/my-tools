/**
 * 正则速查:语法速查 + 常用模式库。
 * 模式库每条都带正反例样本(samples.valid / samples.invalid),
 * 单元测试会逐条跑一遍,保证抄出去的正则真的能用。
 */

/** 语法速查:按组划分 */
export const REGEX_SYNTAX = [
  {
    id: 'char', label: '字符与集合',
    items: [
      { token: '.', desc: '任意单个字符(换行符除外;s 标志可含换行)' },
      { token: '\\d', desc: '数字 0-9,等价 [0-9]' },
      { token: '\\D', desc: '非数字' },
      { token: '\\w', desc: '字母/数字/下划线,等价 [A-Za-z0-9_]' },
      { token: '\\W', desc: '非 \\w' },
      { token: '\\s', desc: '空白:空格、Tab、换行等' },
      { token: '[abc]', desc: '字符集合:命中其中任意一个' },
      { token: '[^abc]', desc: '反向集合:除 a/b/c 外的字符' },
      { token: '[a-z]', desc: '范围:a 到 z' },
    ],
  },
  {
    id: 'quant', label: '量词',
    items: [
      { token: '*', desc: '前一项 0 次或多次(贪婪)' },
      { token: '+', desc: '1 次或多次(贪婪)' },
      { token: '?', desc: '0 次或 1 次;跟在量词后变懒惰(*?、+?)' },
      { token: '{n}', desc: '恰好 n 次' },
      { token: '{n,}', desc: '至少 n 次' },
      { token: '{n,m}', desc: 'n 到 m 次' },
    ],
  },
  {
    id: 'anchor', label: '位置与边界',
    items: [
      { token: '^', desc: '字符串开头(m 标志下为行首)' },
      { token: '$', desc: '字符串结尾(m 标志下为行尾)' },
      { token: '\\b', desc: '单词边界' },
      { token: '\\B', desc: '非单词边界' },
    ],
  },
  {
    id: 'group', label: '分组与引用',
    items: [
      { token: '(abc)', desc: '捕获分组,可用 $1 / \\1 引用' },
      { token: '(?:abc)', desc: '非捕获分组,只分组不编号' },
      { token: '(?<name>abc)', desc: '命名分组,引用写作 $<name>' },
      { token: '\\1', desc: '反向引用第 1 个捕获组' },
      { token: 'a|b', desc: '或:命中 a 或 b(注意用分组限定范围)' },
    ],
  },
  {
    id: 'look', label: '环视断言(不消耗字符)',
    items: [
      { token: '(?=abc)', desc: '正向先行:后面紧跟 abc' },
      { token: '(?!abc)', desc: '负向先行:后面不是 abc' },
      { token: '(?<=abc)', desc: '正向后行:前面是 abc' },
      { token: '(?<!abc)', desc: '负向后行:前面不是 abc' },
    ],
  },
  {
    id: 'flags', label: '标志',
    items: [
      { token: 'g', desc: '全局:找出所有匹配' },
      { token: 'i', desc: '忽略大小写' },
      { token: 'm', desc: '多行:^ $ 匹配每行' },
      { token: 's', desc: 'dotAll:让 . 也能匹配换行' },
      { token: 'u', desc: 'Unicode:正确处理代理对与码点' },
      { token: 'y', desc: '粘性:只从 lastIndex 处匹配' },
    ],
  },
]

/**
 * 常用模式库。samples 里的正反例会被单元测试逐条验证,
 * 新增/修改模式时务必同步样本。
 */
export const REGEX_PATTERNS = [
  {
    id: 'phone-cn', name: '中国大陆手机号', source: '^1[3-9]\\d{9}$', flags: '',
    desc: '11 位,1 开头,第二位 3-9',
    valid: ['13812345678', '19912345678'],
    invalid: ['12345678901', '1381234567', '23812345678'],
  },
  {
    id: 'email', name: '邮箱地址', source: '[\\w.%+-]+@[\\w-]+(?:\\.[\\w-]+)+', flags: 'i',
    desc: '宽松格式校验:本地部分@域名(至少一个点);是否真实存在要发信验证',
    valid: ['a.b-c@example.com', 'user+tag@mail.example.cn'],
    invalid: ['a@b', 'abc@@x.com'],
  },
  {
    id: 'url', name: '网址 URL', source: '^https?://[^\\s/$.?#].[^\\s]*$', flags: 'i',
    desc: 'http/https 开头,域名不含空格',
    valid: ['https://example.com/a?b=1', 'http://a.cn'],
    invalid: ['ftp://example.com', 'https://'],
  },
  {
    id: 'ipv4', name: 'IPv4 地址', source: '^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$', flags: '',
    desc: '每段 0~255,不允许前导零以外的写法混入',
    valid: ['192.168.1.1', '8.8.8.8', '0.0.0.0'],
    invalid: ['256.1.1.1', '1.2.3', '1.2.3.4.5'],
  },
  {
    id: 'date', name: '日期 YYYY-MM-DD', source: '^\\d{4}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\\d|3[01])$', flags: '',
    desc: '格式与月份范围校验(2 月 30 日这类需程序再查)',
    valid: ['2026-11-01', '2026-1-31'],
    invalid: ['2026-13-01', '20261101'],
  },
  {
    id: 'time', name: '时间 HH:mm(:ss)', source: '^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?$', flags: '',
    desc: '24 小时制,秒可选',
    valid: ['23:59', '09:05:30'],
    invalid: ['24:00', '9:5'],
  },
  {
    id: 'hex-color', name: '十六进制颜色', source: '^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$', flags: 'i',
    desc: '#RGB / #RRGGBB / #RRGGBBAA',
    valid: ['#fff', '#6366F1', '#6366F1AA'],
    invalid: ['#12', '#ffGG00'],
  },
  {
    id: 'id-card', name: '18 位身份证(格式)', source: '^\\d{17}[\\dXx]$', flags: '',
    desc: '只验格式;校验位算法请用「身份证号解析」',
    valid: ['11010519491231002X', '110105194912310021'],
    invalid: ['110105194912310', '11010519491231002A'],
  },
  {
    id: 'postcode', name: '邮政编码', source: '^\\d{6}$', flags: '',
    desc: '6 位数字',
    valid: ['100000', '518000'],
    invalid: ['10000', '1000000'],
  },
  {
    id: 'qq', name: 'QQ 号', source: '^[1-9]\\d{4,10}$', flags: '',
    desc: '5~11 位,不以 0 开头',
    valid: ['10001', '123456789'],
    invalid: ['01234', '1234'],
  },
  {
    id: 'strong-pwd', name: '强密码(8 位以上含四类其三)', source: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$', flags: '',
    desc: '至少 8 位,同时含小写、大写、数字(环视断言示例)',
    valid: ['Passw0rd2026', 'Abcdefg1'],
    invalid: ['password', '12345678', 'passw0rd'], // 缺大写
  },
  {
    id: 'cjk', name: '包含中文', source: '[\\u4e00-\\u9fa5]', flags: '',
    desc: '命中任意一个常用汉字(只覆盖基本区)',
    valid: ['工具箱', 'a中b'],
    invalid: ['abc123'],
  },
  {
    id: 'dup-word', name: '重复单词', source: '\\b(\\w+)\\s+\\1\\b', flags: 'i',
    desc: '找出连续重复的单词(反向引用示例)',
    valid: ['the the cat', 'is is fine'],
    invalid: ['the cat'],
  },
  {
    id: 'trim-space', name: '首尾空白', source: '^\\s+|\\s+$', flags: 'g',
    desc: '定位字符串首尾的空白(replace 成空串即 trim)',
    valid: [' x', 'x ', '\tx\t'],
    invalid: ['x'],
  },
]

/** 用样本自检一条模式:返回 {pass, failedSample} */
export function verifyPattern(p) {
  const re = new RegExp(p.source, p.flags)
  for (const s of p.valid) {
    if (!re.test(s)) return { pass: false, failedSample: s, kind: 'valid' }
  }
  for (const s of p.invalid) {
    if (re.test(s)) return { pass: false, failedSample: s, kind: 'invalid' }
  }
  return { pass: true }
}
