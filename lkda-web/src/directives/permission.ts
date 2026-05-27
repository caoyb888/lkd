import type { App, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

/**
 * v-permission="'archive:destroy'"          — 单个权限码
 * v-permission="['ROLE_ADMIN','ROLE_LEADER']"  — 角色列表（满足其一即可）
 *
 * 无权限时将元素从 DOM 中移除（不仅仅是隐藏）
 */
function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const authStore = useAuthStore()
  const value = binding.value

  if (!value) return

  let allowed = false

  if (typeof value === 'string') {
    // 权限码或角色字符串
    allowed = authStore.hasPermission(value) || authStore.hasRole(value)
  } else if (Array.isArray(value)) {
    // 数组：角色 or 权限码，满足其一
    allowed = value.some(
      (v: string) => authStore.hasRole(v) || authStore.hasPermission(v),
    )
  }

  if (!allowed) {
    el.parentNode?.removeChild(el)
  }
}

export const permissionDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
}

export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}
