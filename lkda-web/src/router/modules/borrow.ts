import type { RouteRecordRaw } from 'vue-router'

export const borrowRoutes: RouteRecordRaw[] = [
  {
    path: '/borrow/my',
    name: 'BorrowMy',
    component: () => import('@/views/borrow/BorrowMyView.vue'),
    meta: { title: '我的借阅' },
  },
  {
    path: '/borrow/apply/:archiveNo',
    name: 'BorrowApply',
    component: () => import('@/views/borrow/BorrowApplyView.vue'),
    meta: { title: '申请借阅' },
  },
  {
    path: '/borrow/approve',
    name: 'BorrowApprove',
    component: () => import('@/views/borrow/BorrowApproveView.vue'),
    meta: { title: '借阅审批', roles: ['archive_admin'] },
  },
  {
    path: '/borrow/history',
    name: 'BorrowHistory',
    component: () => import('@/views/borrow/BorrowHistoryView.vue'),
    meta: { title: '借阅历史' },
  },
]
