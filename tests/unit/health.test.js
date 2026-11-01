import { describe, expect, it } from 'vitest'
import { healthStats, tdee, ACTIVITY_LEVELS } from '@/utils/health'

describe('health · BMI', () => {
  it('标准体型:BMI = 体重 / 身高²', () => {
    // 170cm / 65kg → 22.49 → 22.5
    expect(healthStats({ sex: 'male', age: 28, heightCm: 170, weightKg: 65 }).bmi).toBe(22.5)
  })

  it('分级按中国标准(24 超重、28 肥胖)', () => {
    const base = { sex: 'male', age: 30, heightCm: 170 }
    expect(healthStats({ ...base, weightKg: 53 }).bmiLevel).toBe('偏瘦') // 18.3
    expect(healthStats({ ...base, weightKg: 65 }).bmiLevel).toBe('正常') // 22.5
    expect(healthStats({ ...base, weightKg: 70 }).bmiLevel).toBe('超重') // 24.2
    expect(healthStats({ ...base, weightKg: 82 }).bmiLevel).toBe('肥胖') // 28.4
  })

  it('理想体重区间按 18.5 ~ 24 推算', () => {
    const r = healthStats({ sex: 'female', age: 30, heightCm: 160, weightKg: 50 })
    expect(r.idealMin).toBe(47) // 18.5 × 1.6² = 47.36 → 47
    expect(r.idealMax).toBe(61) // 24 × 1.6² = 61.44 → 61
  })
})

describe('health · BMR(Mifflin-St Jeor)', () => {
  it('男性:10w + 6.25h − 5a + 5(取整)', () => {
    const r = healthStats({ sex: 'male', age: 28, heightCm: 170, weightKg: 65 })
    expect(r.bmr).toBe(Math.round(10 * 65 + 6.25 * 170 - 5 * 28 + 5)) // 1577.5 → 1578
  })

  it('女性:常数项 −161(取整)', () => {
    const r = healthStats({ sex: 'female', age: 28, heightCm: 170, weightKg: 65 })
    expect(r.bmr).toBe(Math.round(10 * 65 + 6.25 * 170 - 5 * 28 - 161)) // 1411.5 → 1412
  })
})

describe('health · TDEE', () => {
  it('BMR × 活动系数,四舍五入到十位', () => {
    expect(tdee(1500, 1.2)).toBe(1800)
    expect(tdee(1555, 1.375)).toBe(2140) // 2138.125 → 2140
    expect(tdee(1555, 1.375) % 10).toBe(0)
  })

  it('五档活动系数齐全且递增', () => {
    expect(ACTIVITY_LEVELS).toHaveLength(5)
    for (let i = 1; i < ACTIVITY_LEVELS.length; i++) {
      expect(ACTIVITY_LEVELS[i].factor).toBeGreaterThan(ACTIVITY_LEVELS[i - 1].factor)
    }
  })
})

describe('health · 入参校验', () => {
  it('越界返回 error 且不算数', () => {
    expect(healthStats({ sex: 'male', age: 0, heightCm: 170, weightKg: 65 }).error).toBeTruthy()
    expect(healthStats({ sex: 'male', age: 30, heightCm: 60, weightKg: 65 }).error).toBeTruthy()
    expect(healthStats({ sex: 'male', age: 30, heightCm: 170, weightKg: 10 }).error).toBeTruthy()
    expect(healthStats({ sex: 'male', age: 30, heightCm: 170, weightKg: 65 }).error).toBe('')
  })
})
