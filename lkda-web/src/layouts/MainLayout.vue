<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notifyStore = useNotifyStore()

const MOBILE_BREAKPOINT = 768
const isMobile = ref(false)
const sidebarCollapsed = ref(false)
const sidebarOpenMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT
  if (!isMobile.value) {
    sidebarOpenMobile.value = false
  }
}

function toggleSidebar() {
  if (isMobile.value) {
    sidebarOpenMobile.value = !sidebarOpenMobile.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

function closeMobileSidebar() {
  sidebarOpenMobile.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// ── 菜单定义 ───────────────────────────────────────────────────
// roles: [] = 全部登录用户可见；否则满足其一即可见
interface MenuItem {
  path: string
  title: string
  icon: string
  roles: string[]
  children?: MenuItem[]
}

const rawMenuTree: MenuItem[] = [
  {
    path: '/dashboard',
    title: '数据概览',
    icon: 'Odometer',
    roles: [],
  },
  {
    path: '/volume',
    title: '案卷管理',
    icon: 'FolderOpened',
    roles: [],
    children: [
      { path: '/volume/list', title: '案卷目录', icon: 'Files', roles: [] },
      { path: '/volume/import', title: 'Excel 导入', icon: 'Upload', roles: ['archive_admin'] },
    ],
  },
  {
    path: '/approve',
    title: '归档审批',
    icon: 'Stamp',
    roles: ['archive_admin', 'company_leader'],
    children: [
      { path: '/approve/review', title: '待审核队列', icon: 'Clock', roles: ['archive_admin'] },
      { path: '/approve/confirm', title: '待确认队列', icon: 'CircleCheck', roles: ['archive_admin'] },
      { path: '/approve/history', title: '审批历史', icon: 'Memo', roles: ['archive_admin', 'company_leader'] },
    ],
  },
  {
    path: '/borrow',
    title: '借阅管理',
    icon: 'Reading',
    roles: [],
    children: [
      { path: '/borrow/my', title: '我的借阅', icon: 'User', roles: [] },
      { path: '/borrow/approve', title: '借阅审批', icon: 'EditPen', roles: ['archive_admin'] },
      { path: '/borrow/history', title: '借阅历史', icon: 'List', roles: [] },
    ],
  },
  {
    path: '/destroy/approve',
    title: '销毁审批',
    icon: 'DeleteFilled',
    roles: ['company_leader'],
  },
  {
    path: '/system',
    title: '系统管理',
    icon: 'Setting',
    roles: ['archive_admin'],
    children: [
      { path: '/system/user', title: '用户管理', icon: 'UserFilled', roles: ['archive_admin'] },
      { path: '/system/dept', title: '部门管理', icon: 'OfficeBuilding', roles: ['archive_admin'] },
      { path: '/system/dict', title: '数据字典', icon: 'Collection', roles: ['archive_admin'] },
    ],
  },
  {
    path: '/audit/log',
    title: '审计日志',
    icon: 'Tickets',
    roles: ['archive_admin', 'company_leader'],
  },
]

function canView(item: MenuItem): boolean {
  if (item.roles.length === 0) return true
  return item.roles.some(r => authStore.hasRole(r))
}

const menuTree = computed(() =>
  rawMenuTree
    .filter(canView)
    .map(item => ({
      ...item,
      children: item.children?.filter(canView),
    })),
)

// ── 活动菜单：与路由路径精确匹配，让 el-menu 自行处理高亮 ─────
const activeMenu = computed(() => route.path)

// ── 通知铃：按角色路由 ─────────────────────────────────────────
function handleBellClick() {
  if (authStore.hasRole('archive_admin')) {
    router.push('/approve/review')
  } else if (authStore.hasRole('company_leader')) {
    router.push('/approve/history')
  } else {
    router.push('/borrow/my')
  }
}

// ── 用户操作 ───────────────────────────────────────────────────
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
    authStore.logout()
    router.push('/login')
  } catch { /* 取消退出 */ }
}
</script>

<template>
  <el-container class="main-layout">
    <!-- ── 顶部导航栏 ────────────────────────────────────────── -->
    <el-header class="main-header">
      <div class="header-left">
        <div class="logo-wrap">
          <span class="logo-text">矿</span>
        </div>
        <el-icon
          class="menu-toggle"
          @click="toggleSidebar"
        >
          <Fold v-if="!sidebarCollapsed && !isMobile" />
          <Expand v-else />
        </el-icon>
        <span class="system-title">莱矿-档案管理系统</span>
      </div>

      <div class="header-right">
        <!-- 待办通知铃铛 -->
        <el-tooltip content="待处理审批" placement="bottom">
          <el-badge
            :value="notifyStore.pendingApprove || undefined"
            :max="99"
            class="notify-badge"
            @click="handleBellClick"
          >
            <el-icon class="header-icon"><Bell /></el-icon>
          </el-badge>
        </el-tooltip>

        <!-- 用户头像 & 下拉菜单 -->
        <el-dropdown trigger="click">
          <div class="user-chip">
            <el-avatar :size="30" class="user-avatar">
              {{ authStore.userInfo?.nickname?.[0] ?? 'U' }}
            </el-avatar>
            <span class="user-name">{{ authStore.userInfo?.nickname }}</span>
            <el-icon class="arrow-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                :icon="'Avatar'"
                @click="router.push('/profile')"
              >
                个人中心
              </el-dropdown-item>
              <el-dropdown-item
                :icon="'Lock'"
                @click="router.push('/profile/password')"
              >
                修改密码
              </el-dropdown-item>
              <el-dropdown-item
                divided
                :icon="'SwitchButton'"
                @click="handleLogout"
              >
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="body-container">
      <!-- ── 移动端遮罩 ──────────────────────────────────────── -->
      <div
        v-if="isMobile && sidebarOpenMobile"
        class="sidebar-overlay"
        @click="closeMobileSidebar"
      />

      <!-- ── 侧边栏 ──────────────────────────────────────────── -->
      <el-aside
        :width="sidebarCollapsed && !isMobile ? '64px' : '220px'"
        :class="['main-aside', { 'mobile-open': isMobile && sidebarOpenMobile, 'mobile-hidden': isMobile && !sidebarOpenMobile }]"
      >
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed && !isMobile"
          :collapse-transition="false"
          router
          unique-opened
          class="sidebar-menu"
          @select="closeMobileSidebar"
        >
          <template v-for="item in menuTree" :key="item.path">
            <!-- 有子菜单 → el-sub-menu -->
            <el-sub-menu
              v-if="item.children && item.children.length"
              :index="item.path"
            >
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="child.path"
                :index="child.path"
              >
                <el-icon><component :is="child.icon" /></el-icon>
                <template #title>{{ child.title }}</template>
              </el-menu-item>
            </el-sub-menu>

            <!-- 无子菜单 → 直接 el-menu-item -->
            <el-menu-item
              v-else
              :index="item.path"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <!-- ── 内容区 ──────────────────────────────────────────── -->
      <el-main class="main-content">
        <router-view v-slot="{ Component, route: r }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="r.fullPath" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// ── 顶部导航 ──────────────────────────────────────────────────
.main-header {
  height: $header-height;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);
  color: #fff;
  padding: 0 16px 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;

    .logo-wrap {
      width: 34px;
      height: 34px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .logo-text {
        font-weight: 700;
        font-size: 16px;
      }
    }

    .menu-toggle {
      font-size: 20px;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
      flex-shrink: 0;

      &:hover { opacity: 1; }
    }

    .system-title {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: 0.5px;
      white-space: nowrap;

      @media (max-width: 560px) {
        display: none;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 18px;

    .notify-badge {
      cursor: pointer;
      line-height: 1;
    }

    .header-icon {
      font-size: 20px;
      opacity: 0.85;
      display: block;
      transition: opacity 0.2s;

      &:hover { opacity: 1; }
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      padding: 4px 10px 4px 4px;
      border-radius: 20px;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .user-avatar {
        background-color: rgba(255, 255, 255, 0.25);
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
      }

      .user-name {
        font-size: 14px;
        font-weight: 500;
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .arrow-icon {
        font-size: 12px;
        opacity: 0.7;
      }
    }
  }
}

// ── body 容器（侧边 + 内容） ──────────────────────────────────
.body-container {
  flex: 1;
  overflow: hidden;
}

// ── 移动端遮罩 ────────────────────────────────────────────────
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 90;
}

// ── 侧边栏 ────────────────────────────────────────────────────
.main-aside {
  background-color: $color-bg-aside;
  transition: width 0.25s ease, transform 0.25s ease;
  border-right: 1px solid #D1FAE5;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &.mobile-hidden {
    width: 0 !important;
    border-right: none;
  }

  &.mobile-open {
    position: fixed;
    top: $header-height;
    left: 0;
    bottom: 0;
    z-index: 95;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  }

  .sidebar-menu {
    flex: 1;
    border-right: none;
    background-color: transparent;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px;

    // 滚动条极简化
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: #A7F3D0; border-radius: 2px; }

    // ── 顶级 menu-item ──────────────────────────────────────
    :deep(.el-menu-item) {
      border-radius: 10px;
      margin-bottom: 2px;
      height: 42px;
      line-height: 42px;
      font-size: 14px;
      color: #374151;
      transition: background 0.2s, color 0.2s;

      &:hover:not(.is-active) {
        background-color: #CCFBF1 !important;
        color: $color-primary-dark;
      }

      &.is-active {
        background: linear-gradient(135deg, $color-primary, $color-primary-dark) !important;
        color: #fff !important;
        font-weight: 600;

        .el-icon { color: #fff !important; }
      }
    }

    // ── sub-menu 标题行 ──────────────────────────────────────
    :deep(.el-sub-menu__title) {
      border-radius: 10px;
      margin-bottom: 2px;
      height: 42px;
      line-height: 42px;
      font-size: 14px;
      color: #374151;
      transition: background 0.2s, color 0.2s;

      &:hover {
        background-color: #CCFBF1 !important;
        color: $color-primary-dark !important;
      }
    }

    // sub-menu 展开时标题行高亮
    :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
      color: $color-primary-dark !important;
      font-weight: 600;
    }

    // ── 子菜单容器 ───────────────────────────────────────────
    :deep(.el-menu--inline) {
      background-color: transparent !important;

      .el-menu-item {
        border-radius: 10px;
        padding-left: 44px !important;
        height: 38px;
        line-height: 38px;
        font-size: 13px;
        color: #4B5563;
        margin-bottom: 1px;

        &:hover:not(.is-active) {
          background-color: #CCFBF1 !important;
          color: $color-primary-dark;
        }

        &.is-active {
          background: linear-gradient(135deg, $color-primary, $color-primary-dark) !important;
          color: #fff !important;
          font-weight: 600;

          .el-icon { color: #fff !important; }
        }
      }
    }

    // 折叠态隐藏文字时的 tooltip 弹出层走默认样式，无需覆盖
  }
}

// ── 内容区 ────────────────────────────────────────────────────
.main-content {
  background-color: #F8FAFC;
  overflow-y: auto;
  padding: 0;
  min-width: 0;
}

// ── 路由切换淡入淡出 ──────────────────────────────────────────
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
