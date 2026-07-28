import { ref, watch, type Ref } from 'vue'

export type ViewMode = 'table' | 'card'

/** 列表/卡片视图切换，localStorage 持久化，每页独立 key */
export function useViewMode(pageKey: string): Ref<ViewMode> {
  const key = `lkda_${pageKey}_view`
  const saved = localStorage.getItem(key)
  const mode = ref<ViewMode>(saved === 'card' ? 'card' : 'table')
  watch(mode, (val) => localStorage.setItem(key, val))
  return mode
}
