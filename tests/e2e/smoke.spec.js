import { expect, test } from '@playwright/test'

// 收集页面运行期错误:白屏、控制台报错、chunk 加载失败都会在这里冒出来
function watchErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test.describe('首页', () => {
  test('骨架、分类与工具卡片都正常渲染', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')

    await expect(page.locator('.site-header')).toBeVisible()
    await expect(page.locator('.hero-title')).toContainText('我的工具箱')
    await expect(page.locator('.side-nav')).toBeVisible()

    const cards = page.locator('.tool-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(80)

    const catTitles = page.locator('.cat-section .cat-title')
    expect(await catTitles.count()).toBeGreaterThanOrEqual(12)

    expect(errors, `首页有运行期错误:\n${errors.join('\n')}`).toEqual([])
  })

  test('工具图标是 SVG,不再是 emoji 字符', async ({ page }) => {
    await page.goto('/')

    // AppIcon 的根节点就是 svg 本身,class 合并在它身上,所以要断言元素自身
    async function assertIcons(locator, label) {
      const n = Math.min(await locator.count(), 20)
      expect(n, `${label} 一个图标都没找到`).toBeGreaterThan(0)
const bad = await locator.evaluateAll(
        (els, label) =>
          els
            .map((e, i) => {
              if (e.tagName.toLowerCase() !== 'svg') return `${label} #${i} 不是 svg,是 ${e.tagName}`
              if (!e.querySelector('path,circle,rect,line,polyline,polygon,ellipse')) {
                return `${label} #${i} 是空的 svg`
              }
              return null
            })
            .filter(Boolean),
        label,
      )
      expect(bad, bad.join('\n')).toEqual([])
    }

    await assertIcons(page.locator('.tool-card .tool-icon'), '首页卡片图标')
    await assertIcons(page.locator('.side-link .side-tool-icon'), '侧栏图标')
    await assertIcons(page.locator('.cat-section .cat-title .cat-icon'), '分类标题图标')
  })

  test('分类默认折叠,点击后展开', async ({ page }) => {
    await page.goto('/')

    const firstCat = page.locator('.side-cat-head').first()
    await expect(firstCat).toBeVisible()

    // 折叠态下工具列表不可见
    const tools = firstCat.locator('xpath=following-sibling::div[1]')
    await expect(tools).toBeHidden()

    await firstCat.click()
    await expect(tools).toBeVisible()
  })

  test('搜索能过滤出目标工具', async ({ page }) => {
    await page.goto('/')
    await page.locator('.search-input').fill('二维码')
    await expect(page.locator('.tool-card')).not.toHaveCount(0)
    await expect(page.locator('.tool-card').first()).toContainText('二维码')
  })
})

test.describe('工具页', () => {
  // 从首页抓取全部工具链接,测试自动跟随 registry 增减,不会漏掉新工具
  test('每个工具页都能正常挂载', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/')

    const ids = await page.locator('.tool-card').evaluateAll((els) =>
      [...new Set(els.map((e) => e.getAttribute('href')?.replace('/tool/', '')).filter(Boolean))],
    )
    expect(ids.length, '首页没有抓到任何工具链接').toBeGreaterThanOrEqual(80)

    const failed = []
    for (const id of ids) {
      await test.step(`工具 ${id}`, async () => {
        errors.length = 0
        await page.goto(`/tool/${id}`)

        // 异步组件加载失败时会渲染这个错误组件
        await expect(page.locator('.load-error')).toHaveCount(0)

        // 标题与图标
        await expect(page.locator('.tool-head h1')).toBeVisible()
        await expect(page.locator('.tool-head .desc')).not.toBeEmpty()
        await expect(page.locator('.tool-head .icon svg')).toHaveCount(1)

        // 关于说明
        await expect(page.locator('details.about summary')).toBeVisible()

        // 页面标题带上工具名
        await expect(page).toHaveTitle(new RegExp(`·`))

        expect(errors, `工具 ${id} 有运行期错误:\n${errors.join('\n')}`).toEqual([])
      })
      .catch((e) => {
        failed.push(`${id}: ${e.message.split('\n')[0]}`)
      })
    }

    expect(failed, `有 ${failed.length} 个工具页没通过:\n${failed.join('\n')}`).toEqual([])
  })

  test('收藏状态可切换并写入 localStorage', async ({ page }) => {
    await page.goto('/tool/json')
    const favBtn = page.locator('.fav-btn')

    await favBtn.click()
    await expect(favBtn).toContainText('已收藏')

    const stored = await page.evaluate(() => localStorage.getItem('toolbox-favorites'))
    expect(JSON.parse(stored ?? '[]')).toContain('json')
  })

  test('进入工具页会记录到最近使用', async ({ page }) => {
    await page.goto('/tool/base64')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('toolbox-recents')))
      .toContain('base64')
  })

  test('不存在的工具给出友好提示而不是白屏', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tool/__not_a_real_tool__')
    await expect(page.locator('.empty')).toContainText('工具不存在')
    await expect(page.locator('.load-error')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})

test.describe('全局交互', () => {
  test('命令面板:输入算式出现计算条目,回车关闭(结果走剪贴板)', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await page.keyboard.type('12*8+2')
    const calcItem = page.locator('.palette-item', { hasText: '计算' })
    await expect(calcItem.first()).toContainText('98')
    await page.keyboard.press('Enter')
    await expect(page.locator('.palette')).toHaveCount(0)
  })

  test('命令面板:动作项可切换主题', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await page.keyboard.type('主题')
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('工具页底部有同分类推荐', async ({ page }) => {
    await page.goto('/tool/json')
    const related = page.locator('.related')
    await expect(related).toBeVisible()
    await expect(related.locator('.related-item').first()).toContainText('Base64')
    // 点击推荐项能跳转
    await related.locator('.related-item').first().click()
    await expect(page).toHaveURL(/\/tool\/base64/)
  })

  test('? 键打开快捷键帮助,Esc 关闭', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('?')
    const dialog = page.locator('.sc-panel')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Ctrl + K')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('首页随机逛按钮会跳到某个工具页', async ({ page }) => {
    await page.goto('/')
    await page.locator('button', { hasText: '随机逛一个工具' }).click()
    await expect(page).toHaveURL(/\/tool\//)
    await expect(page.locator('.tool-head h1')).toBeVisible()
  })

  test('分类折叠按钮带 aria-expanded 状态', async ({ page }) => {
    await page.goto('/')
    const btn = page.locator('.side-cat-head').first()
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
    await btn.click()
    await expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  test('命令面板:方向键移动时 aria-activedescendant 跟随', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    const input = page.locator('.palette-input')
    await expect(input).toHaveAttribute('aria-activedescendant', 'palette-opt-0')
    await page.keyboard.press('ArrowDown')
    await expect(input).toHaveAttribute('aria-activedescendant', 'palette-opt-1')
    await page.keyboard.press('ArrowUp')
    await expect(input).toHaveAttribute('aria-activedescendant', 'palette-opt-0')
  })

  test('移动抽屉:dialog 语义、焦点移入并在关闭后归还汉堡按钮', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 })
    await page.goto('/')

    const burger = page.locator('.hamburger')
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await burger.click()

    const drawer = page.locator('.drawer')
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
    await expect(burger).toHaveAttribute('aria-expanded', 'true')

    // 焦点应已移入抽屉
    const focusInDrawer = await page.evaluate(
      () => !!document.activeElement?.closest?.('.drawer'),
    )
    expect(focusInDrawer).toBe(true)

    // Esc 关闭后焦点归还汉堡按钮
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    const focusOnBurger = await page.evaluate(
      () => document.activeElement?.classList?.contains('hamburger'),
    )
    expect(focusOnBurger).toBe(true)
  })

  test('画板类 canvas 带可读标签', async ({ page }) => {
    await page.goto('/tool/drawing-pad')
    await expect(page.locator('canvas.pad')).toHaveAttribute('aria-label', /画板/)
  })

  test('URL 状态:query 初始化输入,输入后写回地址栏', async ({ page }) => {
    // 读:query 里的颜色要进输入框
    await page.goto('/tool/color?q=%232233ff')
    await expect(page.locator('.tool-head h1')).toHaveText('颜色转换')
    await expect(page.locator('.field input').first()).toHaveValue('#2233ff', { timeout: 10000 })

    // 写:子网计算器输入后地址栏出现参数(vue-router 对 query 中的 / 不编码)
    await page.goto('/tool/subnet-calc')
    await expect(page.locator('.tool-head h1')).toBeVisible()
    await page.locator('.field input').first().fill('10.0.0.0/8')
    await expect(page).toHaveURL(/q=10\.0\.0\.0(\/|%2F)8/, { timeout: 10000 })

    // 分享按钮只在有参数时出现
    await expect(page.locator('.fav-btn').locator('xpath=preceding-sibling::button')).toContainText('分享状态')
    await page.goto('/tool/subnet-calc')
    await expect(page.locator('.tool-head button', { hasText: '分享状态' })).toHaveCount(0)
  })

  test('URL 状态:正则的 pattern 与 flags 都可分享', async ({ page }) => {
    await page.goto('/tool/regex?re=%5E%5Cd%2B%24&f=gi')
    await expect(page.locator('.pattern-input')).toHaveValue('^\\d+$')
    await expect(page.locator('.check input[value="i"]')).toBeChecked()
    await expect(page.locator('.check input[value="g"]')).toBeChecked()
  })

  test('Ctrl+K 打开命令面板并可跳转到工具', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')

    const palette = page.locator('.palette')
    await expect(palette).toBeVisible()

    await page.keyboard.type('时间戳')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/tool\/timestamp/)
    await expect(page.locator('.tool-head h1')).toContainText('时间戳')
  })

  test('Esc 关闭命令面板', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Control+k')
    await expect(page.locator('.palette')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.palette')).toHaveCount(0)
  })

  test('主题切换写入 localStorage', async ({ page }) => {
    await page.goto('/')
    await page.locator('.header-inner button', { hasText: '深色' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('toolbox-theme'))).toBe('dark')
  })

  test('未知路由显示 404', async ({ page }) => {
    await page.goto('/this/does/not/exist')
    await expect(page.locator('body')).toContainText('页面走丢了')
    await expect(page.locator('.site-header')).toBeVisible()
  })

  test('软件推荐页渲染出全部条目', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/tool/software-recommend')

    const cards = page.locator('.soft-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(100)

    // 每张卡片都应该有可点击的官网链接
    await expect(cards.first().locator('a[href^="https://"]')).toHaveCount(1)

    expect(errors, `软件推荐页有运行期错误:\n${errors.join('\n')}`).toEqual([])
  })

  test('移动端抽屉可打开并跳转', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 })
    await page.goto('/')

    const hamburger = page.locator('.hamburger')
    await expect(hamburger).toBeVisible()
    await hamburger.click()
    await expect(page.locator('.drawer .side-nav')).toBeVisible()

    await page.locator('.drawer .side-link').first().click()
    await expect(page.locator('.drawer')).toHaveCount(0)
  })
})