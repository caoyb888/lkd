<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { ApproveApi } from '@/api/approve'
import type { ApproveQueueItemVO } from '@/api/approve'
import type { ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'

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
const tableData = ref<ApproveQueueItemVO[]>([])
const total     = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await ApproveApi.confirmPage({
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

// ── Drawer 状态 ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const detailLoading = ref(false)
const logsLoading   = ref(false)
const detail        = ref<ArchiveVolumeDetailVO | null>(null)
const logs          = ref<ApproveLogVO[]>([])
const currentRow    = ref<ApproveQueueItemVO | null>(null)

async function openDetail(row: ApproveQueueItemVO) {
  currentRow.value    = row
  detail.value        = null
  logs.value          = []
  drawerVisible.value = true

  detailLoading.value = true
  try {
    detail.value = await ApproveApi.detail(row.recordId, row.year)
  } finally {
    detailLoading.value = false
  }

  logsLoading.value = true
  try {
    logs.value = await ApproveApi.logs(row.recordId)
  } catch {
    logs.value = []
  } finally {
    logsLoading.value = false
  }
}

// ── 退回 Dialog ──────────────────────────────────────────────────
const backDialogVisible = ref(false)
const backOpinion       = ref('')
const backSubmitting    = ref(false)

function openBackDialog() {
  backOpinion.value       = ''
  backDialogVisible.value = true
}

async function handleBack() {
  if (!backOpinion.value.trim()) {
    ElMessage.warning('请填写退回原因')
    return
  }
  if (!currentRow.value) return

  backSubmitting.value = true
  try {
    await ApproveApi.back(currentRow.value.recordId, currentRow.value.year, { opinion: backOpinion.value.trim() })
    ElMessage.success('已退回，案卷重新进入待审核队列')
    backDialogVisible.value = false
    drawerVisible.value     = false
    loadList()
  } finally {
    backSubmitting.value = false
  }
}

// ── 确认归档 Dialog ──────────────────────────────────────────────
const confirmDialogVisible = ref(false)
const confirmOpinion       = ref('')
const confirmInput         = ref('')   // 必须输入 "CONFIRM"
const confirmSubmitting    = ref(false)

// 只有输入完全匹配才允许提交
const confirmAllowed = computed(() => confirmInput.value === 'CONFIRM')

function openConfirmDialog() {
  confirmOpinion.value       = ''
  confirmInput.value         = ''
  confirmDialogVisible.value = true
}

async function handleConfirm() {
  if (!confirmAllowed.value) return
  if (!currentRow.value) return

  confirmSubmitting.value = true
  try {
    await ApproveApi.confirm(currentRow.value.recordId, currentRow.value.year, {
      opinion: confirmOpinion.value.trim(),
    })
    ElMessage.success('归档成功！档案已正式归档，全员可查')
    confirmDialogVisible.value = false
    drawerVisible.value        = false
    loadList()
  } finally {
    confirmSubmitting.value = false
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────
const label = (code: string, value: string) =>
  dictStore.getDictLabel(code, value) || value || '—'

const ACTION_META: Record<string, { text: string; bg: string; color: string }> = {
  PASS:   { text: '通过', bg: 'var(--theme-border-light)', color: '#065F46' },
  REJECT: { text: '驳回', bg: '#FEE2E2', color: '#991B1B' },
  BACK:   { text: '退回', bg: '#DBEAFE', color: '#1D4ED8' },
}
const actionMeta = (action: string) =>
  ACTION_META[action] ?? { text: action, bg: '#F1F5F9', color: '#64748B' }

const BIZ_TYPE: Record<number, string> = {
  1: '归档审核',
  2: '归档确认',
  3: '借阅审批',
  4: '销毁审批',
}

const drawerTitle = computed(() =>
  currentRow.value ? `待确认 · ${currentRow.value.archiveNo}` : '档案详情',
)

function handlePageChange(page: number) {
  query.current = page
  loadList()
}

function handleSizeChange(size: number) {
  query.size    = size
  query.current = 1
  loadList()
}

const goDetail = (row: ApproveQueueItemVO) =>
  router.push({ path: `/volume/detail/${row.recordId}`, query: { year: row.year } })
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ───────────────────────────────────────────────── -->
    <PageHeader
      title="待确认队列"
      :breadcrumbs="[{ label: '归档审批' }, { label: '待确认队列' }]"
    />

    <!-- ── 筛选栏 ─────────────────────────────────────────────── -->
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

    <!-- ── 数据表格 ───────────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="queue-badge">待确认</span>
          <span class="queue-count">
            共 <strong>{{ total }}</strong> 条待确认归档案卷
          </span>
        </div>
      </div>

      <template v-if="loading">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无待确认案卷，归档队列已全部处理完毕"
      />

      <el-table
        v-else
        :data="tableData"
        row-key="recordId"
        stripe
        class="confirm-table"
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

        <el-table-column label="立卷人" prop="compilerName" width="100" />

        <el-table-column label="流转时间" prop="updatedAt" min-width="160" sortable>
          <template #default="{ row }">
            <span class="time-cell">{{ row.updatedAt }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="success"
              size="small"
              class="btn-confirm"
              @click="openDetail(row)"
            >
              <el-icon><FolderChecked /></el-icon>
              确认归档
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

    <!-- ─────────────────────────────────────────────────────────── -->
    <!-- 详情侧滑 Drawer                                             -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="780px"
      :destroy-on-close="false"
      class="confirm-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title-icon">
              <el-icon><FolderChecked /></el-icon>
            </span>
            <span class="drawer-title-text">{{ drawerTitle }}</span>
          </div>
          <span v-if="currentRow" class="drawer-sub">{{ currentRow.volumeTitle }}</span>
        </div>
      </template>

      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="detail">
          <!-- 档号横幅 -->
          <div class="archive-banner">
            <el-icon class="banner-icon"><DocumentChecked /></el-icon>
            <span class="banner-no">{{ detail.archiveNo }}</span>
            <StatusTag type="archive" :value="detail.status" class="banner-status" />
          </div>

          <!-- 提示：经检查人审核通过 -->
          <el-alert
            type="info"
            :closable="false"
            show-icon
            class="review-passed-tip"
          >
            <template #title>
              该案卷已通过检查人审核，请仔细核对档案信息后再确认正式归档。确认归档后档案
              <strong>不可修改</strong>，请谨慎操作。
            </template>
          </el-alert>

          <!-- 第一区：分类定位 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar" />
              <span class="section-title">分类定位</span>
            </div>
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
                <span class="info-value">{{ label('category_l1', detail.categoryL1) }}</span>
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
            </div>
          </section>

          <!-- 第二区：案卷描述 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar" />
              <span class="section-title">案卷描述</span>
            </div>
            <div class="info-grid">
              <div class="info-item col-span-3">
                <span class="info-label">案卷题名</span>
                <span class="info-value title-val">{{ detail.volumeTitle }}</span>
              </div>
              <div class="info-item col-span-2">
                <span class="info-label">编制单位</span>
                <span class="info-value">{{ detail.compilingUnit || '—' }}</span>
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
                <span class="info-label">件数</span>
                <span class="info-value">{{ detail.copies ?? '—' }} 件</span>
              </div>
              <div class="info-item">
                <span class="info-label">页数</span>
                <span class="info-value">{{ detail.pageCount ? detail.pageCount + ' 页' : '—' }}</span>
              </div>
            </div>
          </section>

          <!-- 第三区：流程信息 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar" />
              <span class="section-title">流程信息</span>
            </div>
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
                <span class="info-label">流转时间</span>
                <span class="info-value">{{ detail.updatedAt }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建时间</span>
                <span class="info-value">{{ detail.createdAt }}</span>
              </div>
            </div>
          </section>

          <!-- 备考（有内容才显示）-->
          <section v-if="detail.remark || detail.note" class="detail-section">
            <div class="section-header">
              <span class="section-bar" />
              <span class="section-title">备考</span>
            </div>
            <div class="info-grid">
              <div v-if="detail.remark" class="info-item col-span-3">
                <span class="info-label">备考说明</span>
                <span class="info-value textarea-val">{{ detail.remark }}</span>
              </div>
              <div v-if="detail.note" class="info-item col-span-3">
                <span class="info-label">备注</span>
                <span class="info-value textarea-val">{{ detail.note }}</span>
              </div>
            </div>
          </section>

          <!-- 审批历史 -->
          <section class="detail-section">
            <div class="section-header">
              <span class="section-bar" />
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
              class="btn-back"
              :disabled="!detail"
              @click="openBackDialog"
            >
              <el-icon><RefreshLeft /></el-icon>
              退回审核
            </el-button>
            <el-button
              type="success"
              size="large"
              class="btn-archive"
              :disabled="!detail"
              @click="openConfirmDialog"
            >
              <el-icon><FolderChecked /></el-icon>
              确认归档
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- ─────────────────────────────────────────────────────────── -->
    <!-- 退回审核 Dialog                                             -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-dialog
      v-model="backDialogVisible"
      title="退回审核"
      width="480px"
      :close-on-click-modal="false"
      class="back-dialog"
      append-to-body
    >
      <div class="back-dialog-body">
        <div class="back-archive-info" v-if="currentRow">
          <el-icon class="back-info-icon"><Document /></el-icon>
          <div class="back-info-text">
            <span class="back-info-no">{{ currentRow.archiveNo }}</span>
            <span class="back-info-title">{{ currentRow.volumeTitle }}</span>
          </div>
        </div>

        <el-alert
          type="warning"
          :closable="false"
          show-icon
          class="back-warning"
        >
          <template #title>退回后案卷将重新进入检查人审核队列，立卷人将收到退回通知。</template>
        </el-alert>

        <div class="form-group">
          <label class="form-label">
            退回原因
            <span class="required-star">*</span>
          </label>
          <el-input
            v-model="backOpinion"
            type="textarea"
            :rows="4"
            placeholder="请说明退回原因，立卷人可据此修改后重新提交"
            maxlength="500"
            show-word-limit
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="backDialogVisible = false">取消</el-button>
        <el-button
          type="warning"
          class="btn-back-submit"
          :loading="backSubmitting"
          @click="handleBack"
        >
          <el-icon><RefreshLeft /></el-icon>
          确认退回
        </el-button>
      </template>
    </el-dialog>

    <!-- ─────────────────────────────────────────────────────────── -->
    <!-- 确认归档 Dialog（高危，需输入 CONFIRM）                     -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认归档"
      width="540px"
      :close-on-click-modal="false"
      class="archive-confirm-dialog"
      append-to-body
    >
      <div class="archive-confirm-body">
        <!-- 档案摘要 -->
        <div class="summary-card" v-if="detail">
          <div class="summary-row">
            <span class="summary-label">档号</span>
            <span class="summary-no">{{ detail.archiveNo }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">题名</span>
            <span class="summary-value">{{ detail.volumeTitle }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">年度</span>
            <span class="summary-value">{{ detail.year }} 年</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">密级</span>
            <span v-if="detail.securityLevel" class="security-chip">
              {{ detail.securityLevelLabel || detail.securityLevel }}
            </span>
            <span v-else class="summary-value">—</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">保管期限</span>
            <span class="summary-value">{{ detail.retentionPeriodLabel || detail.retentionPeriod || '—' }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">件数</span>
            <span class="summary-value">{{ detail.copies ?? '—' }} 件</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">立卷人</span>
            <span class="summary-value">{{ detail.compilerName || '—' }}</span>
          </div>
        </div>

        <!-- 高危警告横幅 -->
        <div class="danger-banner">
          <el-icon class="danger-icon"><WarningFilled /></el-icon>
          <div class="danger-text">
            <strong>此操作不可逆</strong>
            <span>确认归档后，档案状态将变为「已归档」，所有人员均可查阅，且档案内容不可再修改。</span>
          </div>
        </div>

        <!-- 可选：归档确认意见 -->
        <div class="form-group">
          <label class="form-label">归档确认意见（选填）</label>
          <el-input
            v-model="confirmOpinion"
            type="textarea"
            :rows="2"
            placeholder="可填写归档备注，将写入审批日志"
            maxlength="200"
            show-word-limit
          />
        </div>

        <!-- CONFIRM 输入校验 -->
        <div class="confirm-verify">
          <label class="confirm-verify-label">
            请在下方输入 <code class="confirm-code">CONFIRM</code> 以确认执行归档操作
          </label>
          <el-input
            v-model="confirmInput"
            placeholder="请输入 CONFIRM"
            class="confirm-input"
            :class="{ 'input-match': confirmAllowed, 'input-mismatch': confirmInput && !confirmAllowed }"
          />
          <div class="confirm-hint" v-if="confirmInput && !confirmAllowed">
            <el-icon><Warning /></el-icon>
            输入内容不匹配，请完整输入大写 CONFIRM
          </div>
          <div class="confirm-hint confirm-hint--ok" v-if="confirmAllowed">
            <el-icon><CircleCheck /></el-icon>
            验证通过，可以执行归档
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          class="btn-archive-submit"
          :disabled="!confirmAllowed"
          :loading="confirmSubmitting"
          @click="handleConfirm"
        >
          <el-icon><FolderChecked /></el-icon>
          确认归档
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
// ── 页面容器 ──────────────────────────────────────────────────────
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  :deep(.page-header) {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }
}

// ── 筛选卡片 ──────────────────────────────────────────────────────
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

.filter-year    { width: 140px; }
.filter-keyword { flex: 1; min-width: 200px; max-width: 360px; }

@media (max-width: 768px) {
  .filter-year, .filter-keyword { width: 100%; max-width: none; flex: none; }
}

// ── 表格卡片 ──────────────────────────────────────────────────────
.table-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) { padding: 0; }
}

.skeleton-padding { padding: 24px; }

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 8px;
  border-bottom: 1px solid #F1F5F9;
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
}

.queue-count {
  font-size: 13px;
  color: $color-text-body;

  strong { color: #1D4ED8; font-weight: 700; }
}

.confirm-table {
  width: 100%;

  :deep(.el-table__row:hover > td) { background: var(--theme-bg-light) !important; }

  :deep(th.el-table__cell) {
    background: var(--theme-bg-card);
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) { padding: 12px 8px; }
}

.archive-no-link {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1D4ED8;
  cursor: pointer;
  transition: color 0.2s;

  &:hover { color: #1E40AF; text-decoration: underline; }
}

.title-cell {
  font-size: 13px;
  color: $color-text-title;
  font-weight: 500;
}

.time-cell {
  font-size: 12px;
  color: $color-text-body;
}

.security-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
  background: #FFFBEB;
  color: #92400E;
}

.text-muted { color: #CBD5E1; }

.btn-confirm {
  background: #059669;
  border-color: #059669;
  border-radius: var(--radius-btn);
  font-weight: 500;
  font-size: 12px;
  padding: 4px 12px;
  color: #fff;

  &:hover {
    background: #047857;
    border-color: #047857;
    transform: translateY(-1px);
  }
}

.btn-view-link {
  color: $color-text-body;
  font-size: 12px;
  padding: 4px 6px;

  &:hover { color: $color-primary; }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #F1F5F9;
}

// ── Drawer ────────────────────────────────────────────────────────
.confirm-drawer {
  :deep(.el-drawer__header) {
    padding: 0;
    margin-bottom: 0;
    border-bottom: 1px solid #F1F5F9;
  }
  :deep(.el-drawer__body) { padding: 0; overflow-y: auto; }
  :deep(.el-drawer__footer) { padding: 0; border-top: 1px solid #E2E8F0; }
}

.drawer-header {
  padding: 16px 24px;
  background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #2563EB;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}

.drawer-title-text {
  font-size: 16px;
  font-weight: 700;
  color: $color-text-title;
  font-family: 'JetBrains Mono', Consolas, monospace;
  letter-spacing: 0.3px;
}

.drawer-sub {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: $color-text-body;
  padding-left: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-body {
  padding: 20px 24px 8px;
  min-height: 400px;
}

.archive-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
  border-radius: 10px;
  border: 1px solid #93C5FD;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 20px;
  color: #2563EB;
  flex-shrink: 0;
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1D4ED8;
  letter-spacing: 0.5px;
}

.banner-status { margin-left: auto; }

.review-passed-tip {
  margin-bottom: 16px;
  border-radius: 8px;

  :deep(.el-alert__title) {
    font-size: 13px;
    line-height: 1.5;
    font-weight: 400;
  }
}

// 详情分区
.detail-section { margin-bottom: 20px; }

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-bar {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #2563EB, #1D4ED8);
  flex-shrink: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

.log-badge {
  margin-left: auto;
  border-radius: var(--radius-tag);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 16px;
  background: var(--theme-bg-card);
  border-radius: 10px;
  border: 1px solid #F1F5F9;
  padding: 14px 16px;

  @media (max-width: 720px) { grid-template-columns: repeat(2, 1fr); }
}

.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }

.info-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.info-label {
  font-size: 11px;
  color: #94A3B8;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 13px;
  color: $color-text-title;
  line-height: 1.5;

  &.title-val { font-size: 14px; font-weight: 600; }
  &.textarea-val {
    white-space: pre-wrap;
    font-size: 12px;
    color: $color-text-body;
    line-height: 1.7;
  }
}

// 审批历史
.log-timeline {
  padding: 4px 0 4px 4px;

  :deep(.el-timeline-item__tail) { border-left-color: #E2E8F0; }
  :deep(.el-timeline-item__timestamp) { font-size: 11px; color: #94A3B8; }
}

.log-card {
  background: #fff;
  border: 1px solid #F1F5F9;
  border-radius: 8px;
  padding: 10px 14px;
}

.log-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-biz { font-size: 12px; color: $color-text-body; font-weight: 500; }

.log-action-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
}

.log-approver {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: $color-text-title;
  font-weight: 500;
  margin-left: auto;

  .el-icon { font-size: 12px; color: #94A3B8; }
}

.log-opinion {
  margin: 6px 0 0;
  font-size: 12px;
  color: $color-text-body;
  line-height: 1.6;
  padding: 6px 10px;
  background: #F8FAFC;
  border-radius: 6px;
  white-space: pre-wrap;
}

// ── Drawer 底部 ───────────────────────────────────────────────────
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.btn-back {
  border-color: #FB923C;
  color: #EA580C;
  background: #FFF7ED;
  border-radius: var(--radius-btn);
  font-weight: 600;

  &:hover {
    background: #FFEDD5;
    border-color: #EA580C;
    color: #C2410C;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-archive {
  background: #059669;
  border-color: #059669;
  border-radius: var(--radius-btn);
  font-weight: 600;

  &:hover {
    background: #047857;
    border-color: #047857;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
}

// ── 退回 Dialog ───────────────────────────────────────────────────
.back-dialog {
  :deep(.el-dialog__header) { padding: 20px 24px 12px; }
  :deep(.el-dialog__body)   { padding: 0 24px 12px; }
  :deep(.el-dialog__footer) { padding: 12px 24px 20px; }
}

.back-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.back-archive-info {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background: #F8FAFC;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
}

.back-info-icon {
  font-size: 20px;
  color: #64748B;
  flex-shrink: 0;
  margin-top: 2px;
}

.back-info-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.back-info-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1D4ED8;
}

.back-info-title {
  font-size: 13px;
  color: $color-text-title;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.back-warning {
  border-radius: 8px;

  :deep(.el-alert__title) { font-size: 13px; font-weight: 400; }
}

.btn-back-submit {
  border-radius: var(--radius-btn);
  font-weight: 600;
}

// ── 确认归档 Dialog ───────────────────────────────────────────────
.archive-confirm-dialog {
  :deep(.el-dialog__header) { padding: 20px 24px 12px; }
  :deep(.el-dialog__body)   { padding: 0 24px 12px; }
  :deep(.el-dialog__footer) { padding: 12px 24px 20px; }
}

.archive-confirm-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// 档案摘要卡片
.summary-card {
  background: #F0FDF4;
  border: 1px solid var(--theme-border-medium);
  border-radius: 10px;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.summary-row {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:first-child {
    grid-column: span 2;
  }
}

.summary-label {
  font-size: 11px;
  color: #4D7C6F;
  font-weight: 500;
}

.summary-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 15px;
  font-weight: 700;
  color: #065F46;
}

.summary-value {
  font-size: 13px;
  color: $color-text-title;
}

// 高危警告横幅
.danger-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #FFF1F2;
  border: 1px solid #FECDD3;
  border-radius: 10px;
}

.danger-icon {
  font-size: 20px;
  color: #E11D48;
  flex-shrink: 0;
  margin-top: 1px;
}

.danger-text {
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    font-size: 13px;
    color: #BE123C;
    font-weight: 700;
  }

  span {
    font-size: 12px;
    color: #9F1239;
    line-height: 1.5;
  }
}

// 表单组
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

.required-star {
  color: #EF4444;
  margin-left: 2px;
}

// CONFIRM 输入验证区
.confirm-verify {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: #FFF8F1;
  border: 1px dashed #FED7AA;
  border-radius: 10px;
}

.confirm-verify-label {
  font-size: 13px;
  color: $color-text-title;
  line-height: 1.6;
}

.confirm-code {
  display: inline;
  padding: 1px 6px;
  border-radius: 4px;
  background: #1E293B;
  color: var(--theme-bg-soft);
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
}

.confirm-input {
  :deep(.el-input__wrapper) {
    border-radius: 8px;
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 1px;
    transition: box-shadow 0.2s;
  }

  &.input-match :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.35) !important;
    border-color: #059669 !important;
  }

  &.input-mismatch :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.2) !important;
  }
}

.confirm-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #E11D48;

  &--ok { color: #059669; }

  .el-icon { font-size: 13px; }
}

.btn-archive-submit {
  border-radius: var(--radius-btn);
  font-weight: 600;
  background: #DC2626;
  border-color: #DC2626;
  color: #fff;

  &:not(:disabled):hover {
    background: #B91C1C;
    border-color: #B91C1C;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.el-button { border-radius: var(--radius-btn); }
</style>
