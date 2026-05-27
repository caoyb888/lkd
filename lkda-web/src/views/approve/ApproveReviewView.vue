<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { ApproveApi } from '@/api/approve'
import type { ApproveQueueItemVO } from '@/api/approve'
import type { ArchiveVolumeDetailVO, ApproveLogVO } from '@/types/vo'

const router    = useRouter()
const dictStore = useDictStore()

// ── 年度选项 ─────────────────────────────────────────────────────
const currentYear  = new Date().getFullYear()
const yearOptions  = Array.from({ length: currentYear - 2017 }, (_, i) => String(currentYear - i))

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
    const res = await ApproveApi.reviewPage({
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
const drawerVisible  = ref(false)
const detailLoading  = ref(false)
const logsLoading    = ref(false)
const detail         = ref<ArchiveVolumeDetailVO | null>(null)
const logs           = ref<ApproveLogVO[]>([])
const currentRow     = ref<ApproveQueueItemVO | null>(null)

async function openReview(row: ApproveQueueItemVO) {
  currentRow.value    = row
  detail.value        = null
  logs.value          = []
  opinion.value       = ''
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

// ── 审批操作 ─────────────────────────────────────────────────────
const opinion      = ref('')
const submitting   = ref(false)

function validateOpinion(): boolean {
  if (!opinion.value.trim()) {
    ElMessage.warning('请填写审批意见')
    return false
  }
  return true
}

async function handlePass() {
  if (!validateOpinion() || !currentRow.value) return

  await ElMessageBox.confirm(
    `确认通过「${currentRow.value.volumeTitle}」的归档审核？\n通过后将进入管理员确认环节。`,
    '确认通过',
    {
      type: 'success',
      confirmButtonText: '确认通过',
      cancelButtonText: '取消',
      confirmButtonClass: 'btn-confirm-pass',
    },
  )

  submitting.value = true
  try {
    await ApproveApi.pass(currentRow.value.recordId, currentRow.value.year, { opinion: opinion.value.trim() })
    ElMessage.success('已通过审核，案卷已进入待确认队列')
    drawerVisible.value = false
    loadList()
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (!validateOpinion() || !currentRow.value) return

  await ElMessageBox.confirm(
    `确认驳回「${currentRow.value.volumeTitle}」？\n驳回后案卷将退回草稿状态，立卷人可重新编辑。`,
    '确认驳回',
    {
      type: 'warning',
      confirmButtonText: '确认驳回',
      cancelButtonText: '取消',
    },
  )

  submitting.value = true
  try {
    await ApproveApi.reject(currentRow.value.recordId, currentRow.value.year, { opinion: opinion.value.trim() })
    ElMessage.success('已驳回，案卷已退回草稿状态')
    drawerVisible.value = false
    loadList()
  } finally {
    submitting.value = false
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────
const label = (code: string, value: string) =>
  dictStore.getDictLabel(code, value) || value || '—'

const ACTION_META: Record<string, { text: string; bg: string; color: string }> = {
  PASS:   { text: '通过', bg: '#D1FAE5', color: '#065F46' },
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
  currentRow.value
    ? `审核 · ${currentRow.value.archiveNo}`
    : '审核详情',
)

// 分页处理
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
      title="待审核队列"
      :breadcrumbs="[{ label: '归档审批' }, { label: '待审核队列' }]"
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
      <!-- 统计标题行 -->
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="queue-badge">待审核</span>
          <span class="queue-count">
            共 <strong>{{ total }}</strong> 条待审核案卷
          </span>
        </div>
      </div>

      <!-- Skeleton 加载 -->
      <template v-if="loading">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无待审核案卷，所有案卷均已处理完毕"
      />

      <!-- 表格 -->
      <el-table
        v-else
        :data="tableData"
        row-key="recordId"
        stripe
        class="review-table"
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
            <span
              v-if="row.securityLevel"
              class="security-chip"
            >
              {{ label('security_level', row.securityLevel) }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>

        <el-table-column label="立卷人" prop="compilerName" width="100" />

        <el-table-column label="提交时间" prop="updatedAt" min-width="160" sortable>
          <template #default="{ row }">
            <span class="time-cell">{{ row.updatedAt }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              class="btn-review"
              @click="openReview(row)"
            >
              <el-icon><EditPen /></el-icon>
              审核
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

      <!-- 分页 -->
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
    <!-- 审核侧滑 Drawer                                             -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="780px"
      :destroy-on-close="false"
      class="review-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title-icon">
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
          <div class="archive-banner">
            <el-icon class="banner-icon"><DocumentChecked /></el-icon>
            <span class="banner-no">{{ detail.archiveNo }}</span>
            <StatusTag type="archive" :value="detail.status" class="banner-status" />
          </div>

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
                <span class="info-label">提交时间</span>
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

        <!-- 详情加载中骨架 -->
        <el-skeleton v-else-if="detailLoading" :rows="12" animated />
      </div>

      <!-- ── 审批操作区（Drawer footer 固定底部）──────────────── -->
      <template #footer>
        <div class="approve-action-bar">
          <div class="opinion-wrap">
            <label class="opinion-label">
              审批意见
              <span class="required-star">*</span>
            </label>
            <el-input
              v-model="opinion"
              type="textarea"
              :rows="3"
              placeholder="请填写审批意见（必填）"
              maxlength="500"
              show-word-limit
              class="opinion-textarea"
            />
          </div>
          <div class="action-btns">
            <el-button
              size="large"
              class="btn-reject"
              :loading="submitting"
              @click="handleReject"
            >
              <el-icon><CircleClose /></el-icon>
              驳回
            </el-button>
            <el-button
              type="primary"
              size="large"
              class="btn-pass"
              :loading="submitting"
              @click="handlePass"
            >
              <el-icon><CircleCheck /></el-icon>
              通过
            </el-button>
          </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
// ── 页面容器 ──────────────────────────────────────────────────────
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// ── 筛选卡片 ──────────────────────────────────────────────────────
.filter-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) {
    padding: 16px 20px;
  }
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

  :deep(.el-card__body) {
    padding: 0;
  }
}

.skeleton-padding {
  padding: 16px 24px 24px;
}

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
  background: #FEF9C3;
  color: #854D0E;
}

.queue-count {
  font-size: 13px;
  color: $color-text-body;

  strong {
    color: $color-primary-dark;
    font-weight: 700;
  }
}

// 表格样式
.review-table {
  width: 100%;

  :deep(.el-table__row:hover > td) {
    background: #ECFDF5 !important;
  }

  :deep(th.el-table__cell) {
    background: #FAFFFE;
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) {
    padding: 12px 8px;
  }
}

.archive-no-link {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
    text-decoration: underline;
  }
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

.btn-review {
  background: $color-primary;
  border-color: $color-primary;
  border-radius: var(--radius-btn);
  font-weight: 500;
  font-size: 12px;
  padding: 4px 12px;

  &:hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
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

  :deep(.el-pagination.is-background .el-pager li.is-active) {
    background: $color-primary;
    border-color: $color-primary;
  }
}

// ── Drawer ────────────────────────────────────────────────────────
.review-drawer {
  :deep(.el-drawer__header) {
    padding: 0;
    margin-bottom: 0;
    border-bottom: 1px solid #F1F5F9;
  }

  :deep(.el-drawer__body) {
    padding: 0;
    overflow-y: auto;
  }

  :deep(.el-drawer__footer) {
    padding: 0;
    border-top: 1px solid #E2E8F0;
  }
}

.drawer-header {
  padding: 16px 24px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
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
  background: $color-primary;
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

// Drawer 正文
.drawer-body {
  padding: 20px 24px 8px;
  min-height: 400px;
}

// 档号横幅
.archive-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
  border-radius: 10px;
  border: 1px solid #A7F3D0;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 20px;
  color: $color-primary;
  flex-shrink: 0;
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 16px;
  font-weight: 700;
  color: $color-primary-dark;
  letter-spacing: 0.5px;
}

.banner-status {
  margin-left: auto;
}

// 详情分区
.detail-section {
  margin-bottom: 20px;
}

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
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
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

// 信息网格
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 16px;
  background: #FAFFFE;
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

  &.title-val {
    font-size: 14px;
    font-weight: 600;
  }

  &.textarea-val {
    white-space: pre-wrap;
    font-size: 12px;
    color: $color-text-body;
    line-height: 1.7;
  }
}

// 审批历史时间线
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

.log-biz {
  font-size: 12px;
  color: $color-text-body;
  font-weight: 500;
}

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

// ── 审批操作区（fixed footer）─────────────────────────────────────
.approve-action-bar {
  padding: 16px 24px 20px;
  background: #fff;
}

.opinion-wrap {
  margin-bottom: 14px;
}

.opinion-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
  margin-bottom: 8px;
}

.required-star {
  color: #EF4444;
  margin-left: 2px;
}

.opinion-textarea {
  width: 100%;

  :deep(.el-textarea__inner) {
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    resize: vertical;

    &:focus { border-color: $color-primary; box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.15); }
  }
}

.action-btns {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-reject {
  border-color: #FB923C;
  color: #EA580C;
  background: #FFF7ED;
  border-radius: var(--radius-btn);
  font-weight: 600;
  min-width: 100px;

  &:hover {
    background: #FFEDD5;
    border-color: #EA580C;
    color: #C2410C;
    transform: translateY(-1px);
  }
}

.btn-pass {
  background: $color-primary;
  border-color: $color-primary;
  border-radius: var(--radius-btn);
  font-weight: 600;
  min-width: 100px;

  &:hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
    transform: translateY(-1px);
  }
}

.el-button {
  border-radius: var(--radius-btn);
}

// Confirm dialog: 通过按钮样式
:global(.btn-confirm-pass.el-button--primary) {
  background: $color-primary;
  border-color: $color-primary;

  &:hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
  }
}
</style>
