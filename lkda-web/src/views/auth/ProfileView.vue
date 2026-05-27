<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { desensitizePhone } from '@/utils/desensitize'

const router = useRouter()
const authStore = useAuthStore()
const info = computed(() => authStore.userInfo)

const ROLE_LABEL: Record<string, string> = {
  archive_admin: '档案管理员',
  user: '普通用户',
  company_leader: '公司领导',
}

const roleChips = computed(() => {
  const r = info.value?.role
  return r ? [{ key: r, label: ROLE_LABEL[r] ?? r }] : []
})

const displayPhone = computed(() =>
  info.value?.phone ? desensitizePhone(info.value.phone) : '—',
)

const avatarLetter = computed(() =>
  info.value?.nickname?.[0]?.toUpperCase() ?? 'U',
)

const infoItems = computed(() => [
  { icon: 'User',          label: '用户名',   value: info.value?.username  ?? '—' },
  { icon: 'Avatar',        label: '昵称',     value: info.value?.nickname  ?? '—' },
  { icon: 'Phone',         label: '手机号',   value: displayPhone.value            },
  { icon: 'OfficeBuilding',label: '角色',     value: ROLE_LABEL[info.value?.role ?? ''] ?? '—' },
])
</script>

<template>
  <div class="page-container">
    <PageHeader title="个人中心" />

    <!-- ── 顶部英雄卡：头像 + 姓名 + 角色标签 ──────────────────── -->
    <div class="profile-hero">
      <div class="avatar-ring">
        <div class="avatar-circle">{{ avatarLetter }}</div>
      </div>

      <div class="hero-info">
        <h2 class="hero-name">{{ info?.nickname }}</h2>
        <div class="role-chips">
          <span
            v-for="chip in roleChips"
            :key="chip.key"
            class="role-chip"
            :class="chip.key.toLowerCase()"
          >
            {{ chip.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── 基本信息卡 ─────────────────────────────────────────────── -->
    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="card-title">
          <el-icon><InfoFilled /></el-icon>
          基本信息
        </div>
      </template>

      <div class="info-grid">
        <div v-for="item in infoItems" :key="item.label" class="info-item">
          <div class="item-icon-wrap">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
          <div class="item-body">
            <span class="item-label">{{ item.label }}</span>
            <span class="item-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- ── 安全设置卡 ─────────────────────────────────────────────── -->
    <el-card class="security-card" shadow="never">
      <template #header>
        <div class="card-title">
          <el-icon><Lock /></el-icon>
          账号安全
        </div>
      </template>

      <div class="security-row">
        <div class="security-left">
          <div class="security-label">登录密码</div>
          <div class="security-desc">定期修改密码有助于保护账号安全</div>
        </div>
        <el-button
          class="change-pwd-btn"
          @click="router.push('/profile/password')"
        >
          <el-icon><EditPen /></el-icon>
          修改密码
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  max-width: 760px;
}

// ── 英雄区 ────────────────────────────────────────────────────────
.profile-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  background: linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 100%);
  border: 1px solid #CCFBF1;
  border-radius: var(--radius-card);
  margin-bottom: 20px;
  box-shadow: var(--shadow-card);
}

.avatar-ring {
  padding: 4px;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-circle {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #fff;
  color: $color-primary-dark;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.hero-info {
  .hero-name {
    font-size: 22px;
    font-weight: 700;
    color: $color-text-title;
    margin-bottom: 10px;
  }

  .role-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .role-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: var(--radius-tag);
    font-size: 13px;
    font-weight: 500;

    &.role_admin   { background: #D1FAE5; color: #065F46; }
    &.role_user    { background: #DBEAFE; color: #1D4ED8; }
    &.role_leader  { background: #EDE9FE; color: #5B21B6; }
  }
}

// ── 卡片通用标题 ─────────────────────────────────────────────────
.card-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 600;
  color: $color-text-title;

  .el-icon {
    color: $color-primary;
    font-size: 16px;
  }
}

// ── 基本信息卡 ───────────────────────────────────────────────────
.info-card {
  margin-bottom: 20px;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__header) {
    padding: 16px 24px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 16px 24px 24px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #F8FAFC;
  border-radius: 12px;
  border: 1px solid #F1F5F9;
  transition: border-color 0.2s;

  &:hover {
    border-color: #A7F3D0;
  }
}

.item-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #CCFBF1, #A7F3D0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .el-icon {
    color: $color-primary-dark;
    font-size: 16px;
  }
}

.item-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-label {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 3px;
  letter-spacing: 0.3px;
}

.item-value {
  font-size: 14px;
  font-weight: 500;
  color: $color-text-title;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ── 安全设置卡 ───────────────────────────────────────────────────
.security-card {
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__header) {
    padding: 16px 24px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 20px 24px;
  }
}

.security-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.security-left {
  .security-label {
    font-size: 14px;
    font-weight: 600;
    color: $color-text-title;
    margin-bottom: 4px;
  }

  .security-desc {
    font-size: 12px;
    color: #94A3B8;
  }
}

.change-pwd-btn {
  flex-shrink: 0;
  border-color: $color-primary;
  color: $color-primary;
  border-radius: var(--radius-btn);
  font-weight: 500;
  transition: background 0.2s, color 0.2s, transform 0.2s;

  &:hover {
    background: $color-primary;
    color: #fff;
    transform: translateY(-1px);
  }
}
</style>
