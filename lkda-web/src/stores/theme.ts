import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type Theme = 'vital' | 'ocean' | 'strata'

const THEME_KEY = 'lkda-theme'

const THEME_LABELS: Record<Theme, string> = {
  vital:  '活力新知',
  ocean:  '深海蓝晶',
  strata: '岩层暗色',
}

const THEME_ORDER: Theme[] = ['vital', 'ocean', 'strata']

function readSavedTheme(): Theme {
  const raw = localStorage.getItem(THEME_KEY)
  if (raw === 'ocean' || raw === 'vital' || raw === 'strata') return raw
  return 'vital'
}

function applyThemeToDom(theme: Theme) {
  const html = document.documentElement
  if (theme === 'vital') {
    delete html.dataset.theme
  } else {
    html.dataset.theme = theme
  }
  // strata 为暗色主题，叠加 Element Plus 官方暗色变量（html.dark）
  html.classList.toggle('dark', theme === 'strata')
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(readSavedTheme())

  const themeLabel = computed(() => THEME_LABELS[theme.value])
  const isOcean  = computed(() => theme.value === 'ocean')
  const isStrata = computed(() => theme.value === 'strata')

  function setTheme(val: Theme) {
    theme.value = val
    localStorage.setItem(THEME_KEY, val)
    applyThemeToDom(val)
  }

  function toggleTheme() {
    const idx = THEME_ORDER.indexOf(theme.value)
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length])
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
    isStrata,
    setTheme,
    toggleTheme,
  }
})
