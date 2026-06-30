import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 灵动智档 双色方案 (STRATA dual scheme)
 *  - 'dark'  岩层 / 玄武岩 (basalt)   — 默认主题
 *  - 'light' 本色 / 石灰岩 (limestone) — 第二方案
 *
 * 主题切换仅在 <html> 上设置 data-theme，所有 token 通过 CSS 变量级联，
 * 见 src/index.css 的 :root / :root[data-theme='light'] 两个块。
 */
export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  themeLabel: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const themeLabelMap: Record<Theme, string> = {
  dark: '岩层',
  light: '本色',
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      themeLabel: themeLabelMap.dark,
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme, themeLabel: themeLabelMap[theme] })
      },
      toggleTheme: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
      },
    }),
    {
      name: 'lkda_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
