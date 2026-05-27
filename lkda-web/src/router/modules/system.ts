import type { RouteRecordRaw } from 'vue-router'

export const systemRoutes: RouteRecordRaw[] = [
  {
    path: '/system/user',
    name: 'SystemUser',
    component: () => import('@/views/system/UserListView.vue'),
    meta: { title: '用户管理', roles: ['archive_admin'] },
  },
  {
    path: '/system/dept',
    name: 'SystemDept',
    component: () => import('@/views/system/DeptView.vue'),
    meta: { title: '部门管理', roles: ['archive_admin'] },
  },
  {
    path: '/system/dict',
    name: 'SystemDict',
    component: () => import('@/views/system/DictView.vue'),
    meta: { title: '数据字典', roles: ['archive_admin'] },
  },
]
