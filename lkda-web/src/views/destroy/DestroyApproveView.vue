<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { DestroyApi } from '@/api/destroy'
import type { ArchiveVolumeListVO, ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'

const router    = useRouter()
const dictStore = useDictStore()

// ── 年度选项 ─────────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: currentYear - 2017 }, (_, i) => String(currentYear - i))

// ── 查询参数 ─────────────────────────────────────────────────────
const query = reactive({
  year:    undefined as string | undefined,
  keyword: '',
  current: 1,
  size:    20,
})

// ── 列表数据 ─────────────────────────────────────────────────────
const loading   = ref(false)
const tableData = ref<ArchiveVolumeListVO[]>([])
const total     = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await DestroyApi.pendingPage({
      ...query,
      keyword: query.keyword || undefined,
    })
    tableData.value = res.records
    total.value     = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.current = 1
  loadList()
}

function handleReset() {
  query.year    = undefined
  query.keyword = ''
  query.current = 1
  loadList()
}

onMounted(loadList)

function handlePageChange(page: number) {
  query.current = page
  loadList()
}

function handleSizeChange(size: number) {
  query.size    = size
  query.current = 1
  loadList()
}

// ── Drawer 状态 ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const detailLoading = ref(false)
const logsLoading   = ref(false)
const detail        = ref<ArchiveVolumeDetailVO | null>(null)
const logs          = ref<ApproveLogVO[]>([])
const currentRow    = ref<ArchiveVolumeListVO | null>(null)

async function openDetail(row: ArchiveVolumeListVO) {
  currentRow.value    = row
  detail.value        = null
  logs.value          = []
  drawerVisible.value = true

  detailLoading.value = true
  try {
    detail.value = await DestroyApi.detail(row.recordId, row.year)
  } finally {
    detailLoading.value = false
  }

  logsLoading.value = true
  try {
    logs.value = await DestroyApi.logs(row.recordId)
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

// ── 驳回 Dialog ──────────────────────────────────────────────────
const rejectDialogVisible = ref(false)
const rejectOpinion       = ref('')
const rejectSubmitting    = ref(false)

function openRejectDialog() {
  rejectOpinion.value       = ''
  rejectDialogVisible.value = true
}

async function handleReject() {
  if (!rejectOpinion.value.trim()) {
    ElMessage.warning('请填写驳回意见')
    return
  }
  if (!currentRow.value) return

  rejectSubmitting.value = true
  try {
    await DestroyApi.reject(currentRow.value.recordId, currentRow.value.year, {
      opinion: rejectOpinion.value.trim(),
    })
    ElMessage.success('已驳回销毁申请，档案恢复正常已归档状态')
    rejectDialogVisible.value = false
    drawerVisible.value       = false
    loadList()
  } finally {
    rejectSubmitting.value = false
  }
}

// ── 批准销毁 Dialog ──────────────────────────────────────────────
const approveDialogVisible = ref(false)
const approveOpinion       = ref('')
const approveInput         = ref('')
const approveSubmitting    = ref(false)

const approveAllowed = computed(() => approveInput.value === '批准销毁')

function openApproveDialog() {
  approveOpinion.value       = ''
  approveInput.value         = ''
  approveDialogVisible.value = true
}

async function handleApprove() {
  if (!approveAllowed.value) return
  if (!currentRow.value) return

  approveSubmitting.value = true
  try {
    await DestroyApi.approve(currentRow.value.recordId, currentRow.value.year, {
      opinion: approveOpinion.value.trim(),
    })
    ElMessage.success('销毁审批已通过，该案卷已标记销毁')
    approveDialogVisible.value = false
    drawerVisible.value        = false
    loadList()
  } finally {
    approveSubmitting.value = false
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────
const label = (code: string, value: string) =>
  dictStore.getDictLabel(code, value) || value || '—'

const ACTION_META: Record<string, { text: string; bg: string; color: string }> = {
  PASS:   { text: '通过',  bg: '#D1FAE5', color: '#065F46' },
  REJECT: { text: '驳回',  bg: '#FEE2E2', color: '#991B1B' },
  BACK:   { text: '退回',  bg: '#DBEAFE', color: '#1D4ED8' },
  APPLY:  { text: '申请',  bg: '#EDE9FE', color: '#5B21B6' },
}
const actionMeta = (action: string) =>
  ACTION_META[action] ?? { text: action, bg: '#F1F5F9', color: '#64748B' }

const BIZ_TYPE: Record<number, string> = {
  1: '归档审核',
  2: '归档确认',
  3: '销毁审批',
  4: '借阅审批',
}

const drawerTitle = computed(() =>
  currentRow.value ? `销毁审批 · ${currentRow.value.archiveNo}` : '审批详情',
)

const goDetail = (row: ArchiveVolumeListVO) =>
  router.push({ path: `/volume/detail/${row.recordId}`, query: { year: row.year } })
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ─────────────────────────────────────────────────── -->
    <PageHeader
      title="销毁审批"
      :breadcrumbs="[{ label: '销毁审批' }, { label: '待审批队列' }]"
    />

    <!-- ── 筛选栏 ───────────────────────────────────────────────── -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-select
          v-model="query.year"
          placeholder="按年度筛选"
          clearable
          class="filter-year"
          @change="handleSearch"
        >
          <el-option
            v-for="y in yearOptions"
            :key="y"
            :label="`${y} 年`"
            :value="y"
          />
        </el-select>

        <el-input
          v-model="query.keyword"
          placeholder="搜索档号或案卷题名"
          clearable
          class="filter-keyword"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ─────────────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="queue-badge destroy">待销毁审批</span>
          <span class="queue-count">
            共 <strong>{{ total }}</strong> 条待销毁审批案卷
          </span>
        </div>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无待销毁审批案卷"
      />

      <el-table
        v-else
        :data="tableData"
        row-key="recordId"
        stripe
        class="destroy-table"
        max-height="calc(100vh - 300px)"
      >
        <el-table-column label="档号" prop="archiveNo" min-width="170" fixed>
          <template #default="{ row }">
            <span class="archive-no-link" @click="goDetail(row)">
              {{ row.archiveNo }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="案卷题名" prop="volumeTitle" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="title-cell">{{ row.volumeTitle }}</span>
          </template>
        </el-table-column>

        <el-table-column label="年度" prop="year" width="88">
          <template #default="{ row }">{{ row.year }} 年</template>
        </el-table-column>

        <el-table-column label="一级类目" width="120">
          <template #default="{ row }">
            {{ label('category_l1', row.categoryL1) }}
          </template>
        </el-table-column>

        <el-table-column label="密级" width="90">
          <template #default="{ row }">
            <span v-if="row.securityLevel" class="security-chip">
              {{ label('security_level', row.securityLevel) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <el-table-column label="立卷人" prop="compiler" width="100" />

        <el-table-column label="申请时间" prop="updatedAt" min-width="160" sortable>
          <template #default="{ row }">
            <span class="time-cell">{{ row.updatedAt }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              class="btn-destroy"
              @click="openDetail(row)"
            >
              <el-icon><Stamp /></el-icon>
              审批
            </el-button>
            <el-button
              link
              size="small"
              class="btn-view-link"
              @click="goDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- ── 详情侧滑 Drawer ──────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="780px"
      :destroy-on-close="false"
      class="destroy-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title-icon destroy-icon">
              <el-icon><Stamp /></el-icon>
            </span>
            <span class="drawer-title-text">{{ drawerTitle }}</span>
          </div>
          <span v-if="currentRow" class="drawer-sub">{{ currentRow.volumeTitle }}</span>
        </div>
      </template>

      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="detail">
          <!-- 档号横幅 -->
          <div class="archive-banner destroy-banner">
            <el-icon class="banner-icon"><DocumentChecked /></el-icon>
            <span class="banner-no">{{ detail.archiveNo }}</span>
            <StatusTag type="archive" :value="10" class="banner-status" />
          </div>

          <!-- 高危警告 -->
          <el-alert
            type="error"
            :closable="false"
            show-icon
            class="destroy-danger-tip"
          >
            <template #title>
              该案卷已进入销毁审批流程。批准销毁后，档案将<strong>永久标记销毁</strong>，
              在日常检索、借阅界面均不可见，且<strong>不可恢复</strong>，请审慎决策。
            </template>
          </el-alert>

          <!-- 销毁申请信息 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar destroy-bar" />
              <span class="section-title">销毁申请信息</span>
            </div>
            <div class="info-grid">
              <div class="info-item col-span-2">
                <span class="info-label">案卷题名</span>
                <span class="info-value title-val">{{ detail.volumeTitle }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">年度</span>
                <span class="info-value">{{ detail.year }} 年</span>
              </div>
              <div class="info-item">
                <span class="info-label">密级</span>
                <span v-if="detail.securityLevel" class="security-chip">
                  {{ label('security_level', detail.securityLevel) }}
                </span>
                <span v-else class="info-value">—</span>
              </div>
              <div class="info-item">
                <span class="info-label">保管期限</span>
                <span class="info-value">{{ detail.retentionPeriodLabel || detail.retentionPeriod || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">编制单位</span>
                <span class="info-value">{{ detail.compilingUnit || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">立卷人</span>
                <span class="info-value">{{ detail.compilerName || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">归档日期</span>
                <span class="info-value">{{ detail.archiveDate || '—' }}</span>
              </div>
            </div>
          </section>

          <!-- 审批历史 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar destroy-bar" />
              <span class="section-title">审批历史</span>
              <el-tag size="small" type="info" class="log-badge">
                {{ logs.length }} 条记录
              </el-tag>
            </div>

            <EmptyState
              v-if="!logsLoading && logs.length === 0"
              description="暂无审批记录"
            />

            <el-timeline v-else v-loading="logsLoading" class="log-timeline">
              <el-timeline-item
                v-for="log in logs"
                :key="log.logId"
                :timestamp="log.createdAt"
                placement="top"
                :color="ACTION_META[log.action]?.color ?? '#94A3B8'"
              >
                <div class="log-card">
                  <div class="log-card-header">
                    <span class="log-biz">{{ BIZ_TYPE[log.businessType] ?? '审批' }}</span>
                    <span
                      class="log-action-chip"
                      :style="{
                        background: actionMeta(log.action).bg,
                        color:      actionMeta(log.action).color,
                      }"
                    >{{ actionMeta(log.action).text }}</span>
                    <span class="log-approver">
                      <el-icon><UserFilled /></el-icon>
                      {{ log.approverName }}
                    </span>
                  </div>
                  <p v-if="log.opinion" class="log-opinion">{{ log.opinion }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </section>
        </template>

        <el-skeleton v-else-if="detailLoading" :rows="12" animated />
      </div>

      <!-- ── Drawer 底部操作栏 ──────────────────────────────────── -->
      <template #footer>
        <div class="drawer-footer">
          <el-button size="large" @click="drawerVisible = false">关闭</el-button>
          <div class="footer-actions">
            <el-button
              size="large"
              class="btn-reject"
              :disabled="!detail"
              @click="openRejectDialog"
            >
              <el-icon><CircleClose /></el-icon>
              驳回
            </el-button>
            <el-button
              type="danger"
              size="large"
              class="btn-destroy-approve"
              :disabled="!detail"
              @click="openApproveDialog"
            >
              <el-icon><Delete /></el-icon>
              批准销毁
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- ── 驳回 Dialog ──────────────────────────────────────────── -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回销毁申请"
      width="480px"
      :close-on-click-modal="false"
      class="reject-dialog"
      append-to-body
    >
      <div class="dialog-body">
        <div class="archive-info" v-if="currentRow">
          <el-icon class="info-icon"><Document /></el-icon>
          <div class="info-text">
            <div class="info-no">{{ currentRow.archiveNo }}</div>
            <div class="info-title">{{ currentRow.volumeTitle }}</div>
          </div>
        </div>
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          class="dialog-alert"
        >
          <template #title>驳回后，该案卷将恢复为正常已归档状态，可从列表中继续查阅。</template>
        </el-alert>
        <el-form label-position="top">
          <el-form-item label="驳回意见" required>
            <el-input
              v-model="rejectOpinion"
              type="textarea"
              :rows="4"
              placeholder="请填写驳回原因（必填）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button
          type="warning"
          :loading="rejectSubmitting"
          @click="handleReject"
        >
          确认驳回
        </el-button>
      </template>
    </el-dialog>

    <!-- ── 批准销毁 Dialog ──────────────────────────────────────── -->
    <el-dialog
      v-model="approveDialogVisible"
      title="批准销毁"
      width="540px"
      :close-on-click-modal="false"
      class="approve-dialog"
      append-to-body
    >
      <div class="dialog-body">
        <div class="archive-info danger" v-if="currentRow">
          <el-icon class="info-icon"><Document /></el-icon>
          <div class="info-text">
            <div class="info-no">{{ currentRow.archiveNo }}</div>
            <div class="info-title">{{ currentRow.volumeTitle }}</div>
          </div>
        </div>
        <div class="danger-banner">
          <el-icon><Warning /></el-icon>
          <span>此操作不可逆，批准销毁后档案将被永久标记销毁，无法恢复。</span>
        </div>
        <el-form label-position="top">
          <el-form-item label="审批意见（可选）">
            <el-input
              v-model="approveOpinion"
              type="textarea"
              :rows="3"
              placeholder="请填写审批意见"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="安全验证" required>
            <el-input
              v-model="approveInput"
              placeholder='请输入"批准销毁"以确认操作'
              clearable
            />
            <span class="verify-hint">请在上方输入 <strong>批准销毁</strong> 四个字以确认</span>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          :disabled="!approveAllowed"
          :loading="approveSubmitting"
          @click="handleApprove"
        >
          确认批准销毁
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// ── 筛选栏 ────────────────────────────────────────────────────────
.filter-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) { padding: 12px 20px; }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-year   { width: 140px; }
.filter-keyword { width: 280px; }

@media (max-width: 768px) {
  .filter-year, .filter-keyword { width: 100%; max-width: none; flex: none; }
}

// ── 表格卡片 ──────────────────────────────────────────────────────
.table-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) { padding: 16px 20px 20px; }
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  background: #DBEAFE;
  color: #1D4ED8;

  &.destroy {
    background: #FEE2E2;
    color: #991B1B;
  }
}

.queue-count {
  font-size: 13px;
  color: $color-text-body;

  strong {
    color: $color-text-title;
    font-weight: 700;
  }
}

.skeleton-padding { padding: 12px 0; }

// ── 表格 ──────────────────────────────────────────────────────────
.destroy-table {
  :deep(.el-table__header) {
    th {
      background: #FAFFFE;
      font-weight: 600;
      color: $color-text-title;
      border-bottom: 2px solid #E2E8F0;
    }
  }

  :deep(.el-table__row:hover > td) {
    background-color: #ECFDF5 !important;
  }

  :deep(td) { padding: 12px 8px; }
}

.archive-no-link {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  color: $color-primary-dark;
  font-weight: 600;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.title-cell {
  font-size: 13px;
  color: $color-text-title;
  font-weight: 500;
}

.text-muted {
  font-size: 13px;
  color: #94A3B8;
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
}

.time-cell {
  font-size: 12px;
  color: #64748B;
}

.btn-destroy {
  background: #FEE2E2;
  border-color: #FECACA;
  color: #DC2626;

  &:hover {
    background: #FECACA;
    border-color: #FCA5A5;
    color: #B91C1C;
  }
}

.btn-view-link {
  color: $color-primary;

  &:hover { color: $color-primary-dark; }
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

// ── Drawer ────────────────────────────────────────────────────────
.destroy-drawer {
  :deep(.el-drawer__header) {
    margin-bottom: 0;
    padding: 0;
  }
}

.drawer-header {
  padding: 16px 24px;
  background: linear-gradient(135deg, #FFF1F2, #FECDD3);
  border-bottom: 1px solid #FECACA;
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-title-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #DC2626;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.drawer-title-text {
  font-size: 16px;
  font-weight: 700;
  color: $color-text-title;
  font-family: 'JetBrains Mono', Consolas, monospace;
}

.drawer-sub {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #7F1D1D;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// ── 档号横幅 ──────────────────────────────────────────────────────
.archive-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
  border-radius: 10px;
  border: 1px solid #A7F3D0;
  flex-wrap: wrap;

  &.destroy-banner {
    background: linear-gradient(135deg, #FFF1F2, #FECDD3);
    border-color: #FECACA;
  }
}

.banner-icon {
  font-size: 22px;
  color: $color-primary;
  flex-shrink: 0;

  .destroy-banner & { color: #DC2626; }
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 18px;
  font-weight: 700;
  color: $color-primary-dark;

  .destroy-banner & { color: #991B1B; }
}

.banner-status { flex-shrink: 0; margin-left: auto; }

// ── 高危提示 ──────────────────────────────────────────────────────
.destroy-danger-tip {
  border-radius: 8px;

  :deep(.el-alert__title) {
    font-size: 13px;
    line-height: 1.6;
    font-weight: 500;
  }
}

// ── 详情分区 ──────────────────────────────────────────────────────
.detail-section {
  background: #FAFFFE;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #E2E8F0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-bar {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
  flex-shrink: 0;

  &.destroy-bar {
    background: linear-gradient(180deg, #DC2626, #991B1B);
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;
  flex: 1;
}

.log-badge {
  margin-left: auto;
  border-radius: var(--radius-tag);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 16px;

  @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); }
}

.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }

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
  font-size: 13px;
  color: $color-text-title;

  &.title-val {
    font-size: 14px;
    font-weight: 600;
  }
}

// ── 审批历史时间线 ────────────────────────────────────────────────
.log-timeline {
  :deep(.el-timeline-item__tail) { border-left-color: #E2E8F0; }
  :deep(.el-timeline-item__timestamp) {
    font-size: 12px;
    color: #94A3B8;
  }
}

.log-card {
  background: #fff;
  border: 1px solid #F1F5F9;
  border-radius: 10px;
  padding: 12px 16px;
}

.log-card-header {
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

  .el-icon { font-size: 13px; color: #94A3B8; }
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

// ── Drawer 底部操作栏 ────────────────────────────────────────────
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #F1F5F9;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn-reject {
  border-color: #FB923C;
  color: #FB923C;
  background: #FFF7ED;

  &:hover {
    background: #FFEDD5;
    border-color: #F97316;
    color: #EA580C;
  }
}

.btn-destroy-approve {
  background: #DC2626;
  border-color: #DC2626;
  font-weight: 600;

  &:not(:disabled):hover {
    background: #B91C1C;
    border-color: #B91C1C;
  }
}

// ── Dialog 通用 ───────────────────────────────────────────────────
.dialog-body {
  padding: 8px 4px;
}

.archive-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #F0FDFA;
  border-radius: 10px;
  border: 1px solid #A7F3D0;
  margin-bottom: 14px;

  &.danger {
    background: #FFF1F2;
    border-color: #FECACA;
  }
}

.info-icon {
  font-size: 22px;
  color: $color-primary;
  flex-shrink: 0;
  margin-top: 2px;

  .danger & { color: #DC2626; }
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 14px;
  font-weight: 700;
  color: $color-primary-dark;

  .danger & { color: #991B1B; }
}

.info-title {
  font-size: 13px;
  color: $color-text-title;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-alert {
  margin-bottom: 14px;
  border-radius: 8px;

  :deep(.el-alert__title) { font-size: 13px; line-height: 1.5; }
}

.danger-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #FEE2E2;
  border-radius: 8px;
  margin-bottom: 14px;
  color: #991B1B;
  font-size: 13px;
  font-weight: 500;

  .el-icon { font-size: 16px; flex-shrink: 0; }
}

.verify-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #94A3B8;

  strong { color: #DC2626; font-weight: 600; }
}

.el-button { border-radius: var(--radius-btn); }
</style>
