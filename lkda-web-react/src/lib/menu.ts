export interface MenuItem {
  path: string
  title: string
  icon: string
  roles: string[]
  children?: MenuItem[]
}

/**
 * 原始菜单树定义
 * roles: [] = 全部登录用户可见；否则满足其一即可见
 */
export const rawMenuTree: MenuItem[] = [
  {
    path: '/dashboard',
    title: '数据概览',
    icon: 'LayoutDashboard',
    roles: [],
  },
  {
    path: '/volume',
    title: '案卷管理',
    icon: 'FolderOpen',
    roles: [],
    children: [
      { path: '/volume/list', title: '案卷目录', icon: 'FileText', roles: [] },
      { path: '/volume/import', title: 'Excel 导入', icon: 'Upload', roles: ['archive_admin'] },
    ],
  },
  {
    path: '/approve',
    title: '归档审批',
    icon: 'CheckCircle',
    roles: ['archive_admin', 'company_leader'],
    children: [
      { path: '/approve/review', title: '待审核队列', icon: 'Clock', roles: ['archive_admin'] },
      { path: '/approve/confirm', title: '待确认队列', icon: 'CircleCheck', roles: ['archive_admin'] },
      { path: '/approve/history', title: '审批历史', icon: 'ClipboardList', roles: ['archive_admin', 'company_leader'] },
    ],
  },
  {
    path: '/borrow',
    title: '借阅管理',
    icon: 'BookOpen',
    roles: [],
    children: [
      { path: '/borrow/my', title: '我的借阅', icon: 'User', roles: [] },
      { path: '/borrow/approve', title: '借阅审批', icon: 'PenSquare', roles: ['archive_admin'] },
      { path: '/borrow/history', title: '借阅历史', icon: 'List', roles: [] },
    ],
  },
  {
    path: '/destroy',
    title: '销毁管理',
    icon: 'Trash2',
    roles: ['archive_admin', 'company_leader'],
    children: [
      { path: '/destroy/apply', title: '销毁申请', icon: 'Trash2', roles: ['archive_admin'] },
      { path: '/destroy/approve', title: '销毁审批', icon: 'Gavel', roles: ['company_leader'] },
    ],
  },
  {
    path: '/system',
    title: '系统管理',
    icon: 'Settings',
    roles: ['archive_admin'],
    children: [
      { path: '/system/user', title: '用户管理', icon: 'UserCircle', roles: ['archive_admin'] },
      { path: '/system/dept', title: '部门管理', icon: 'Building', roles: ['archive_admin'] },
      { path: '/system/dict', title: '数据字典', icon: 'Library', roles: ['archive_admin'] },
    ],
  },
  {
    path: '/audit/log',
    title: '审计日志',
    icon: 'ScrollText',
    roles: ['archive_admin', 'company_leader'],
  },
]

/**
 * 底部 Tab 导航配置（手机端高频入口）
 */
export const bottomNavItems = [
  { path: '/', title: '首页', icon: 'LayoutDashboard' },
  { path: '/volume/list', title: '案卷', icon: 'FolderOpen' },
  { path: '/borrow', title: '借阅', icon: 'BookOpen' },
  { path: '/profile', title: '我的', icon: 'User' },
]

/**
 * 判断菜单项是否对用户可见
 * @param item 菜单项
 * @param userRole 用户角色（单角色字符串）
 */
export function canViewMenu(item: MenuItem, userRole?: string | null): boolean {
  if (item.roles.length === 0) return true
  if (!userRole) return false
  // company_leader 拥有全部菜单权限
  if (userRole === 'company_leader') return true
  return item.roles.includes(userRole)
}

/**
 * 过滤菜单树
 * @param tree 原始菜单树
 * @param userRole 用户角色
 */
export function filterMenuTree(
  tree: MenuItem[],
  userRole?: string | null
): MenuItem[] {
  return tree
    .filter((item) => canViewMenu(item, userRole))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) =>
        canViewMenu(child, userRole)
      ),
    }))
    .filter((item) => !item.children || item.children.length > 0)
}
