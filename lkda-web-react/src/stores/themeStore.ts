import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'ocean'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.remove('light', 'dark', 'ocean')
        document.documentElement.classList.add(theme)
      },
      toggleTheme: () => {
        const themes: Theme[] = ['light', 'dark', 'ocean']
        const idx = themes.indexOf(get().theme)
        const next = themes[(idx + 1) % themes.length]
        get().setTheme(next)
      },
    }),
    { name: 'lkda_theme' }
  )
)
