import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'ocean'

interface ThemeState {
  theme: Theme
  themeLabel: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const themeLabelMap: Record<Theme, string> = {
  light: '明亮',
  dark: '暗黑',
  ocean: '海洋',
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark', 'ocean')
  root.classList.add(theme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      themeLabel: '明亮',
      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme, themeLabel: themeLabelMap[theme] })
      },
      toggleTheme: () => {
        const themes: Theme[] = ['light', 'dark', 'ocean']
        const idx = themes.indexOf(get().theme)
        const next = themes[(idx + 1) % themes.length]
        get().setTheme(next)
      },
    }),
    {
      name: 'lkda_theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme)
        }
      },
    }
  )
)
