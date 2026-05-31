import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type Theme = 'vital' | 'ocean'

const THEME_KEY = 'lkda-theme'

function readSavedTheme(): Theme {
  const raw = localStorage.getItem(THEME_KEY)
  if (raw === 'ocean' || raw === 'vital') return raw
  return 'vital'
}

function applyThemeToDom(theme: Theme) {
  const html = document.documentElement
  if (theme === 'ocean') {
    html.dataset.theme = 'ocean'
  } else {
    delete html.dataset.theme
  }
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(readSavedTheme())

  const themeLabel = computed(() => (theme.value === 'ocean' ? '深海蓝晶' : '活力新知'))
  const isOcean = computed(() => theme.value === 'ocean')

  function setTheme(val: Theme) {
    theme.value = val
    localStorage.setItem(THEME_KEY, val)
    applyThemeToDom(val)
  }

  function toggleTheme() {
    setTheme(theme.value === 'vital' ? 'ocean' : 'vital')
  }

  // 初始化时立即应用（防止闪屏）
  applyThemeToDom(theme.value)

  // 监听变化（跨标签同步）
  watch(theme, (val) => {
    applyThemeToDom(val)
  })

  return {
    theme,
    themeLabel,
    isOcean,
    setTheme,
    toggleTheme,
  }
})
