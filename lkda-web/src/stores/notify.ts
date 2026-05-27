import { defineStore } from 'pinia'
import { ref } from 'vue'
import http from '@/utils/http'

interface NotifyCount {
  pendingApprove: number
  overdueCount: number
  myPendingBorrow: number
}

export const useNotifyStore = defineStore('notify', () => {
  const pendingApprove = ref(0)
  const overdueCount = ref(0)
  const myPendingBorrow = ref(0)

  async function refresh() {
    const counts = await http.get<NotifyCount>('/notification/count')
    pendingApprove.value = counts.pendingApprove
    overdueCount.value = counts.overdueCount
    myPendingBorrow.value = counts.myPendingBorrow
  }

  return { pendingApprove, overdueCount, myPendingBorrow, refresh }
})
