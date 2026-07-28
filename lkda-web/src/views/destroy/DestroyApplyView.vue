<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { VolumeApi } from '@/api/volume'
import { DestroyApi } from '@/api/destroy'
import type { ArchiveVolumeDetailVO } from '@/types/vo'

const route  = useRoute()
const router = useRouter()

// 从 query 中获取档案标识
const recordId = computed(() => Number(route.query.recordId))
const year     = computed(() => String(route.query.year ?? ''))

// ── 档案信息 ─────────────────────────────────────────────────────
const volumeInfo  = ref<ArchiveVolumeDetailVO | null>(null)
const infoLoading = ref(false)
const infoError   = ref('')

async function loadVolumeInfo() {
  if (!recordId.value || !year.value) {
    infoError.value = '缺少档案标识，请从案卷详情页进入'
    return
  }
  infoLoading.value = true
  infoError.value   = ''
  try {
    volumeInfo.value = await VolumeApi.detail(recordId.value, year.value)
  } catch (e: unknown) {
    const msg = (e as { msg?: string })?.msg
    infoError.value = msg || '未找到该档案，请返回重试'
  } finally {
    infoLoading.value = false
  }
}

onMounted(loadVolumeInfo)

// ── 档案状态标签 ─────────────────────────────────────────────────
const STATUS_META: Record<number, { text: string; bg: string; color: string }> = {
  0:  { text: '草稿',     bg: '#F1F5F9', color: '#64748B' },
  1:  { text: '待审核',   bg: '#FEF9C3', color: '#854D0E' },
  2:  { text: '待确认',   bg: '#DBEAFE', color: '#1D4ED8' },
  3:  { text: '已归档',   bg: 'var(--theme-border-light)', color: '#065F46' },
  10: { text: '销毁待审批', bg: '#EDE9FE', color: '#5B21B6' },
  11: { text: '已销毁',   bg: '#FEE2E2', color: '#991B1B' },
}
const statusMeta = computed(() => {
  if (!volumeInfo.value) return STATUS_META[0]
  if (volumeInfo.value.destroyFlag === 1) return STATUS_META[11]
  return STATUS_META[volumeInfo.value.status] ?? STATUS_META[0]
})

// 是否允许发起销毁（已归档且未销毁）
const canApplyDestroy = computed(() =>
  volumeInfo.value?.status === 3 && volumeInfo.value?.destroyFlag === 0
)

// ── 表单数据 ─────────────────────────────────────────────────────
const formRef = ref<FormInstance>()

const form = ref({
  reason: '',
})

// 文件列表（后端暂不支持上传，仅前端展示/记录）
const fileList = ref<any[]>([])

// 表单校验规则
const rules: FormRules = {
  reason: [
    { required: true, message: '请填写销毁原因', trigger: 'blur' },
    {
      validator: (_rule, value: string, cb) => {
        const len = (value || '').trim().length
        if (len < 20) {
          cb(new Error(`销毁原因至少填写 20 个字（当前 ${len} 字）`))
        } else {
          cb()
        }
      },
      trigger: 'blur',
    },
  ],
}

// ── 提交 ─────────────────────────────────────────────────────────
const submitting = ref(false)

async function handleSubmit() {
  if (!formRef.value || !volumeInfo.value) return
  await formRef.value.validate()

  // 二次确认弹窗
  await ElMessageBox.confirm(
    '此操作将使档案进入销毁审批流程，经领导批准后将无法恢复。确认提交销毁申请？',
    '二次确认',
    {
      type: 'warning',
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    },
  )

  submitting.value = true
  try {
    await DestroyApi.apply(recordId.value, year.value, {
      opinion: form.value.reason.trim(),
    })
    ElMessage.success('销毁申请已提交，等待领导审批')
    router.push('/volume/list')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="销毁申请"
      show-back
      :breadcrumbs="[
        { label: '案卷管理', path: '/volume/list' },
        { label: '销毁申请' },
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
            <span class="info-label">编制单位</span>
            <span class="info-value">{{ volumeInfo.compileUnit || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">立卷人</span>
            <span class="info-value">{{ volumeInfo.compiler || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">归档日期</span>
            <span class="info-value">{{ volumeInfo.archiveDate || '—' }}</span>
          </div>
        </div>

        <!-- 非已归档提示 -->
        <el-alert
          v-if="!canApplyDestroy"
          type="error"
          :closable="false"
          show-icon
          class="destroy-alert"
        >
          <template #title>
            该档案当前状态不可发起销毁申请，仅“已正式归档”且未标记销毁的档案可申请销毁。
          </template>
        </el-alert>
      </el-card>

      <!-- ── 销毁申请表单 ─────────────────────────────────────────── -->
      <el-card class="form-card" shadow="never" :class="{ 'is-disabled': !canApplyDestroy }">
        <template #header>
          <div class="card-header">
            <span class="section-bar" />
            <span class="section-title">销毁申请</span>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="apply-form"
          :disabled="!canApplyDestroy"
        >
          <!-- 销毁原因 -->
          <el-form-item label="销毁原因" prop="reason">
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="5"
              placeholder="请详细说明销毁原因（必填，至少 20 个字）"
              maxlength="500"
              show-word-limit
              class="reason-textarea"
            />
          </el-form-item>

          <!-- 销毁依据文件（可选） -->
          <el-form-item label="销毁依据文件（可选）">
            <el-upload
              v-model:file-list="fileList"
              action="#"
              :auto-upload="false"
              :limit="1"
              accept=".pdf"
              class="destroy-uploader"
            >
              <el-button type="primary" plain :disabled="!canApplyDestroy">
                <el-icon><Upload /></el-icon>
                选择文件
              </el-button>
              <template #tip>
                <div class="upload-tip">
                  仅支持 .pdf 格式，文件大小不超过 10MB（当前版本仅作记录，不上传至服务器）
                </div>
              </template>
            </el-upload>
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
          type="danger"
          size="large"
          class="btn-submit"
          :loading="submitting"
          :disabled="!canApplyDestroy"
          @click="handleSubmit"
        >
          <el-icon><Delete /></el-icon>
          提交销毁申请
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
    background: var(--theme-bg-card);
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
  background: linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-light));
  border-radius: 10px;
  border: 1px solid var(--theme-border-medium);
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

.destroy-alert {
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
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent) !important;
    }
  }
}

.reason-textarea {
  width: 100%;

  :deep(.el-textarea__inner) {
    font-size: 13px;
    line-height: 1.7;
    resize: vertical;
  }
}

.destroy-uploader {
  :deep(.el-upload-list__item) {
    border-radius: 8px;
  }
}

.upload-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #94A3B8;
  line-height: 1.5;
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
  background: #DC2626;
  border-color: #DC2626;
  border-radius: var(--radius-btn);
  font-weight: 600;
  min-width: 140px;

  &:not(:disabled):hover {
    background: #B91C1C;
    border-color: #B91C1C;
    transform: translateY(-1px);
  }
}

.el-button { border-radius: var(--radius-btn); }
</style>
