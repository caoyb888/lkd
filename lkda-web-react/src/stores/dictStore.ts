import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DictApi } from '@/api/system/dict'
import type { DictItemVO } from '@/types/vo'

interface DictState {
  dictMap: Record<string, DictItemVO[]>
  loaded: boolean
  loadAll: () => Promise<void>
  getItems: (code: string) => DictItemVO[]
  getLabel: (code: string, value: string) => string
  getLabels: (code: string, values: string[]) => string
  reset: () => void
}

export const useDictStore = create<DictState>()(
  persist(
    (set, get) => ({
      dictMap: {},
      loaded: false,

      loadAll: async () => {
        try {
          const data = await DictApi.allMap()
          set({ dictMap: data, loaded: true })
        } catch {
          // 静默失败，避免阻塞登录流程
          set({ loaded: true })
        }
      },

      getItems: (code) =>
        get().dictMap[code]?.filter((i) => i.status === 1).sort((a, b) => a.sortOrder - b.sortOrder) ?? [],

      getLabel: (code, value) =>
        get().dictMap[code]?.find((i) => i.itemValue === value)?.itemLabel ?? value,

      getLabels: (code, values) =>
        values
          .map((v) => get().getLabel(code, v))
          .filter(Boolean)
          .join('、'),

      reset: () => set({ dictMap: {}, loaded: false }),
    }),
    {
      name: 'lkda_dict',
      partialize: (state) => ({
        dictMap: state.dictMap,
        loaded: state.loaded,
      }),
    }
  )
)
