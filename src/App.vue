<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SideNav from '@/components/SideNav.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import ShortcutsHelp from '@/components/ShortcutsHelp.vue'
import { APP_NAME } from '@/config'
import AppIcon from '@/components/AppIcon.vue'
import { useToast } from '@/utils/toast'
import { useTheme } from '@/utils/theme'

const toast = useToast()
const { theme, toggleTheme } = useTheme()

const route = useRoute()
const drawerOpen = ref(false)
const drawerEl = ref(null)
const paletteRef = ref(null)
const shortcutsOpen = ref(false)

// 路由变化时自动收起移动端抽屉
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

let drawerLastFocused = null
// 抽屉打开时锁定页面滚动、把焦点移入抽屉;关闭时把焦点还给汉堡按钮
watch(drawerOpen, async (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) {
    drawerLastFocused = document.activeElement
    await nextTick()
    drawerEl.value?.querySelector('input, button, a')?.focus()
  } else if (drawerLastFocused?.focus) {
    drawerLastFocused.focus()
    drawerLastFocused = null
  }
})

// 焦点陷阱:Tab 在抽屉内循环,不会穿过遮罩落到底层页面
function trapDrawerTab(e) {
  if (e.key !== 'Tab' || !drawerEl.value) return
  const focusables = [...drawerEl.value.querySelectorAll('input, button, a[href]')]
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') drawerOpen.value = false
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
  // '?' 帮助:仅在非输入场景触发(输入框里打问号是正常文字)
  if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !shortcutsOpen.value) {
    e.preventDefault()
    shortcutsOpen.value = true
  }
  // '/' 聚焦侧栏搜索框;移动端侧栏隐藏,改为打开命令面板
  if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    if (window.matchMedia('(min-width: 901px)').matches) {
      document.querySelector('.side-search')?.focus()
    } else {
      paletteRef.value?.open?.()
    }
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="app">
    <header class="site-header">
      <div class="header-inner">
        <button
          class="hamburger"
          type="button"
          aria-label="打开导航"
          :aria-expanded="drawerOpen"
          aria-controls="mobile-drawer"
          @click="drawerOpen = true"
        ><AppIcon name="menu" :size="20" /></button>
        <router-link to="/" class="logo">
          <span class="logo-icon"><AppIcon name="layout-grid" :size="21" /></span>
          <span class="logo-text">{{ APP_NAME }}</span>
        </router-link>
        <button class="btn btn-sm palette-btn" title="全局搜索(Ctrl+K)" @click="paletteRef?.open()">
          <AppIcon name="search" :size="15" />搜索<span class="palette-kbd-hint">Ctrl+K</span>
        </button>
        <button class="btn btn-sm" @click="toggleTheme">
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="15" />{{ theme === 'dark' ? '浅色' : '深色' }}
        </button>
        <button class="btn btn-sm kbd-help-btn" title="快捷键帮助(?)" aria-label="快捷键帮助" @click="shortcutsOpen = true">
          <AppIcon name="keyboard" :size="15" />
        </button>
      </div>
    </header>

    <div class="layout">
      <aside class="sidebar">
        <SideNav />
      </aside>

      <transition name="fade">
        <div v-if="drawerOpen" class="drawer-mask" @click="drawerOpen = false">
          <aside
            id="mobile-drawer"
            ref="drawerEl"
            class="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            @click.stop
            @keydown="trapDrawerTab"
          >
            <SideNav @navigate="drawerOpen = false" />
          </aside>
        </div>
      </transition>

      <main class="site-main">
        <div class="main-container">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>

    <footer class="site-footer">
      所有工具均在浏览器本地运行 · 数据不会上传服务器
    </footer>

    <CommandPalette ref="paletteRef" @open-help="shortcutsOpen = true" />
    <ShortcutsHelp :open="shortcutsOpen" @close="shortcutsOpen = false" />

    <transition name="toast">
      <div v-if="toast.visible.value" class="toast" role="status" aria-live="polite">
        {{ toast.message.value }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 18px;
  gap: 12px;
}
.hamburger {
  display: none;
  background: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 18px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  color: var(--text);
}
.logo {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  text-decoration: none;
  margin-right: auto;
  letter-spacing: 0.3px;
}
.palette-btn {
  margin-right: 8px;
}
.palette-kbd-hint {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
  margin-left: 6px;
  background: var(--bg-soft);
}
.kbd-help-btn {
  display: grid;
  place-items: center;
  color: var(--muted);
}
@media (max-width: 720px) {
  .kbd-help-btn {
    display: none;
  }
}
@media (max-width: 720px) {
  .palette-kbd-hint {
    display: none;
  }
  .palette-btn {
    font-size: 14px;
  }
}
.logo-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  font-size: 21px;
  background: var(--accent-grad);
  border-radius: 11px;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.4);
  /* 渐变底上的图标必须是白色,否则深色线条会糊在紫色里 */
  color: #fff;
}
.layout {
  display: flex;
  align-items: flex-start;
  flex: 1;
}
.sidebar {
  width: 262px;
  flex-shrink: 0;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  border-right: 1px solid var(--border);
  scrollbar-width: thin;
}
.site-main {
  flex: 1;
  min-width: 0;
  padding: 30px 0 56px;
}
.main-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 28px;
}
.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(15, 17, 28, 0.5);
  backdrop-filter: blur(2px);
}
.drawer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 286px;
  max-width: 86vw;
  background: var(--bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  box-shadow: 8px 0 32px rgba(15, 17, 28, 0.18);
}
.site-footer {
  border-top: 1px solid var(--border);
  padding: 16px 0;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 44px;
  transform: translateX(-50%);
  z-index: 200;
  background: var(--card);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
  border-radius: 10px;
  padding: 10px 18px;
  font-size: 14.5px;
  box-shadow: var(--shadow-lg);
  max-width: min(86vw, 420px);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
  .hamburger {
    display: block;
  }
  .main-container {
    padding: 0 16px;
  }
}
</style>
