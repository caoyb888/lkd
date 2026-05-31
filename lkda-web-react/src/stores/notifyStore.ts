import { create } from 'zustand'

interface NotifyState {
  todoCount: number
  setTodoCount: (count: number) => void
  increment: () => void
  decrement: () => void
}

export const useNotifyStore = create<NotifyState>((set) => ({
  todoCount: 0,
  setTodoCount: (todoCount) => set({ todoCount }),
  increment: () => set((state) => ({ todoCount: state.todoCount + 1 })),
  decrement: () => set((state) => ({ todoCount: Math.max(0, state.todoCount - 1) })),
}))
