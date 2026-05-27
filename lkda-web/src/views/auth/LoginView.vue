<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useDictStore } from '@/stores/dict'
import { AuthApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const dictStore = useDictStore()

// ── 表单状态 ────────────────────────────────────────────────────
const formRef = ref<FormInstance>()
const usernameRef = ref<HTMLInputElement>()
const loading = ref(false)
const loginFailed = ref(false)   // 触发 shake 动画

const form = reactive({ username: '', password: '' })

// ── 密码强度规则（登录不强制校验，仅给出友好提示）──────────────
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

const pwdHintVisible = computed(
  () => form.password.length > 0 && !PASSWORD_REGEX.test(form.password),
)

// ── 表单规则（只校验非空） ─────────────────────────────────────
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

// ── 登录逻辑 ───────────────────────────────────────────────────
async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  loginFailed.value = false

  try {
    const result = await AuthApi.login({
      username: form.username.trim(),
      password: form.password,
    })

    // 后端 LoginVO 直接包含用户基本信息，手动组装 UserInfoVO
    const userInfo: import('@/types/vo').UserInfoVO = {
      userId: result.userId,
      username: result.username,
      nickname: result.nickname,
      phone: null,
      deptId: null,
      role: result.role,
      status: 1,
    }

    // Token + 用户信息写入 Pinia & localStorage
    authStore.setAuth(result.token, userInfo)

    // 一次性预加载全部字典（失败不阻塞登录）
    await dictStore.loadAll().catch(() => {})

    // 跳转目标：redirect 参数 → /dashboard
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } catch {
    // 错误由 http 拦截器统一 ElMessage.error；这里只触发抖动动画
    loginFailed.value = true
    await nextTick()
    // 重置动画类以便下次可重新触发
    setTimeout(() => { loginFailed.value = false }, 600)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 自动聚焦用户名输入框
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>('.login-form .el-input__inner')
    el?.focus()
  })
})
</script>

<template>
  <div class="login-page">
    <!-- ── 背景装饰：浮动圆形光晕 ─────────────────────── -->
    <div class="bg-decoration" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
    </div>

    <!-- ── 登录卡片 ───────────────────────────────────── -->
    <div class="login-card" :class="{ shake: loginFailed }">
      <!-- 卡片顶部：Logo + 标题 -->
      <div class="card-header">
        <div class="logo-block">
          <!-- 档案卷宗图标 SVG -->
          <svg class="logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="10" width="36" height="30" rx="4" fill="#CCFBF1" />
            <rect x="10" y="6" width="28" height="30" rx="3" fill="#5EEAD4" />
            <rect x="14" y="2" width="20" height="30" rx="3" fill="white" stroke="#14B8A6" stroke-width="1.5" />
            <line x1="19" y1="11" x2="29" y2="11" stroke="#14B8A6" stroke-width="1.5" stroke-linecap="round" />
            <line x1="19" y1="16" x2="29" y2="16" stroke="#14B8A6" stroke-width="1.5" stroke-linecap="round" />
            <line x1="19" y1="21" x2="25" y2="21" stroke="#5EEAD4" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <h1 class="system-name">莱矿-档案管理系统</h1>
        <p class="system-sub">莱芜矿业集团 · 档案数字化平台</p>
      </div>

      <!-- 分割线 -->
      <div class="divider" />

      <!-- 表单区 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <!-- 用户名 -->
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            ref="usernameRef"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
            clearable
            :disabled="loading"
            autocomplete="username"
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item prop="password" class="pwd-item">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
            :disabled="loading"
            autocomplete="current-password"
          />
          <!-- 密码强度友好提示：非强制，仅当密码格式不符时显示 -->
          <transition name="hint-slide">
            <div v-if="pwdHintVisible" class="pwd-hint">
              <el-icon class="hint-icon"><InfoFilled /></el-icon>
              建议密码包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位
            </div>
          </transition>
        </el-form-item>

        <!-- 登录按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            :disabled="!form.username || !form.password"
            @click="handleLogin"
          >
            <span v-if="!loading">登 录</span>
            <span v-else>正在登录…</span>
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部版权 -->
      <p class="copyright">
        © {{ new Date().getFullYear() }} 莱芜矿业集团 · 档案数字化管理平台 v1.0
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
// ── 整页容器 ──────────────────────────────────────────────────
.login-page {
  min-height: 100vh;
  background: linear-gradient(
    145deg,
    #0D9488 0%,
    $color-primary 30%,
    $color-primary-dark 65%,
    #064E3B 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

// ── 背景浮动光晕 ─────────────────────────────────────────────
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.25;
  animation: float 8s ease-in-out infinite;
}
.blob-1 {
  width: 400px; height: 400px;
  background: #5EEAD4;
  top: -100px; left: -100px;
  animation-delay: 0s;
}
.blob-2 {
  width: 300px; height: 300px;
  background: $color-accent;
  bottom: -80px; right: -60px;
  animation-delay: -3s;
}
.blob-3 {
  width: 250px; height: 250px;
  background: #A78BFA;
  top: 50%; left: 60%;
  animation-delay: -5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50%       { transform: translateY(-30px) scale(1.05); }
}

// ── 登录卡片 ─────────────────────────────────────────────────
.login-card {
  position: relative;
  z-index: 1;
  width: 420px;
  padding: 44px 40px 32px;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border-radius: 24px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  transition: box-shadow 0.3s;

  &:hover {
    box-shadow:
      0 8px 36px rgba(0, 0, 0, 0.18),
      0 0 0 1px rgba(255, 255, 255, 0.6) inset;
  }
}

// shake 动画（登录失败）
.shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
@keyframes shake {
  10%, 90% { transform: translateX(-3px); }
  20%, 80% { transform: translateX(5px);  }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px);  }
}

// ── 卡片顶部 ──────────────────────────────────────────────────
.card-header {
  text-align: center;
  margin-bottom: 24px;

  .logo-block {
    display: flex;
    justify-content: center;
    margin-bottom: 14px;
  }

  .logo-icon {
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 4px 12px rgba(20, 184, 166, 0.3));
  }

  .system-name {
    font-size: 22px;
    font-weight: 700;
    color: $color-text-title;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
  }

  .system-sub {
    font-size: 12px;
    color: #94A3B8;
    letter-spacing: 0.5px;
  }
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #E2E8F0, transparent);
  margin-bottom: 28px;
}

// ── 表单区 ────────────────────────────────────────────────────
.login-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-form-item__error) {
    font-size: 12px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: 0 0 0 1px #E2E8F0;
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 0 0 1px #5EEAD4;
    }

    &.is-focus {
      box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.3);
    }
  }

  :deep(.el-input__inner) {
    font-size: 14px;
    color: $color-text-title;
  }
}

// 密码栏：留出提示高度
.pwd-item {
  :deep(.el-form-item__content) {
    flex-direction: column;
    align-items: stretch;
  }
}

// 密码强度友好提示
.pwd-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 6px;
  padding: 7px 10px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #92400E;

  .hint-icon {
    color: #F59E0B;
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 13px;
  }
}

// 提示滑入动画
.hint-slide-enter-active,
.hint-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.hint-slide-enter-from,
.hint-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

// 登录按钮
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  letter-spacing: 2px;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;

  &:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.45);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
  }
}

// ── 版权信息 ─────────────────────────────────────────────────
.copyright {
  text-align: center;
  font-size: 11px;
  color: #B0BEC5;
  margin-top: 24px;
  letter-spacing: 0.3px;
}

// ── 小屏幕适配 ───────────────────────────────────────────────
@media (max-width: 480px) {
  .login-card {
    width: calc(100vw - 32px);
    padding: 36px 24px 28px;
  }
}
</style>
