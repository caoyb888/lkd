import { useState } from 'react'

export type ViewMode = 'table' | 'card'

/**
 * 列表 / 卡片 视图模式，并把用户的选择持久化到 localStorage。
 * 每个列表页传入各自唯一的 storageKey（如 'lkda_volume_view'）。
 */
export function useViewMode(storageKey: string, initial: ViewMode = 'table') {
  const [viewMode, setViewModeState] = useState<ViewMode>(
    () => (localStorage.getItem(storageKey) as ViewMode) || initial
  )
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(storageKey, mode)
  }
  return [viewMode, setViewMode] as const
}
