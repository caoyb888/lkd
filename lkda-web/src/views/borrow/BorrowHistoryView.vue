<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BorrowApi } from '@/api/borrow'
import type { BorrowVO } from '@/types/vo'
import type { BorrowHistoryQueryDTO } from '@/api/borrow'
import { useAuthStore } from '@/stores/auth'
import { fmtDate, fmtDateTime } from '@/utils/date'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import { useViewMode } from '@/composables/useViewMode'

const auth = useAuthStore()
const isAdmin = computed(() => auth.isAdmin)

// ─── 视图模式 ────────────────────────────────────────────────────────────────

const viewMode = useViewMode('borrow_history')

// ─── 搜索条件 ────────────────────────────────────────────────────────────────

const keyword  = ref('')
const status   = ref<number | ''>('')
const dateRange = ref<[string, string] | null>(null)

const query = computed<BorrowHistoryQueryDTO>(() => ({
  keyword:  keyword.value  || undefined,
  status:   status.value !== '' ? (status.value as number) : undefined,
  dateFrom: dateRange.value?.[0] || undefined,
  dateTo:   dateRange.value?.[1] || undefined,
  current:  currentPage.value,
  size:     pageSize.value,
}))

// ─── 分页 & 列表 ─────────────────────────────────────────────────────────────

const loading     = ref(false)
const list        = ref<BorrowVO[]>([])
const total       = ref(0)
const currentPage = ref(1)
const pageSize    = ref(15)

async function fetchList() {
  loading.value = true
  try {
    const api = isAdmin.value ? BorrowApi.allHistoryPage : BorrowApi.deptHistoryPage
    const res = await api(query.value)
    list.value  = res.records
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchList()
}

function handleReset() {
  keyword.value   = ''
  status.value    = ''
  dateRange.value = null
  handleSearch()
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchList()
}

onMounted(fetchList)

// ─── 逾期工具（使用后端计算的 remainingDays）────────────────────────────────

function isOverdue(row: BorrowVO): boolean {
  return row.status === 4 || (row.status === 1 && (row.remainingDays ?? 0) < 0)
}

function overdueDaysLabel(row: BorrowVO): string {
  if (row.status === 4) {
    const days = row.remainingDays != null ? Math.abs(row.remainingDays) : 0
    return days > 0 ? `${days} 天` : '—'
  }
  if (row.status === 1 && (row.remainingDays ?? 0) < 0) {
    return `${Math.abs(row.remainingDays!)} 天`
  }
  return '—'
}

function rowClassName({ row }: { row: BorrowVO }) {
  if (isOverdue(row))   return 'row-overdue'
  if (row.status === 3) return 'row-returned'
  if (row.status === 2) return 'row-rejected'
  return ''
}

function returnIsOverdue(row: BorrowVO | null): boolean {
  if (!row) return false
  return isOverdue(row)
}

function returnOverdueDaysCount(row: BorrowVO | null): number {
  if (!row || row.remainingDays == null) return 0
  return Math.abs(row.remainingDays)
}

// ─── 状态选项 ─────────────────────────────────────────────────────────────────

const statusOptions = [
  { value: 0, label: '待审批' },
  { value: 1, label: '已借出' },
  { value: 2, label: '已驳回' },
  { value: 3, label: '已归还' },
  { value: 4, label: '逾期未还' },
]

// ─── 登记归还 ─────────────────────────────────────────────────────────────────

const returnDialogVisible = ref(false)
const returnRow           = ref<BorrowVO | null>(null)
const returnNote          = ref('')
const returning           = ref(false)

function openReturn(row: BorrowVO) {
  returnRow.value  = row
  returnNote.value = ''
  returnDialogVisible.value = true
}

async function handleReturn() {
  if (!returnRow.value) return
  returning.value = true
  try {
    await BorrowApi.adminReturn(returnRow.value.borrowId, returnNote.value || undefined)
    ElMessage.success('已登记归还')
    returnDialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error('操作失败，请重试')
  } finally {
    returning.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="借阅历史记录" subtitle="查看档案借阅与归还记录" />

    <!-- 非管理员范围提示 -->
    <el-alert
      v-if="!isAdmin"
      class="scope-notice"
      type="info"
      :closable="false"
      show-icon
    >
      当前显示的是<strong>本部门</strong>借阅历史记录
    </el-alert>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="档号 / 借阅人 模糊搜索"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="status"
          placeholder="借阅状态"
          clearable
          style="width: 140px"
        >
          <el-option
            v-for="opt in statusOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-date-picker
          v-if="isAdmin"
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="借出日期起"
          end-placeholder="借出日期止"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
        <div class="search-spacer" />
        <ViewModeToggle v-model="viewMode" />
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table
        v-if="viewMode === 'table'"
        v-loading="loading"
        :data="list"
        :row-class-name="rowClassName"
        stripe
        style="width: 100%"
        max-height="calc(100vh - 300px)"
      >
        <el-table-column prop="archiveNo" label="档号" min-width="170" show-overflow-tooltip />
        <el-table-column prop="volumeTitle" label="档案题名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="borrowerName" label="借阅人" width="100" />
        <el-table-column v-if="isAdmin" prop="borrowerDept" label="部门" width="130" show-overflow-tooltip />
        <el-table-column label="借出时间" width="120">
          <template #default="{ row }">{{ fmtDate(row.borrowDate) }}</template>
        </el-table-column>
        <el-table-column label="计划归还" width="120">
          <template #default="{ row }">
            <span :class="{ 'overdue-date': isOverdue(row) }">
              {{ fmtDate(row.planReturnDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="归还时间" width="120">
          <template #default="{ row }">
            {{ fmtDate(row.actualReturnDate) }}
          </template>
        </el-table-column>
        <el-table-column label="逾期天数" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'overdue-days': overdueDaysLabel(row) !== '—' }">
              {{ overdueDaysLabel(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140" align="center">
          <template #default="{ row }">
            <StatusTag
              type="borrow"
              :value="(row.status === 1 && (row.remainingDays ?? 0) < 0) ? 4 : row.status"
              :remain-days="row.status === 1 ? (row.remainingDays ?? undefined) : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column v-if="isAdmin" label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 1 || row.status === 4"
              type="primary"
              link
              @click="openReturn(row)"
            >
              登记归还
            </el-button>
            <span v-else class="no-action">—</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else v-loading="loading" class="card-view">
        <EmptyState
          v-if="!loading && list.length === 0"
          description="暂无借阅历史记录"
        />

        <div class="card-grid">
          <div
            v-for="row in list"
            :key="row.borrowId"
            class="archive-card"
          >
            <div class="archive-card-icon-wrap">
              <el-icon class="archive-card-icon"><Suitcase /></el-icon>
            </div>
            <div class="archive-card-body">
              <div class="archive-card-no">{{ row.archiveNo }}</div>
              <div class="archive-card-title" :title="row.volumeTitle">
                {{ row.volumeTitle }}
              </div>
              <div class="archive-card-meta">
                <span class="meta-text">{{ row.borrowerName }}</span>
                <span v-if="isAdmin" class="meta-text">{{ row.borrowerDept }}</span>
              </div>
              <div class="archive-card-meta">
                <span class="meta-text">借出 {{ fmtDate(row.borrowDate) }}</span>
                <span class="meta-text" :class="{ 'overdue-date': isOverdue(row) }">
                  计划归还 {{ fmtDate(row.planReturnDate) }}
                </span>
              </div>
            </div>
            <div class="archive-card-footer">
              <StatusTag
                type="borrow"
                :value="(row.status === 1 && (row.remainingDays ?? 0) < 0) ? 4 : row.status"
                :remain-days="row.status === 1 ? (row.remainingDays ?? undefined) : undefined"
              />
              <el-button
                v-if="isAdmin && (row.status === 1 || row.status === 4)"
                type="primary"
                link
                @click.stop="openReturn(row)"
              >
                登记归还
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 登记归还 Dialog -->
    <el-dialog
      v-model="returnDialogVisible"
      title="登记归还"
      width="520px"
      :close-on-click-modal="false"
      draggable
    >
      <template v-if="returnRow">
        <!-- 摘要卡片 -->
        <div class="return-summary">
          <div class="summary-row">
            <span class="summary-label">档号</span>
            <span class="summary-value mono">{{ returnRow.archiveNo }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">档案题名</span>
            <span class="summary-value">{{ returnRow.volumeTitle }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">借阅人</span>
            <span class="summary-value">{{ returnRow.borrowerName }}（{{ returnRow.borrowerDept }}）</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">借阅份数</span>
            <span class="summary-value">{{ returnRow.applyCount ?? 1 }} 份</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">计划归还</span>
            <span class="summary-value" :class="{ 'overdue-date': returnIsOverdue(returnRow) }">
              {{ fmtDate(returnRow.planReturnDate) }}
              <span v-if="returnIsOverdue(returnRow)" class="overdue-badge">
                已逾期 {{ returnOverdueDaysCount(returnRow) }} 天
              </span>
            </span>
          </div>
        </div>

        <!-- 逾期警告 -->
        <el-alert
          v-if="returnIsOverdue(returnRow)"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        >
          该档案已逾期 <strong>{{ returnOverdueDaysCount(returnRow) }}</strong> 天未归还，请督促相关人员及时办理。
        </el-alert>

        <!-- 归还备注 -->
        <el-form label-position="top">
          <el-form-item label="归还备注（可选）">
            <el-input
              v-model="returnNote"
              type="textarea"
              :rows="3"
              placeholder="如有损毁说明或其他备注，请在此填写…"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="returning"
          @click="handleReturn"
        >
          确认归还
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.scope-notice {
  margin-bottom: 16px;
}

.search-card {
  margin-bottom: 16px;

  .search-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  @media (max-width: 768px) {
    .search-bar > * { width: 100%; }
  }
}

.table-card {
  .pagination-bar {
    display: flex;
    justify-content: flex-end;
    padding-top: 20px;
  }
}

.search-spacer { flex: 1; }

// ─── 卡片视图 ──────────────────────────────────────────────────────────────

.card-view {
  min-height: 200px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.archive-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-card);
  padding: 16px;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 15%, transparent);
    transform: translateY(-2px);
  }
}

.archive-card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.archive-card-icon {
  font-size: 22px;
  color: $color-primary-dark;
}

.archive-card-body {
  flex: 1;
  min-width: 0;
}

.archive-card-no {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 4px;
  font-family: monospace;
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-card-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.archive-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.meta-text {
  font-size: 12px;
  color: $color-text-body;
}

.archive-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid #F1F5F9;
  flex-wrap: wrap;
}

.overdue-date {
  color: #DC2626;
  font-weight: 600;
}

.overdue-days {
  color: #DC2626;
  font-weight: 600;
}

.no-action {
  color: #CBD5E1;
  font-size: 13px;
}

// ─── 行样式 ──────────────────────────────────────────────────────────────────

:deep(.row-overdue) {
  td {
    background-color: #FFF5F5 !important;
  }
}

:deep(.row-returned) {
  opacity: 0.75;
}

:deep(.row-rejected) {
  opacity: 0.55;
}

// ─── 归还摘要卡片 ──────────────────────────────────────────────────────────────

.return-summary {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.summary-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 13px;
  color: #64748B;
  line-height: 1.6;
}

.summary-value {
  font-size: 14px;
  color: #1E293B;
  line-height: 1.6;
  word-break: break-all;

  &.mono {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--color-primary-dark);
  }
}

.overdue-badge {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #FEE2E2;
  color: #B91C1C;
  font-size: 12px;
  font-weight: 600;
}
</style>
