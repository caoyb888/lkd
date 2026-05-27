<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { BorrowApi } from '@/api/borrow'
import type { ArchiveVolumeDetailVO } from '@/types/vo'

const route  = useRoute()
const router = useRouter()

// archiveNo 来自路由参数，可能含点号，Vue Router 已 URL 解码
const archiveNo = computed(() => decodeURIComponent(String(route.params.archiveNo)))

// ── 档案信息 ─────────────────────────────────────────────────────
const volumeInfo  = ref<ArchiveVolumeDetailVO | null>(null)
const infoLoading = ref(false)
const infoError   = ref('')

async function loadVolumeInfo() {
  infoLoading.value = true
  infoError.value   = ''
  try {
    volumeInfo.value = await BorrowApi.getVolumeByArchiveNo(archiveNo.value)
  } catch (e: unknown) {
    const msg = (e as { msg?: string })?.msg
    infoError.value = msg || '未找到该档号对应的档案，请返回重试'
  } finally {
    infoLoading.value = false
  }
}

onMounted(loadVolumeInfo)

// 剩余可借份数
const availableCopies = computed(() => {
  if (!volumeInfo.value) return 0
  return (volumeInfo.value.copies ?? 0) - (volumeInfo.value.borrowedCopies ?? 0)
})

// 是否已借空
const isFullyBorrowed = computed(() => availableCopies.value <= 0)

// ── 表单数据 ─────────────────────────────────────────────────────
const formRef = ref<FormInstance>()

const form = ref({
  applyCount:     1,
  planReturnDate: '',
  reason:         '',
})

// 日期禁用：今天及以前不可选
const disablePastDate = (date: Date) => date.getTime() < Date.now() - 86400000

// 表单校验规则
const rules: FormRules = {
  applyCount: [
    { required: true, message: '请填写申请份数', trigger: 'blur' },
    {
      validator: (_rule, value: number, cb) => {
        if (!Number.isInteger(value) || value < 1) {
          cb(new Error('申请份数最少为 1 份'))
        } else if (value > availableCopies.value) {
          cb(new Error(`申请份数不能超过剩余可借份数（${availableCopies.value} 份）`))
        } else {
          cb()
        }
      },
      trigger: 'change',
    },
  ],
  planReturnDate: [
    { required: true, message: '请选择计划归还日期', trigger: 'change' },
  ],
  reason: [
    { required: true, message: '请填写借阅原因', trigger: 'blur' },
    { min: 5, message: '借阅原因至少填写 5 个字', trigger: 'blur' },
  ],
}

// ── 提交 ─────────────────────────────────────────────────────────
const submitting = ref(false)

async function handleSubmit() {
  if (!formRef.value || !volumeInfo.value) return
  await formRef.value.validate()

  submitting.value = true
  try {
    await BorrowApi.apply({
      archiveNo:      archiveNo.value,
      year:           volumeInfo.value!.year,
      applyCount:     form.value.applyCount,
      planReturnDate: form.value.planReturnDate,
      reason:         form.value.reason.trim(),
    })
    ElMessage.success('借阅申请已提交，等待管理员审批')
    router.push('/borrow/my')
  } finally {
    submitting.value = false
  }
}

// 档案状态标签样式
const STATUS_META: Record<number, { text: string; bg: string; color: string }> = {
  0: { text: '草稿',   bg: '#F1F5F9', color: '#64748B' },
  1: { text: '待审核', bg: '#FEF9C3', color: '#854D0E' },
  2: { text: '待确认', bg: '#DBEAFE', color: '#1D4ED8' },
  3: { text: '已归档', bg: '#D1FAE5', color: '#065F46' },
}
const statusMeta = computed(() =>
  volumeInfo.value ? (STATUS_META[volumeInfo.value.status] ?? STATUS_META[0]) : STATUS_META[0]
)
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="申请借阅"
      show-back
      :breadcrumbs="[
        { label: '借阅管理' },
        { label: '申请借阅' },
      ]"
    />

    <!-- ── 加载中骨架 ────────────────────────────────────────────── -->
    <template v-if="infoLoading">
      <el-card class="info-card" shadow="never">
        <el-skeleton :rows="4" animated />
      </el-card>
      <el-card class="form-card" shadow="never">
        <el-skeleton :rows="6" animated />
      </el-card>
    </template>

    <!-- ── 档案不存在 / 错误 ─────────────────────────────────────── -->
    <el-card v-else-if="infoError" class="info-card" shadow="never">
      <EmptyState :description="infoError" />
      <div class="error-action">
        <el-button @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
    </el-card>

    <template v-else-if="volumeInfo">
      <!-- ── 档案信息卡片（只读）─────────────────────────────────── -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="section-bar" />
            <span class="section-title">档案信息</span>
            <span
              class="status-pill"
              :style="{ background: statusMeta.bg, color: statusMeta.color }"
            >{{ statusMeta.text }}</span>
          </div>
        </template>

        <!-- 档号横幅 -->
        <div class="archive-banner">
          <el-icon class="banner-icon"><DocumentChecked /></el-icon>
          <div class="banner-main">
            <span class="banner-no">{{ volumeInfo.archiveNo }}</span>
            <span class="banner-title">{{ volumeInfo.volumeTitle }}</span>
          </div>
        </div>

        <!-- 关键只读字段 -->
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">年度</span>
            <span class="info-value">{{ volumeInfo.year }} 年</span>
          </div>
          <div class="info-item">
            <span class="info-label">密级</span>
            <span v-if="volumeInfo.securityLevel" class="security-chip">
              {{ volumeInfo.securityLevelLabel || volumeInfo.securityLevel }}
            </span>
            <span v-else class="info-value">—</span>
          </div>
          <div class="info-item">
            <span class="info-label">保管期限</span>
            <span class="info-value">{{ volumeInfo.retentionPeriodLabel || volumeInfo.retentionPeriod || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">总份数</span>
            <span class="info-value">{{ volumeInfo.copies ?? '—' }} 件</span>
          </div>
          <div class="info-item">
            <span class="info-label">已借出份数</span>
            <span class="info-value">{{ volumeInfo.borrowedCopies ?? 0 }} 件</span>
          </div>
          <!-- 剩余可借：醒目展示 -->
          <div class="info-item available-item">
            <span class="info-label">剩余可借</span>
            <span
              class="available-count"
              :class="{ 'is-empty': isFullyBorrowed, 'is-low': availableCopies <= 1 && !isFullyBorrowed }"
            >
              <el-icon v-if="isFullyBorrowed"><CircleClose /></el-icon>
              <el-icon v-else-if="availableCopies <= 1"><Warning /></el-icon>
              <el-icon v-else><CircleCheck /></el-icon>
              {{ isFullyBorrowed ? '已借空' : `${availableCopies} 件可借` }}
            </span>
          </div>
        </div>

        <!-- 已借空提示 -->
        <el-alert
          v-if="isFullyBorrowed"
          type="error"
          :closable="false"
          show-icon
          class="borrow-alert"
        >
          <template #title>
            该档案当前已全部借出（{{ volumeInfo.borrowedCopies }} / {{ volumeInfo.copies }} 件），
            暂无可借份数，请等待归还后再申请。
          </template>
        </el-alert>
      </el-card>

      <!-- ── 借阅申请表单 ─────────────────────────────────────────── -->
      <el-card class="form-card" shadow="never" :class="{ 'is-disabled': isFullyBorrowed }">
        <template #header>
          <div class="card-header">
            <span class="section-bar" />
            <span class="section-title">借阅申请</span>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="apply-form"
          :disabled="isFullyBorrowed"
        >
          <div class="form-row">
            <!-- 申请份数 -->
            <el-form-item label="申请份数" prop="applyCount" class="form-item-narrow">
              <el-input-number
                v-model="form.applyCount"
                :min="1"
                :max="availableCopies"
                :disabled="isFullyBorrowed"
                controls-position="right"
                class="count-input"
              />
              <span class="count-hint">
                最多可借 <strong>{{ availableCopies }}</strong> 件
              </span>
            </el-form-item>

            <!-- 计划归还日期 -->
            <el-form-item label="计划归还日期" prop="planReturnDate" class="form-item-date">
              <el-date-picker
                v-model="form.planReturnDate"
                type="date"
                placeholder="请选择归还日期"
                value-format="YYYY-MM-DD"
                :disabled-date="disablePastDate"
                class="date-picker"
              />
            </el-form-item>
          </div>

          <!-- 借阅原因 -->
          <el-form-item label="借阅原因" prop="reason">
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="4"
              placeholder="请说明借阅用途和目的（必填，至少 5 个字）"
              maxlength="300"
              show-word-limit
              class="reason-textarea"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- ── 底部操作栏 ──────────────────────────────────────────── -->
      <div class="action-bar">
        <el-button size="large" @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          取消
        </el-button>
        <el-button
          type="primary"
          size="large"
          class="btn-submit"
          :loading="submitting"
          :disabled="isFullyBorrowed"
          @click="handleSubmit"
        >
          <el-icon><Promotion /></el-icon>
          提交申请
        </el-button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 780px;
}

// ── 卡片通用 ──────────────────────────────────────────────────────
.info-card,
.form-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__header) {
    padding: 14px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: #FAFFFE;
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }

  :deep(.el-card__body) { padding: 20px; }
}

.form-card.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-bar {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;
  flex: 1;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 12px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
}

// ── 档号横幅 ──────────────────────────────────────────────────────
.archive-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
  border-radius: 10px;
  border: 1px solid #A7F3D0;
  margin-bottom: 18px;
}

.banner-icon {
  font-size: 28px;
  color: $color-primary;
  flex-shrink: 0;
  margin-top: 2px;
}

.banner-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 18px;
  font-weight: 700;
  color: $color-primary-dark;
  letter-spacing: 0.5px;
  word-break: break-all;
}

.banner-title {
  font-size: 15px;
  color: $color-text-title;
  font-weight: 500;
  line-height: 1.4;
}

// ── 只读信息网格 ──────────────────────────────────────────────────
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 16px;

  @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: $color-text-title;
}

.security-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  background: #FFFBEB;
  color: #92400E;
  width: fit-content;
}

// 剩余可借 - 醒目展示
.available-item { grid-column: span 1; }

.available-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  font-weight: 700;
  color: $color-primary-dark;

  .el-icon { font-size: 16px; }

  &.is-empty {
    color: #DC2626;
    .el-icon { color: #DC2626; }
  }

  &.is-low {
    color: #D97706;
    .el-icon { color: #D97706; }
  }
}

.borrow-alert {
  margin-top: 16px;
  border-radius: 8px;

  :deep(.el-alert__title) { font-size: 13px; line-height: 1.5; }
}

.error-action {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

// ── 表单 ──────────────────────────────────────────────────────────
.apply-form {
  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-title;
    padding-bottom: 6px;
    line-height: 1;
  }

  :deep(.el-form-item) { margin-bottom: 20px; }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    border-radius: 8px;

    &:focus-within,
    &:focus {
      box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2) !important;
    }
  }

  :deep(.el-input-number .el-input__wrapper) { border-radius: 8px; }
}

.form-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.form-item-narrow { flex: 0 0 220px; }
.form-item-date   { flex: 1; min-width: 200px; }

.count-input {
  width: 130px;

  :deep(.el-input__inner) {
    font-size: 16px;
    font-weight: 700;
    color: $color-primary-dark;
    text-align: center;
  }
}

.count-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: $color-text-body;

  strong {
    color: $color-primary-dark;
    font-weight: 700;
  }
}

.date-picker { width: 100%; }

.reason-textarea {
  width: 100%;

  :deep(.el-textarea__inner) {
    font-size: 13px;
    line-height: 1.7;
    resize: vertical;
  }
}

// ── 操作栏 ────────────────────────────────────────────────────────
.action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  bottom: 16px;
}

.btn-submit {
  background: $color-primary;
  border-color: $color-primary;
  border-radius: var(--radius-btn);
  font-weight: 600;
  min-width: 120px;

  &:not(:disabled):hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
    transform: translateY(-1px);
  }
}

.el-button { border-radius: var(--radius-btn); }
</style>
