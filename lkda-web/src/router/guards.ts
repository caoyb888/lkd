import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDictStore } from '@/stores/dict'

const APP_TITLE = '莱矿-档案管理系统'

function setDocTitle(route: RouteLocationNormalized) {
  const pageTitle = route.meta?.title
  document.title = pageTitle ? `${pageTitle} — ${APP_TITLE}` : APP_TITLE
}

async function handleNav(
  to: RouteLocationNormalized,
  next: NavigationGuardNext,
  authStore: ReturnType<typeof useAuthStore>,
  dictStore: ReturnType<typeof useDictStore>,
) {
  // 白名单（requiresAuth 明确为 false）
  if (to.meta.requiresAuth === false) {
    // 已登录时访问登录页 → 直接去首页
    if (to.name === 'Login' && authStore.isLoggedIn) {
      return next({ path: '/dashboard', replace: true })
    }
    return next()
  }

  // 未登录 → 跳登录页，记录来源 redirect
  if (!authStore.isLoggedIn) {
    return next({
      name: 'Login',
      query: { redirect: to.fullPath },
      replace: true,
    })
  }

  // 已登录时自动预加载字典（失败不阻塞导航）
  // 若本地缓存缺失关键字典（如 category_l1），也触发重新加载
  const keyDicts = ['category_l1', 'category_l2', 'fonds_no', 'security_level']
  const hasMissing = keyDicts.some(
    code => !dictStore.dictMap[code] || dictStore.dictMap[code].length === 0,
  )
  if (!dictStore.loaded || hasMissing) {
    await dictStore.loadAll().catch(() => {})
  }

  // 角色权限校验
  const requiredRoles = to.meta.roles
  if (requiredRoles && requiredRoles.length > 0) {
    const ok = requiredRoles.some(role => authStore.hasRole(role))
    if (!ok) {
      return next({ path: '/403', replace: true })
    }
  }

  // 权限码校验
  const requiredPerms = to.meta.permissions
  if (requiredPerms && requiredPerms.length > 0) {
    const ok = requiredPerms.some(p => authStore.hasPermission(p))
    if (!ok) {
      return next({ path: '/403', replace: true })
    }
  }

  next()
}

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    // 获取 store — 需在 beforeEach 回调内部调用，确保 pinia 已初始化
    const authStore = useAuthStore()
    const dictStore = useDictStore()
    await handleNav(to, next, authStore, dictStore)
  })

  router.afterEach((to) => {
    setDocTitle(to)
  })
}
