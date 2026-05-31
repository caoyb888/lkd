<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { AuthApi } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// ── 密码强度计算 ────────────────────────────────────────────────
const strengthScore = computed(() => {
  const p = form.newPassword
  if (!p) return 0
  let score = 0
  if (p.length >= 6) score++
  if (p.length >= 10) score++
  if (/[A-Za-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[$@$!%*#?&]/.test(p)) score++
  return score
})

const strengthLabel = computed(() => {
  const s = strengthScore.value
  if (s <= 1) return { text: '弱', cls: 'weak' }
  if (s <= 3) return { text: '中', cls: 'medium' }
  return { text: '强', cls: 'strong' }
})

// ── 校验器 ──────────────────────────────────────────────────────
function validateNew(_: unknown, value: string, callback: (e?: Error) => void) {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (!PASSWORD_REGEX.test(value)) {
    callback(new Error('须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位'))
  } else {
    if (form.confirmPassword) formRef.value?.validateField('confirmPassword')
    callback()
  }
}

function validateConfirm(_: unknown, value: string, callback: (e?: Error) => void) {
  if (!value) {
    callback(new Error('请再次输入新密码'))
  } else if (value !== form.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  oldPassword:     [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword:     [{ required: true, validator: validateNew,    trigger: ['blur', 'change'] }],
  confirmPassword: [{ required: true, validator: validateConfirm, trigger: ['blur', 'change'] }],
}

// ── 提交 ────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await AuthApi.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    ElMessage.success('密码修改成功，即将跳转至登录页')
    authStore.logout()
    setTimeout(() => router.replace('/login'), 1200)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="修改密码"
      :show-back="true"
      :breadcrumbs="[{ label: '个人中心', path: '/profile' }, { label: '修改密码' }]"
    />

    <div class="pwd-layout">
      <el-card class="pwd-card" shadow="never">
        <!-- 顶部图标区 -->
        <div class="pwd-card-top">
          <div class="lock-icon-wrap">
            <el-icon class="lock-icon"><Lock /></el-icon>
          </div>
          <div class="pwd-card-hint">
            <p class="hint-title">修改登录密码</p>
            <p class="hint-desc">修改成功后，系统将自动退出，请使用新密码重新登录</p>
          </div>
        </div>

        <el-divider />

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="pwd-form"
          @keyup.enter="handleSubmit"
        >
          <!-- 当前密码 -->
          <el-form-item label="当前密码" prop="oldPassword">
            <el-input
              v-model="form.oldPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password
              size="large"
              prefix-icon="Unlock"
              :disabled="loading"
              autocomplete="current-password"
            />
          </el-form-item>

          <!-- 新密码 + 强度指示器 -->
          <el-form-item label="新密码" prop="newPassword" class="new-pwd-item">
            <el-input
              v-model="form.newPassword"
              type="password"
              placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
              show-password
              size="large"
              prefix-icon="Lock"
              :disabled="loading"
              autocomplete="new-password"
            />

            <!-- 密码强度条：仅在开始输入后显示 -->
            <transition name="hint-slide">
              <div v-if="form.newPassword" class="strength-wrap">
                <div class="strength-bars">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="strength-bar"
                    :class="{
                      active: i <= strengthScore,
                      weak:   i <= strengthScore && strengthScore <= 1,
                      medium: i <= strengthScore && strengthScore >= 2 && strengthScore <= 3,
                      strong: i <= strengthScore && strengthScore >= 4,
                    }"
                  />
                </div>
                <span class="strength-text" :class="strengthLabel.cls">
                  强度：{{ strengthLabel.text }}
                </span>
              </div>
            </transition>
          </el-form-item>

          <!-- 确认新密码 -->
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
              size="large"
              prefix-icon="Lock"
              :disabled="loading"
              autocomplete="new-password"
            />
          </el-form-item>

          <!-- 密码规则说明 -->
          <div class="rules-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>密码须同时包含&nbsp;<strong>字母</strong>、<strong>数字</strong>、<strong>特殊字符</strong>（$&nbsp;@&nbsp;!&nbsp;%&nbsp;*&nbsp;#&nbsp;?&nbsp;&amp;），且长度不少于 6 位</span>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <el-button
              size="large"
              class="cancel-btn"
              :disabled="loading"
              @click="router.back()"
            >
              取消
            </el-button>
            <el-button
              type="primary"
              size="large"
              class="submit-btn"
              :loading="loading"
              @click="handleSubmit"
            >
              <span v-if="!loading">确认修改</span>
              <span v-else>提交中…</span>
            </el-button>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
}

.pwd-layout {
  display: flex;
  justify-content: center;
}

// ── 密码卡片 ──────────────────────────────────────────────────────
.pwd-card {
  width: 100%;
  max-width: 520px;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__body) {
    padding: 32px 36px;

    @media (max-width: 560px) {
      padding: 24px 20px;
    }
  }
}

// ── 顶部图标区 ────────────────────────────────────────────────────
.pwd-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.lock-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .lock-icon {
    font-size: 24px;
    color: $color-primary-dark;
  }
}

.pwd-card-hint {
  .hint-title {
    font-size: 16px;
    font-weight: 600;
    color: $color-text-title;
    margin-bottom: 4px;
  }

  .hint-desc {
    font-size: 12px;
    color: #94A3B8;
    line-height: 1.5;
  }
}

:deep(.el-divider) {
  margin: 20px 0 24px;
  border-color: #F1F5F9;
}

// ── 表单 ──────────────────────────────────────────────────────────
.pwd-form {
  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-body;
    padding-bottom: 6px;
    line-height: 1.4;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: 0 0 0 1px #E2E8F0;
    transition: box-shadow 0.2s;

    &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
    &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 30%, transparent); }
  }

  :deep(.el-input__inner) {
    font-size: 14px;
    color: $color-text-title;
  }

  :deep(.el-form-item__error) {
    font-size: 12px;
  }
}

// 新密码 item：留给强度条空间
.new-pwd-item {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: stretch;
  }
}

// ── 密码强度指示器 ───────────────────────────────────────────────
.strength-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.strength-bars {
  display: flex;
  gap: 4px;
}

.strength-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #E2E8F0;
  transition: background 0.3s;

  &.active {
    &.weak   { background: #EF4444; }
    &.medium { background: #F59E0B; }
    &.strong { background: #10B981; }
  }
}

.strength-text {
  font-size: 12px;
  font-weight: 600;

  &.weak   { color: #EF4444; }
  &.medium { color: #F59E0B; }
  &.strong { color: #10B981; }
}

// 滑入动画
.hint-slide-enter-active,
.hint-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.hint-slide-enter-from,
.hint-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// ── 密码规则说明 ──────────────────────────────────────────────────
.rules-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 14px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 10px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.6;
  margin-bottom: 28px;

  .el-icon {
    color: #F59E0B;
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 14px;
  }

  strong {
    font-weight: 600;
    color: #78350F;
  }
}

// ── 操作按钮 ──────────────────────────────────────────────────────
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  border-radius: var(--radius-btn);
  color: #64748B;
  border-color: #E2E8F0;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

.submit-btn {
  min-width: 120px;
  border-radius: var(--radius-btn);
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.65;
  }
}
</style>
