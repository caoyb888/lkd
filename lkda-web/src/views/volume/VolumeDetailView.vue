<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { useAuthStore } from '@/stores/auth'
import { VolumeApi } from '@/api/volume'
import type { ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'

const route     = useRoute()
const router    = useRouter()
const dictStore = useDictStore()
const authStore = useAuthStore()

const recordId = computed(() => Number(route.params.id))
const year = computed(() => String(route.query.year ?? ''))

// ── 数据 ─────────────────────────────────────────────────────────
const detail   = ref<ArchiveVolumeDetailVO | null>(null)
const logs     = ref<ApproveLogVO[]>([])
const loading  = ref(false)
const logLoading = ref(false)

async function loadDetail() {
  if (!year.value) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    detail.value = await VolumeApi.detail(recordId.value, year.value)
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  if (!year.value) return
  logLoading.value = true
  try {
    logs.value = await VolumeApi.approveLogs(recordId.value)
  } catch {
    logs.value = []
  } finally {
    logLoading.value = false
  }
}

onMounted(() => {
  loadDetail()
  loadLogs()
})

// ── 权限判断 ─────────────────────────────────────────────────────
const isAdmin  = computed(() => authStore.isAdmin)
const isLeader = computed(() => authStore.isLeader)
const userId   = computed(() => authStore.userInfo?.userId)

// 立卷人本人 或 管理员
const isCompilerOrAdmin = computed(() =>
  isAdmin.value || (detail.value?.compilerId != null && detail.value.compilerId === userId.value)
)

// 操作栏显隐逻辑
const showEdit        = computed(() => detail.value?.status === 0 && isCompilerOrAdmin.value)
const showSubmit      = computed(() => detail.value?.status === 0 && isCompilerOrAdmin.value)
const showBorrow      = computed(() =>
  detail.value?.status === 3
  && detail.value.inStock === 1
  && (detail.value.borrowedCopies ?? 0) < (detail.value.copies ?? 1)
  && !isAdmin.value
  && !isLeader.value
)
const showPrint       = computed(() => (detail.value?.status ?? 0) >= 1)
const showDestroy     = computed(() =>
  detail.value?.status === 3
  && detail.value.destroyFlag === 0
  && isAdmin.value
)

// ── 状态时间线 ───────────────────────────────────────────────────
const STEPS = [
  { label: '草稿',   icon: 'Edit' },
  { label: '待审核', icon: 'Clock' },
  { label: '待确认', icon: 'UserFilled' },
  { label: '已归档', icon: 'FolderChecked' },
]

// el-steps 的 active 值（0-indexed）
const stepsActive = computed(() => {
  if (!detail.value) return 0
  return Math.min(detail.value.status, 3)
})

// ── 字典 label 工具 ──────────────────────────────────────────────
const label = (code: string, value: string) => dictStore.getDictLabel(code, value) || value || '—'

// ── 提交审核 ─────────────────────────────────────────────────────
const activeTab = ref('location')
const submitting = ref(false)
async function handleSubmit() {
  await ElMessageBox.confirm(
    '提交审核后，案卷将进入待审核状态，不可再编辑，确认提交？',
    '确认提交审核',
    { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' },
  )
  submitting.value = true
  try {
    await VolumeApi.submit(recordId.value, detail.value!.year)
    ElMessage.success('已提交审核')
    await loadDetail()
    loadLogs()
  } finally {
    submitting.value = false
  }
}

// ── 导航 ─────────────────────────────────────────────────────────
const goEdit    = () => router.push({ path: `/volume/edit/${recordId.value}`, query: { year: detail.value?.year } })
const goFiles   = () => router.push({ path: `/file/list/${recordId.value}`, query: { year: detail.value?.year } })
const goPrint   = () => router.push({ path: `/print/preview/${recordId.value}`, query: { year: detail.value?.year } })
const goBorrow  = () => router.push(`/borrow/apply/${detail.value?.archiveNo}`)
const goDestroy = () => router.push({
  path: '/destroy/apply',
  query: {
    recordId: String(recordId.value),
    year: year.value,
  },
})

// ── 审批动作样式 ─────────────────────────────────────────────────
const ACTION_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PASS:   { label: '通过', bg: '#D1FAE5', color: '#065F46' },
  REJECT: { label: '驳回', bg: '#FEE2E2', color: '#991B1B' },
  BACK:   { label: '退回', bg: '#DBEAFE', color: '#1D4ED8' },
}
const actionStyle = (action: string) =>
  ACTION_STYLE[action] ?? { label: action, bg: '#F1F5F9', color: '#64748B' }

// ── 业务类型 ─────────────────────────────────────────────────────
const BIZ_TYPE: Record<number, string> = {
  1: '归档审核',
  2: '归档确认',
  3: '借阅审批',
  4: '销毁审批',
}

// ── 档案状态总览 ─────────────────────────────────────────────────
const STATUS_META: Record<number, { text: string; bg: string; color: string }> = {
  0:  { text: '草稿',      bg: '#F1F5F9', color: '#64748B' },
  1:  { text: '待审核',    bg: '#FEF9C3', color: '#854D0E' },
  2:  { text: '待确认',    bg: '#DBEAFE', color: '#1D4ED8' },
  3:  { text: '已归档',    bg: '#D1FAE5', color: '#065F46' },
  10: { text: '销毁待审批',bg: '#EDE9FE', color: '#5B21B6' },
  11: { text: '已销毁',    bg: '#FEE2E2', color: '#991B1B' },
}
const statusMeta = computed(() => {
  if (!detail.value) return STATUS_META[0]
  if (detail.value.destroyFlag === 1) return STATUS_META[11]
  if (detail.value.pendingDestroy === 1) return STATUS_META[10]
  return STATUS_META[detail.value.status] ?? STATUS_META[0]
})
</script>

<template>
  <div class="page-container" v-loading="loading">
    <!-- ── 页头 ──────────────────────────────────────────────────── -->
    <div class="detail-header">
      <PageHeader
        title="案卷详情"
        show-back
        :breadcrumbs="[
          { label: '案卷管理', path: '/volume/list' },
          { label: '案卷详情' },
        ]"
      />
      <span
        v-if="detail"
        class="status-pill"
        :style="{ color: statusMeta.color, background: statusMeta.bg }"
      >{{ statusMeta.text }}</span>
    </div>

    <template v-if="detail">
      <!-- ── 状态时间线 ──────────────────────────────────────────── -->
      <el-card class="timeline-card" shadow="never">
        <el-steps :active="stepsActive" align-center finish-status="success">
          <el-step
            v-for="(step, idx) in STEPS"
            :key="step.label"
            :title="step.label"
            :status="idx < stepsActive ? 'success' : idx === stepsActive ? 'process' : 'wait'"
          />
        </el-steps>

        <!-- 档号大标题 -->
        <div class="archive-no-banner">
          <el-icon class="banner-icon"><DocumentChecked /></el-icon>
          <span class="banner-no">{{ detail.archiveNo }}</span>
          <span class="banner-title">{{ detail.volumeTitle }}</span>
        </div>
      </el-card>

      <!-- ── Tab 页签内容区 ─────────────────────────────────────── -->
      <el-card class="tabs-card" shadow="never">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <!-- 分类定位 -->
          <el-tab-pane label="分类定位" name="location">
            <div class="tab-pane-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">全宗号</span>
                  <span class="info-value">{{ label('fonds_no', detail.fondsNo) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">年度</span>
                  <span class="info-value">{{ detail.year }} 年</span>
                </div>
                <div class="info-item">
                  <span class="info-label">一级类目</span>
                  <span class="info-value">{{ detail.categoryL1Label || label('category_l1', detail.categoryL1) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">二级类目</span>
                  <span class="info-value">{{ detail.categoryL2 ? label('category_l2', detail.categoryL2) : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">三级类目</span>
                  <span class="info-value">{{ detail.categoryL3 ? label('category_l3', detail.categoryL3) : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">设备代号</span>
                  <span class="info-value">{{ detail.equipmentCode ? label('equipment_code', detail.equipmentCode) : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">案卷号</span>
                  <span class="info-value mono">{{ detail.volumeNo || '—' }}</span>
                </div>
                <div class="info-item col-span-4">
                  <span class="info-label">档号</span>
                  <span class="info-value mono highlight">{{ detail.archiveNo }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 案卷描述 -->
          <el-tab-pane label="案卷描述" name="description">
            <div class="tab-pane-body">
              <div class="info-grid">
                <div class="info-item col-span-4">
                  <span class="info-label">案卷题名</span>
                  <span class="info-value title-value">{{ detail.volumeTitle }}</span>
                </div>
                <div class="info-item col-span-2">
                  <span class="info-label">编制单位</span>
                  <span class="info-value">{{ detail.compilingUnit || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">密级</span>
                  <span class="security-chip" v-if="detail.securityLevel">
                    {{ detail.securityLevelLabel || detail.securityLevel }}
                  </span>
                  <span class="info-value" v-else>—</span>
                </div>
                <div class="info-item">
                  <span class="info-label">保管期限</span>
                  <span class="info-value">{{ detail.retentionPeriodLabel || detail.retentionPeriod || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">件数</span>
                  <span class="info-value">{{ detail.copies ?? '—' }} 件</span>
                </div>
                <div class="info-item">
                  <span class="info-label">页数</span>
                  <span class="info-value">{{ detail.pageCount ? detail.pageCount + ' 页' : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">在库状态</span>
                  <StatusTag type="stock" :value="detail.inStock" />
                </div>
                <div class="info-item">
                  <span class="info-label">已借出份数</span>
                  <span class="info-value">
                    {{ detail.borrowedCopies ?? 0 }} / {{ detail.copies ?? 1 }} 份
                  </span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 流程信息 -->
          <el-tab-pane label="流程信息" name="flow">
            <div class="tab-pane-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">立卷人</span>
                  <span class="info-value">{{ detail.compilerName || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">立卷日期</span>
                  <span class="info-value">{{ detail.compileDate || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">审核人</span>
                  <span class="info-value">{{ detail.reviewerName || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">归档日期</span>
                  <span class="info-value">{{ detail.archiveDate || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">创建时间</span>
                  <span class="info-value">{{ detail.createdAt }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">最后更新</span>
                  <span class="info-value">{{ detail.updatedAt }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 备考 -->
          <el-tab-pane
            v-if="detail.remark || detail.note"
            label="备考"
            name="notes"
          >
            <div class="tab-pane-body">
              <div class="info-grid">
                <div v-if="detail.remark" class="info-item col-span-4">
                  <span class="info-label">备考说明</span>
                  <span class="info-value textarea-value">{{ detail.remark }}</span>
                </div>
                <div v-if="detail.note" class="info-item col-span-4">
                  <span class="info-label">备注</span>
                  <span class="info-value textarea-value">{{ detail.note }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 审批历史 -->
          <el-tab-pane label="审批历史" name="history">
            <div class="tab-pane-body">
              <EmptyState
                v-if="!logLoading && logs.length === 0"
                description="暂无审批记录"
              />

              <el-timeline v-else v-loading="logLoading">
                <el-timeline-item
                  v-for="log in logs"
                  :key="log.logId"
                  :timestamp="log.createdAt"
                  placement="top"
                  :color="ACTION_STYLE[log.action]?.color ?? '#94A3B8'"
                >
                  <el-card class="log-card" shadow="never">
                    <div class="log-header">
                      <span class="log-biz">{{ BIZ_TYPE[log.businessType] ?? '审批' }}</span>
                      <span
                        class="log-action-chip"
                        :style="{
                          background: actionStyle(log.action).bg,
                          color:      actionStyle(log.action).color,
                        }"
                      >{{ actionStyle(log.action).label }}</span>
                      <span class="log-approver">
                        <el-icon><UserFilled /></el-icon>
                        {{ log.approverName }}
                      </span>
                    </div>
                    <p v-if="log.opinion" class="log-opinion">{{ log.opinion }}</p>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 加载骨架 -->
    <template v-else-if="!loading">
      <EmptyState description="未找到该案卷，请返回列表重新选择" />
    </template>

    <!-- ── 操作栏（固定底部）────────────────────────────────────── -->
    <div v-if="detail" class="action-bar">
      <el-button size="large" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>

      <div class="action-right">
        <!-- 编辑（草稿 & 立卷人/管理员） -->
        <el-button
          v-if="showEdit"
          size="large"
          class="btn-edit"
          @click="goEdit"
        >
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>

        <!-- 提交审核（草稿 & 立卷人/管理员） -->
        <el-button
          v-if="showSubmit"
          type="warning"
          size="large"
          :loading="submitting"
          @click="handleSubmit"
        >
          <el-icon><Promotion /></el-icon>
          提交审核
        </el-button>

        <!-- 申请借阅（已归档 & 在库 & 普通用户） -->
        <el-button
          v-if="showBorrow"
          type="primary"
          size="large"
          @click="goBorrow"
        >
          <el-icon><Suitcase /></el-icon>
          申请借阅
        </el-button>

        <!-- 卷内文件目录（始终可访问） -->
        <el-button
          v-if="detail"
          size="large"
          class="btn-files"
          @click="goFiles"
        >
          <el-icon><Files /></el-icon>
          卷内文件目录
        </el-button>

        <!-- 打印（已提交后均可） -->
        <el-button
          v-if="showPrint"
          size="large"
          class="btn-print"
          @click="goPrint"
        >
          <el-icon><Printer /></el-icon>
          打印
        </el-button>

        <!-- 申请销毁（已归档 & 管理员） -->
        <el-button
          v-if="showDestroy"
          type="danger"
          size="large"
          plain
          @click="goDestroy"
        >
          <el-icon><Delete /></el-icon>
          申请销毁
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1400px;
  overflow-y: auto;
}

// ── 页头行 ────────────────────────────────────────────────────────
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  :deep(.page-header) {
    flex: 1;
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 14px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

// ── 状态时间线卡片 ────────────────────────────────────────────────
.timeline-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) {
    padding: 24px 32px 20px;
  }

  :deep(.el-step__title) {
    font-size: 13px;
    font-weight: 500;
  }

  :deep(.el-step__head.is-success .el-step__icon) {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;
  }

  :deep(.el-step__head.is-process .el-step__icon) {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;
  }

  :deep(.el-step__title.is-success) {
    color: $color-primary-dark;
  }

  :deep(.el-step__title.is-process) {
    color: $color-primary;
    font-weight: 600;
  }
}

.archive-no-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
  border-radius: 10px;
  border: 1px solid #A7F3D0;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 22px;
  color: $color-primary;
  flex-shrink: 0;
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 18px;
  font-weight: 700;
  color: $color-primary-dark;
  letter-spacing: 0.5px;
  word-break: break-all;
  line-height: 1.4;
}

.banner-title {
  font-size: 15px;
  color: $color-text-title;
  font-weight: 500;
  padding-left: 12px;
  border-left: 2px solid #A7F3D0;
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  word-break: break-all;
}

// ── Tab 卡片 ──────────────────────────────────────────────────────
.tabs-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) {
    padding: 0;
  }
}

.detail-tabs {
  :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 20px;
    background: #FAFFFE;
    border-bottom: 1px solid #F1F5F9;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #F1F5F9;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
    font-weight: 500;
    color: #64748B;
    padding: 0 20px;
    height: 48px;
    line-height: 48px;
    transition: all 0.2s ease;

    &:hover {
      color: $color-primary;
    }

    &.is-active {
      color: $color-primary;
      font-weight: 600;
    }
  }

  :deep(.el-tabs__active-bar) {
    background-color: $color-primary;
    height: 3px;
    border-radius: 2px 2px 0 0;
  }

  :deep(.el-tabs__content) {
    padding: 0;
  }
}

.tab-pane-body {
  padding: 20px;
}

// ── 信息卡片（兼容旧样式）──────────────────────────────────────────
.info-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__header) {
    padding: 14px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: #FAFFFE;
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-dot {
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
}

.log-count {
  margin-left: auto;
  border-radius: var(--radius-tag);
}

// ── 信息网格 ──────────────────────────────────────────────────────
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px 16px;

  @media (max-width: 1200px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 960px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }

@media (max-width: 1200px) {
  .col-span-2 { grid-column: span 2; }
  .col-span-3 { grid-column: span 3; }
  .col-span-4 { grid-column: span 3; }
}
@media (max-width: 960px) {
  .col-span-2,
  .col-span-3,
  .col-span-4 { grid-column: span 2; }
}
@media (max-width: 600px) {
  .col-span-2,
  .col-span-3,
  .col-span-4 { grid-column: span 1; }
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
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 14px;
  color: $color-text-title;
  font-weight: 400;
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: break-word;

  &.mono {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 13px;
    letter-spacing: 0.3px;
  }

  &.highlight {
    color: $color-primary-dark;
    font-weight: 600;
    font-size: 14px;
  }

  &.title-value {
    font-size: 15px;
    font-weight: 600;
    color: $color-text-title;
  }

  &.textarea-value {
    white-space: pre-wrap;
    color: $color-text-body;
    font-size: 13px;
    line-height: 1.7;
    word-break: break-all;
    overflow-wrap: break-word;
    max-height: 300px;
    overflow-y: auto;
  }
}

.security-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  background: #FFFBEB;
  color: #92400E;
  width: fit-content;
}

// ── 审批历史 ──────────────────────────────────────────────────────
.log-card {
  border-radius: 10px;
  border: 1px solid #F1F5F9;

  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.log-biz {
  font-size: 13px;
  color: $color-text-body;
  font-weight: 500;
}

.log-action-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
}

.log-approver {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: $color-text-title;
  font-weight: 500;
  margin-left: auto;

  .el-icon {
    font-size: 13px;
    color: #94A3B8;
  }
}

.log-opinion {
  margin-top: 8px;
  font-size: 13px;
  color: $color-text-body;
  line-height: 1.6;
  padding: 8px 12px;
  background: #F8FAFC;
  border-radius: 6px;
  white-space: pre-wrap;
}

:deep(.el-timeline-item__tail) {
  border-left-color: #E2E8F0;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #94A3B8;
}

// ── 操作栏（sticky 底部）─────────────────────────────────────────
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px;
  background: #fff;
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  bottom: 16px;
  flex-wrap: wrap;
}

.action-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.btn-edit {
  border-color: $color-primary;
  color: $color-primary;
  background: #F0FDFA;

  &:hover {
    background: #CCFBF1;
    border-color: $color-primary-dark;
    color: $color-primary-dark;
  }
}

.btn-files {
  border-color: $color-primary;
  color: $color-primary;
  background: #F0FDFA;

  &:hover {
    background: #CCFBF1;
    border-color: $color-primary-dark;
    color: $color-primary-dark;
  }
}

.btn-print {
  border-color: #CBD5E1;
  color: $color-text-body;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: #F0FDFA;
  }
}

.el-button {
  border-radius: var(--radius-btn);
  font-weight: 500;
}
</style>
