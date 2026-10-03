/**
 * IPv4 子网计算:CIDR 或 点分掩码 → 网络地址、广播地址、可用主机范围等。
 * 全程用无符号右移规避 JS 位运算的 32 位有符号问题。
 */

function ipToInt(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    // 前导零(如 010)会让人误以为八进制,直接拒绝
    if (p.length > 1 && p[0] === '0') return null
    n = n * 256 + v
  }
  return n
}

function intToIp(n) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
}

const PRIVATE_RANGES = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['100.64.0.0', 10], // CGNAT
]

function maskOf(prefix) {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

function isPrivate(ip) {
  const n = ipToInt(ip)
  for (const [base, prefix] of PRIVATE_RANGES) {
    const m = maskOf(prefix)
    if (((n >>> 0) & m) === ((ipToInt(base) >>> 0) & m)) return true
  }
  return false
}

/**
 * @param {string} input 如 "192.168.1.10/24" 或 "10.0.0.0 255.255.0.0"
 */
export function calcSubnet(input) {
  const s = String(input ?? '').trim().replace(/\s+/, ' ')
  if (!s) return { error: '' }
  const [ipPart, maskPart] = s.split(/[\s/]+/)

  const ip = ipToInt(ipPart ?? '')
  if (ip === null) return { error: 'IP 地址不合法(应为 4 段 0~255,不允许前导零)' }

  let prefix
  if (maskPart == null || maskPart === '') {
    return { error: '请提供前缀长度(如 192.168.1.0/24)或子网掩码(如 255.255.255.0)' }
  }
  if (/^\d{1,2}$/.test(maskPart)) {
    prefix = Number(maskPart)
    if (prefix > 32) return { error: '前缀长度不能超过 32' }
  } else {
    const m = ipToInt(maskPart)
    if (m === null) return { error: '子网掩码不合法' }
    // 掩码必须连续:取反后 +1 应为 2 的幂
    const inv = (~m >>> 0) + 1
    if ((inv & (inv - 1)) !== 0) return { error: '子网掩码不连续(如 255.255.0.255 是非法掩码)' }
    prefix = 32 - Math.log2(inv)
  }

  const mask = maskOf(prefix)
  const network = (ip & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)

  // /31、/32 没有传统意义上的"可用主机区间"(RFC 3021 点对点 / 单机)
  const usable = prefix >= 31 ? 0 : total - 2
  const firstHost = prefix >= 31 ? network : network + 1
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1

  return {
    error: '',
    ip: intToIp(ip),
    prefix,
    mask: intToIp(mask),
    wildcard: intToIp(~mask >>> 0),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    total,
    usable,
    isPrivate: isPrivate(intToIp(ip)),
  }
}