import type { RouteRecordRaw } from 'vue-router'

export const approveRoutes: RouteRecordRaw[] = [
  {
    path: '/approve/review',
    name: 'ApproveReview',
    component: () => import('@/views/approve/ApproveReviewView.vue'),
    meta: { title: '待审核队列', roles: ['archive_admin'] },
  },
  {
    path: '/approve/confirm',
    name: 'ApproveConfirm',
    component: () => import('@/views/approve/ApproveConfirmView.vue'),
    meta: { title: '待确认队列', roles: ['archive_admin'] },
  },
  {
    path: '/approve/history',
    name: 'ApproveHistory',
    component: () => import('@/views/approve/ApproveHistoryView.vue'),
    meta: { title: '审批历史', roles: ['archive_admin', 'company_leader'] },
  },
  {
    path: '/audit/log',
    name: 'AuditLog',
    component: () => import('@/views/audit/AuditLogView.vue'),
    meta: { title: '审计日志', roles: ['archive_admin', 'company_leader'] },
  },
]
