import { create } from 'zustand'
import { NotifyApi } from '@/api/notify'

interface NotifyCount {
  pendingApprove: number
  overdueCount: number
  myPendingBorrow: number
}

interface NotifyState extends NotifyCount {
  todoCount: number
  refresh: () => Promise<void>
  setTodoCount: (count: number) => void
  increment: () => void
  decrement: () => void
}

export const useNotifyStore = create<NotifyState>((set) =>({
  pendingApprove: 0,
  overdueCount: 0,
  myPendingBorrow: 0,
  todoCount: 0,

  refresh: async () => {
    try {
      const counts = await NotifyApi.count()
      const todoCount = counts.pendingApprove + counts.myPendingBorrow
      set({ ...counts, todoCount })
    } catch {
      // 静默失败
    }
  },

  setTodoCount: (todoCount) => set({ todoCount }),
  increment: () => set((state) => ({ todoCount: state.todoCount + 1 })),
  decrement: () => set((state) => ({ todoCount: Math.max(0, state.todoCount - 1) })),
}))
