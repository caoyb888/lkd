import { createRouter, createWebHistory } from 'vue-router'
import { systemRoutes } from './modules/system'
import { volumeRoutes } from './modules/volume'
import { borrowRoutes } from './modules/borrow'
import { approveRoutes } from './modules/approve'
import { destroyRoutes } from './modules/destroy'
import { setupRouterGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    // ── AuthLayout：登录 / 找回密码等无侧边栏页 ──────────────────
    {
      path: '/auth',
      component: () => import('@/layouts/AuthLayout.vue'),
      meta: { requiresAuth: false },
      children: [
        {
          path: '',
          redirect: '/login',
        },
        {
          path: '/login',
          name: 'Login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { title: '登录', requiresAuth: false },
        },
      ],
    },

    // ── MainLayout：需要登录的主框架页 ───────────────────────────
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: '数据概览' },
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/auth/ProfileView.vue'),
          meta: { title: '个人中心' },
        },
        {
          path: 'profile/password',
          name: 'ChangePassword',
          component: () => import('@/views/auth/ChangePasswordView.vue'),
          meta: { title: '修改密码' },
        },
        {
          path: 'file/list/:volumeId',
          name: 'FileList',
          component: () => import('@/views/file/FileListView.vue'),
          meta: { title: '卷内文件目录' },
        },
        {
          path: 'file/edit/:id?',
          name: 'FileEdit',
          component: () => import('@/views/file/FileEditView.vue'),
          meta: { title: '新建/编辑文件' },
        },
        {
          path: 'print/preview/:volumeId',
          name: 'PrintPreview',
          component: () => import('@/views/print/PrintPreviewView.vue'),
          meta: { title: '打印预览' },
        },
        ...systemRoutes,
        ...volumeRoutes,
        ...borrowRoutes,
        ...approveRoutes,
        ...destroyRoutes,
      ],
    },

    // ── 独立页：无需布局包裹 ─────────────────────────────────────
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('@/views/auth/ForbiddenView.vue'),
      meta: { title: '无权限', requiresAuth: false },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/auth/NotFoundView.vue'),
      meta: { title: '页面不存在', requiresAuth: false },
    },
  ],
})

setupRouterGuards(router)

export default router
