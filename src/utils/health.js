/**
 * BMI / BMR / TDEE 健康计算。
 * BMI 分级采用中国标准 WS/T 428-2013(24 为超重切点,与 WHO 的 25 不同);
 * BMR 采用 Mifflin-St Jeor 公式(1990),对当代人群误差最小。
 */

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: '久坐少动', factor: 1.2, note: '办公室工作,几乎不运动' },
  { id: 'light', label: '轻度活动', factor: 1.375, note: '每周运动 1~3 次' },
  { id: 'moderate', label: '中度活动', factor: 1.55, note: '每周运动 3~5 次' },
  { id: 'active', label: '高度活动', factor: 1.725, note: '每周运动 6~7 次' },
  { id: 'athlete', label: '极高强度', factor: 1.9, note: '体力劳动或每天训练' },
]

/** 中国成人 BMI 分级(WS/T 428-2013) */
export const BMI_LEVELS = [
  { max: 18.5, label: '偏瘦', tone: 'info' },
  { max: 24, label: '正常', tone: 'ok' },
  { max: 28, label: '超重', tone: 'warn' },
  { max: Infinity, label: '肥胖', tone: 'danger' },
]

/**
 * 计算健康指标。
 * @param {{sex:'male'|'female', age:number, heightCm:number, weightKg:number}} p
 * @returns {{bmi:number, bmiLevel:string, bmr:number, idealMin:number, idealMax:number, error:string}}
 */
export function healthStats({ sex, age, heightCm, weightKg }) {
  if (!(age >= 1 && age <= 120)) return { error: '请输入 1~120 之间的年龄' }
  if (!(heightCm >= 80 && heightCm <= 250)) return { error: '请输入 80~250 之间的身高(cm)' }
  if (!(weightKg >= 20 && weightKg <= 400)) return { error: '请输入 20~400 之间的体重(kg)' }

  const h = heightCm / 100
  const bmi = weightKg / (h * h)
  const level = BMI_LEVELS.find((l) => bmi < l.max)
  // Mifflin-St Jeor:男 10w + 6.25h − 5a + 5;女同式末项 −161
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161))
  return {
    bmi: +bmi.toFixed(1),
    bmiLevel: level.label,
    bmr,
    idealMin: Math.round(18.5 * h * h),
    idealMax: Math.round(24 * h * h),
    error: '',
  }
}

/** TDEE = 基础代谢 × 活动系数,四舍五入到十位 */
export function tdee(bmr, factor) {
  return Math.round((bmr * factor) / 10) * 10
}
