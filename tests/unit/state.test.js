import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vDraft, clearAllDrafts } from '@/utils/draft'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

function withInput(props) {
  return mount(
    {
      template: '<input v-draft="draftKey" />',
      props: { draftKey: { type: String, default: '' } },
    },
    { props, global: { directives: { draft: vDraft } } },
  )
}

describe('vDraft 指令', () => {
  it('输入防抖后写入 sessionStorage', async () => {
    vi.useFakeTimers()
    const w = withInput({ draftKey: 'json-input' })
    const el = w.find('input').element

    el.value = '草稿内容'
    el.dispatchEvent(new Event('input'))
    vi.advanceTimersByTime(299)
    expect(sessionStorage.getItem('toolbox-draft:json-input')).toBeNull()

    vi.advanceTimersByTime(1)
    expect(sessionStorage.getItem('toolbox-draft:json-input')).toBe('草稿内容')
    vi.useRealTimers()
  })

  it('只保留最后一次输入', async () => {
    vi.useFakeTimers()
    const w = withInput({ draftKey: 'k' })
    const el = w.find('input').element

    el.value = '第一版'
    el.dispatchEvent(new Event('input'))
    el.value = '最终版'
    el.dispatchEvent(new Event('input'))
    vi.advanceTimersByTime(300)

    expect(sessionStorage.getItem('toolbox-draft:k')).toBe('最终版')
    vi.useRealTimers()
  })

  it('重新挂载时恢复草稿并派发 input 事件让 v-model 同步', () => {
    sessionStorage.setItem('toolbox-draft:restore-me', '上次的输入')
    const w = withInput({ draftKey: 'restore-me' })
    const el = w.find('input').element

    expect(el.value).toBe('上次的输入')
    expect(w.vm.$el.value).toBe('上次的输入')
  })

  it('草稿与当前值一致时不重复派发事件', () => {
    const el = document.createElement('input')
    el.value = '相同'
    sessionStorage.setItem('toolbox-draft:same', '相同')
    let fired = 0
    el.addEventListener('input', () => fired++)
    vDraft.mounted(el, { value: 'same' })
    expect(fired).toBe(0)
  })

  it('未传 key 时不做任何事', () => {
    const w = withInput({ draftKey: '' })
    const el = w.find('input').element
    el.value = 'x'
    el.dispatchEvent(new Event('input'))
    expect(sessionStorage.length).toBe(0)
  })

  it('卸载后不再写入,并清理挂载期留下的监听与定时器', () => {
    vi.useFakeTimers()
    const w = withInput({ draftKey: 'gone' })
    const el = w.find('input').element
    w.unmount()

    expect(el._draftInput).toBeUndefined()
    expect(el._draftTimer).toBeUndefined()

    el.value = '卸载后输入'
    el.dispatchEvent(new Event('input'))
    vi.advanceTimersByTime(1000)
    expect(sessionStorage.getItem('toolbox-draft:gone')).toBeNull()
    vi.useRealTimers()
  })

  it('sessionStorage 不可用时静默降级,不抛错', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: 存储被禁用')
      },
    })
    try {
      expect(() => withInput({ draftKey: 'blocked' })).not.toThrow()
      expect(() => clearAllDrafts()).not.toThrow()
    } finally {
      Object.defineProperty(window, 'sessionStorage', original)
    }
  })
})

describe('clearAllDrafts', () => {
  it('只清理草稿前缀的键,不影响其他会话数据', () => {
    sessionStorage.setItem('toolbox-draft:a', '1')
    sessionStorage.setItem('toolbox-draft:b', '2')
    sessionStorage.setItem('unrelated', '保留我')
    clearAllDrafts()
    expect(sessionStorage.getItem('toolbox-draft:a')).toBeNull()
    expect(sessionStorage.getItem('toolbox-draft:b')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('保留我')
  })
})