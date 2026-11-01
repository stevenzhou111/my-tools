import { describe, expect, it } from 'vitest'
import { ddToDms, dmsToDd, parseDmsText } from '@/utils/dms'

describe('dms · 十进制 → 度分秒', () => {
  it('基础换算:31.22949 → 31°13′46.164″N', () => {
    const r = ddToDms(31.22949, 'lat')
    expect(r.error).toBe('')
    expect(r.data.deg).toBe(31)
    expect(r.data.min).toBe(13)
    expect(r.data.sec).toBeCloseTo(46.164, 2)
    expect(r.data.text).toBe('31°13′46.164″N')
  })

  it('负值转半球:-121.5(E/W 类型)→ 121°30′00.000″W', () => {
    expect(ddToDms(-121.5, 'lon').data.text).toBe('121°30′00.000″W')
    expect(ddToDms(-33.867, 'lat').data.hemi).toBe('S')
  })

  it('秒进位:59.99999 秒进到分', () => {
    const r = ddToDms(0.0166667, 'lat') // ≈ 0°00′60″ → 0°01′00″
    expect(r.data.min).toBe(1)
    expect(r.data.sec).toBe(0)
  })

  it('限幅:纬度 ±90、经度 ±180', () => {
    expect(ddToDms(90.1, 'lat').error).toBeTruthy()
    expect(ddToDms(180.5, 'lon').error).toBeTruthy()
    expect(ddToDms(90, 'lat').error).toBe('')
    expect(ddToDms(180, 'lon').error).toBe('')
  })
})

describe('dms · 度分秒 → 十进制', () => {
  it('基础换算并按半球取号', () => {
    expect(dmsToDd({ deg: 31, min: 13, sec: 46.164, hemi: 'N' }).data.dd).toBeCloseTo(31.22949, 5)
    expect(dmsToDd({ deg: 121, min: 30, sec: 0, hemi: 'W' }).data.dd).toBe(-121.5)
  })

  it('非法分秒与半球报错', () => {
    expect(dmsToDd({ deg: 10, min: 60, sec: 0, hemi: 'N' }).error).toBeTruthy()
    expect(dmsToDd({ deg: 10, min: 0, sec: -1, hemi: 'N' }).error).toBeTruthy()
    expect(dmsToDd({ deg: 10, hemi: 'X' }).error).toBeTruthy()
    expect(dmsToDd({ deg: 91, hemi: 'N' }).error).toBeTruthy()
    expect(dmsToDd({ deg: 181, hemi: 'E' }).error).toBeTruthy()
  })

  it('往返自检一致', () => {
    const r = dmsToDd({ deg: 31, min: 13, sec: 46.164, hemi: 'N' })
    expect(r.data.roundTrip).toBe('31°13′46.164″N')
  })
})

describe('dms · 自由文本解析', () => {
  it('四种常见写法', () => {
    expect(parseDmsText("31°13'45.2\"N")).toMatchObject({ deg: 31, min: 13, sec: 45.2, hemi: 'N' })
    expect(parseDmsText('31 13 45.2 n')).toMatchObject({ hemi: 'N' })
    expect(parseDmsText('北纬31度13分45秒')).toMatchObject({ deg: 31, min: 13, sec: 45, hemi: 'N' })
    expect(parseDmsText('121.5°E')).toMatchObject({ deg: 121.5, min: 0, sec: 0, hemi: 'E' })
  })

  it('无半球或无数字返回 null', () => {
    expect(parseDmsText('31 13 45')).toBeNull()
    expect(parseDmsText('abc')).toBeNull()
    expect(parseDmsText('')).toBeNull()
  })
})
