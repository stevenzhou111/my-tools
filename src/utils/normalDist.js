/**
 * 正态分布:CDF 与分位数(PPF)。
 * CDF 用 Abramowitz & Stegun 7.1.26 的 erf 近似(误差 < 1.5e-7,展示用足够);
 * PPF 用 Peter Acklam 的有理逼近(相对误差 < 1.15e-9)。
 */

/** 误差函数近似(标准正态:Φ(x) = (1 + erf(x/√2)) / 2) */
function erf(x) {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  // A&S 7.1.26 系数
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax)
  return sign * y
}

/** 标准正态分布函数 Φ(x) */
export function stdCdf(x) {
  return (1 + erf(x / Math.SQRT2)) / 2
}

/** 正态分布 N(μ, σ²) 中 X ≤ x 的概率 */
export function cdf(x, mu = 0, sigma = 1) {
  if (!(sigma > 0)) throw new Error('标准差 σ 必须大于 0')
  return stdCdf((x - mu) / sigma)
}

/** 标准正态分位数:Φ⁻¹(p),Acklam 算法 */
export function stdPpf(p) {
  if (!(p > 0 && p < 1)) throw new Error('概率 p 需在 0 ~ 1 之间(不含端点)')
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pLow = 0.02425
  let x
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= 1 - pLow) {
    const q = p - 0.5
    const r = q * q
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  // 一步 Halley 精化,把误差再压一两个数量级
  const e = stdCdf(x) - p
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2)
  return x - u / (1 + (x * u) / 2)
}

/** N(μ, σ²) 的分位数 */
export function ppf(p, mu = 0, sigma = 1) {
  if (!(sigma > 0)) throw new Error('标准差 σ 必须大于 0')
  return mu + stdPpf(p) * sigma
}

/** z 分数 */
export function zScore(x, mu = 0, sigma = 1) {
  if (!(sigma > 0)) throw new Error('标准差 σ 必须大于 0')
  return (x - mu) / sigma
}
