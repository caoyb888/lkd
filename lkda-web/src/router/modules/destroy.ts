import type { RouteRecordRaw } from 'vue-router'

export const destroyRoutes: RouteRecordRaw[] = [
  {
    path: '/destroy/apply',
    name: 'DestroyApply',
    component: () => import('@/views/destroy/DestroyApplyView.vue'),
    meta: { title: '销毁申请', roles: ['archive_admin'] },
  },
  {
    path: '/destroy/approve',
    name: 'DestroyApprove',
    component: () => import('@/views/destroy/DestroyApproveView.vue'),
    meta: { title: '销毁审批', roles: ['company_leader'] },
  },
]
