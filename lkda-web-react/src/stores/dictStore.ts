import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DictItemVO {
  itemValue: string
  itemLabel: string
  sortOrder: number
  status: number
}

interface DictState {
  dictMap: Record<string, DictItemVO[]>
  loaded: boolean
  setDictMap: (map: Record<string, DictItemVO[]>) => void
  getItems: (code: string) => DictItemVO[]
  getLabel: (code: string, value: string) => string
}

export const useDictStore = create<DictState>()(
  persist(
    (set, get) => ({
      dictMap: {},
      loaded: false,
      setDictMap: (dictMap) => set({ dictMap, loaded: true }),
      getItems: (code) =>
        get().dictMap[code]?.filter((i) => i.status === 1) ?? [],
      getLabel: (code, value) =>
        get().dictMap[code]?.find((i) => i.itemValue === value)?.itemLabel ??
        value,
    }),
    { name: 'lkda_dict' }
  )
)
