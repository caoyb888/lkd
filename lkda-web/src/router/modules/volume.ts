import type { RouteRecordRaw } from 'vue-router'

export const volumeRoutes: RouteRecordRaw[] = [
  {
    path: '/volume/list',
    name: 'VolumeList',
    component: () => import('@/views/volume/VolumeListView.vue'),
    meta: { title: '案卷目录' },
  },
  {
    path: '/volume/edit/:id?',
    name: 'VolumeEdit',
    component: () => import('@/views/volume/VolumeEditView.vue'),
    meta: { title: '新建/编辑案卷', roles: ['archive_admin', 'user'] },
  },
  {
    path: '/volume/detail/:id',
    name: 'VolumeDetail',
    component: () => import('@/views/volume/VolumeDetailView.vue'),
    meta: { title: '案卷详情' },
  },
  {
    path: '/volume/drafts',
    name: 'VolumeDraftList',
    component: () => import('@/views/volume/VolumeDraftListView.vue'),
    meta: { title: '待归档', roles: ['archive_admin', 'user'] },
  },
  {
    path: '/volume/import',
    name: 'VolumeImport',
    component: () => import('@/views/volume/VolumeImportView.vue'),
    meta: { title: 'Excel 批量导入', roles: ['archive_admin'] },
  },
]
