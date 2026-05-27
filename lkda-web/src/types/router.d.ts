import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题，用于 document.title */
    title?: string
    /** false = 白名单（无需登录），undefined/true = 需要登录 */
    requiresAuth?: boolean
    /** 允许访问的角色列表，空数组或不设置 = 所有已登录用户可访问 */
    roles?: string[]
    /** 允许访问的权限码列表 */
    permissions?: string[]
  }
}
