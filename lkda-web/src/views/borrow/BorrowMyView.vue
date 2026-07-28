<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BorrowApi } from '@/api/borrow'
import type { BorrowVO } from '@/types/vo'
import { fmtDate, fmtDateTime } from '@/utils/date'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import { useViewMode } from '@/composables/useViewMode'

const router = useRouter()

// ── 视图模式 ─────────────────────────────────────────────────────
const viewMode = useViewMode('borrow_my')

// ── 状态筛选选项 ─────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { label: '待审批', value: 0 },
  { label: '已借出', value: 1 },
  { label: '已驳回', value: 2 },
  { label: '已归还', value: 3 },
  { label: '逾期未还', value: 4 },
]

// ── 查询参数 ─────────────────────────────────────────────────────
const query = reactive({
  status:  undefined as number | undefined,
  current: 1,
  size:    20,
})

// ── 列表数据 ─────────────────────────────────────────────────────
const loading   = ref(false)
const tableData = ref<BorrowVO[]>([])
const total     = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await BorrowApi.myPage({
      status:  query.status,
      current: query.current,
      size:    query.size,
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
  query.status  = undefined
  query.current = 1
  loadList()
}

onMounted(loadList)

// 从后端 remainingDays 获取剩余天数（正值=剩余，负值=已逾期）
function getRemainDays(row: BorrowVO): number {
  return row.remainingDays ?? 999
}

// ── 行样式：已驳回行灰化 + 已归还行减弱 ─────────────────────────
function rowClassName({ row }: { row: BorrowVO }) {
  if (row.status === 2) return 'row-rejected'
  if (row.status === 3) return 'row-returned'
  return ''
}

// ── 借阅详情 Drawer ──────────────────────────────────────────────
const drawerVisible = ref(false)
const currentBorrow = ref<BorrowVO | null>(null)

function openDetail(row: BorrowVO) {
  currentBorrow.value = row
  drawerVisible.value = true
}

// Drawer 标题
const drawerTitle = computed(() =>
  currentBorrow.value ? `借阅详情 · ${currentBorrow.value.archiveNo}` : '借阅详情',
)

// 当前记录的剩余天数（从后端 remainingDays 取）
const currentRemainDays = computed(() =>
  currentBorrow.value?.remainingDays ?? 0,
)

// ── 审批结果样式 ─────────────────────────────────────────────────
interface OpinionStyle { text: string; bg: string; color: string; icon: string }

const OPINION_MAP: Record<number, OpinionStyle> = {
  0: { text: '待审批中', bg: '#F8FAFC', color: '#64748B', icon: 'Clock' },
  1: { text: '已批准',   bg: 'var(--theme-bg-soft)', color: '#065F46', icon: 'CircleCheck' },
  2: { text: '已驳回',   bg: '#FFF1F2', color: '#BE123C', icon: 'CircleClose' },
  3: { text: '已归还',   bg: '#F0FDF4', color: '#166534', icon: 'Select' },
  4: { text: '已逾期',   bg: '#FFF1F2', color: '#B91C1C', icon: 'Warning' },
}
const opinionStyle = computed<OpinionStyle>(() =>
  currentBorrow.value ? (OPINION_MAP[currentBorrow.value.status] ?? OPINION_MAP[0]) : OPINION_MAP[0],
)

// ── 分页 ─────────────────────────────────────────────────────────
function handlePageChange(page: number) {
  query.current = page
  loadList()
}
function handleSizeChange(size: number) {
  query.size    = size
  query.current = 1
  loadList()
}

// 跳转申请借阅（从详情页打开后可继续申请其他档案）
const goApply = () => router.push('/volume/list')
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="我的借阅申请"
      :breadcrumbs="[{ label: '借阅管理' }, { label: '我的借阅申请' }]"
    />

    <!-- ── 筛选栏 ─────────────────────────────────────────────── -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-select
          v-model="query.status"
          placeholder="全部状态"
          clearable
          class="filter-status"
          @change="handleSearch"
        >
          <el-option
            v-for="opt in STATUS_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>

        <div class="filter-spacer" />
        <el-button class="btn-new-apply" @click="goApply">
          <el-icon><Plus /></el-icon>
          去借阅档案
        </el-button>
      </div>
    </el-card>

    <!-- ── 数据表格 ───────────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <span class="total-label">
          共 <strong>{{ total }}</strong> 条借阅记录
        </span>
        <ViewModeToggle v-model="viewMode" />
      </div>

      <!-- 骨架屏 -->
      <template v-if="loading && tableData.length === 0">
        <el-skeleton :rows="7" animated class="skeleton-padding" />
      </template>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无借阅记录，可前往案卷列表申请借阅"
      />

      <!-- 表格 -->
      <el-table
        v-else-if="viewMode === 'table'"
        v-loading="loading"
        :data="tableData"
        row-key="borrowId"
        :row-class-name="rowClassName"
        class="borrow-table"
        max-height="calc(100vh - 300px)"
      >
        <!-- 档号 -->
        <el-table-column label="档号" min-width="165" fixed>
          <template #default="{ row }">
            <span class="archive-no">{{ row.archiveNo }}</span>
          </template>
        </el-table-column>

        <!-- 档案题名 -->
        <el-table-column label="档案题名" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span
              class="title-cell"
              :class="{ 'is-rejected': row.status === 2 }"
            >{{ row.volumeTitle }}</span>
          </template>
        </el-table-column>

        <!-- 申请份数 -->
        <el-table-column label="份数" width="72" align="center">
          <template #default="{ row }">
            <span class="count-cell">{{ row.applyCount }} 件</span>
          </template>
        </el-table-column>

        <!-- 申请时间 -->
        <el-table-column label="申请时间" min-width="155">
          <template #default="{ row }">
            <span class="time-cell">{{ fmtDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <!-- 计划归还日期 -->
        <el-table-column label="计划归还" width="115">
          <template #default="{ row }">
            <span
              class="plan-date"
              :class="{
                'is-urgent':   row.remindLevel === 1,
                'is-overdue':  row.status === 4 || row.remindLevel === 2,
                'is-returned': row.status === 3,
              }"
            >{{ fmtDate(row.planReturnDate) }}</span>
          </template>
        </el-table-column>

        <!-- 状态 -->
        <el-table-column label="状态" width="165" align="center">
          <template #default="{ row }">
            <StatusTag
              type="borrow"
              :value="row.status"
              :remain-days="[1, 4].includes(row.status) ? getRemainDays(row) : undefined"
            />
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              size="small"
              class="btn-detail"
              @click="openDetail(row)"
            >
              <el-icon><View /></el-icon>
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else v-loading="loading" class="card-grid-wrap">
        <div class="card-grid">
          <div
            v-for="row in tableData"
            :key="row.borrowId"
            class="archive-card"
            @click="openDetail(row)"
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
                <span class="meta-text">{{ row.applyCount }} 件</span>
                <span class="meta-text">申请 {{ fmtDateTime(row.createdAt) }}</span>
              </div>
              <div class="archive-card-meta">
                <span
                  class="plan-date"
                  :class="{
                    'is-urgent':   row.remindLevel === 1,
                    'is-overdue':  row.status === 4 || row.remindLevel === 2,
                    'is-returned': row.status === 3,
                  }"
                >计划归还 {{ fmtDate(row.planReturnDate) }}</span>
              </div>
            </div>
            <div class="archive-card-footer">
              <StatusTag
                type="borrow"
                :value="row.status"
                :remain-days="[1, 4].includes(row.status) ? getRemainDays(row) : undefined"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- ─────────────────────────────────────────────────────────── -->
    <!-- 借阅详情 Drawer                                             -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="520px"
      :destroy-on-close="false"
      class="detail-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title-icon">
              <el-icon><Suitcase /></el-icon>
            </span>
            <span class="drawer-title-text">{{ drawerTitle }}</span>
          </div>
          <div v-if="currentBorrow" class="drawer-status-row">
            <StatusTag
              type="borrow"
              :value="currentBorrow.status"
              :remain-days="[1, 4].includes(currentBorrow.status) ? (currentBorrow.remainingDays ?? undefined) : undefined"
            />
          </div>
        </div>
      </template>

      <div v-if="currentBorrow" class="drawer-body">
        <!-- 档案信息 -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">档案信息</span>
          </div>
          <div class="detail-block">
            <div class="detail-row">
              <span class="dl">档号</span>
              <span class="dv dv--mono">{{ currentBorrow.archiveNo }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">档案题名</span>
              <span class="dv">{{ currentBorrow.volumeTitle }}</span>
            </div>
          </div>
        </section>

        <!-- 借阅信息 -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">借阅信息</span>
          </div>
          <div class="detail-block">
            <div class="detail-row">
              <span class="dl">申请份数</span>
              <span class="dv dv--emphasis">{{ currentBorrow.applyCount }} 件</span>
            </div>
            <div class="detail-row">
              <span class="dl">申请时间</span>
              <span class="dv">{{ fmtDateTime(currentBorrow.createdAt) }}</span>
            </div>
            <div v-if="currentBorrow.borrowDate" class="detail-row">
              <span class="dl">借出时间</span>
              <span class="dv">{{ fmtDate(currentBorrow.borrowDate) }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">计划归还</span>
              <span
                class="dv"
                :class="{
                  'dv--warn':   currentBorrow.remindLevel === 1,
                  'dv--danger': currentBorrow.status === 4 || currentBorrow.remindLevel === 2,
                }"
              >
                {{ fmtDate(currentBorrow.planReturnDate) }}
                <span v-if="currentBorrow.status === 1 && currentRemainDays > 0" class="remain-badge">
                  剩余 {{ currentRemainDays }} 天
                </span>
              </span>
            </div>
            <div v-if="currentBorrow.actualReturnDate" class="detail-row">
              <span class="dl">实际归还</span>
              <span class="dv dv--green">{{ fmtDate(currentBorrow.actualReturnDate) }}</span>
            </div>
          </div>
        </section>

        <!-- 借阅原因 -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">借阅原因</span>
          </div>
          <div class="reason-block">
            {{ currentBorrow.reason || '（未填写）' }}
          </div>
        </section>

        <!-- 审批结果 -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">审批结果</span>
          </div>
          <div
            class="approval-block"
            :style="{ background: opinionStyle.bg, borderColor: `${opinionStyle.color}22` }"
          >
            <div class="approval-status">
              <el-icon
                class="approval-icon"
                :style="{ color: opinionStyle.color }"
              >
                <component :is="opinionStyle.icon" />
              </el-icon>
              <span
                class="approval-status-text"
                :style="{ color: opinionStyle.color }"
              >{{ opinionStyle.text }}</span>
            </div>
            <p v-if="currentBorrow.status === 0" class="approval-opinion approval-opinion--muted">
              待管理员审批，请耐心等待
            </p>
          </div>
        </section>

        <!-- 逾期提示 -->
        <el-alert
          v-if="currentBorrow.status === 4 || (currentBorrow.status === 1 && currentRemainDays < 0)"
          type="error"
          :closable="false"
          show-icon
          class="overdue-alert"
        >
          <template #title>
            该借阅已逾期 <strong>{{ Math.abs(currentRemainDays) }}</strong> 天，
            请尽快归还档案，如需延期请联系档案管理员。
          </template>
        </el-alert>

        <!-- 即将到期提示 -->
        <el-alert
          v-else-if="currentBorrow.remindLevel === 1"
          type="warning"
          :closable="false"
          show-icon
          class="overdue-alert"
        >
          <template #title>
            距计划归还日期还有 <strong>{{ currentRemainDays }}</strong> 天，请及时归还档案。
          </template>
        </el-alert>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button size="large" @click="drawerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-drawer>
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
  gap: 10px;
  flex-wrap: wrap;
}

.filter-status  { width: 140px; }
.filter-spacer  { flex: 1; }

@media (max-width: 768px) {
  .filter-status { width: 100%; }
  .filter-spacer { display: none; }
}

.btn-new-apply {
  border-color: $color-primary;
  color: $color-primary;
  background: var(--theme-bg-soft);
  border-radius: var(--radius-btn);
  font-weight: 500;

  &:hover {
    background: var(--theme-bg-lighter);
    border-color: $color-primary-dark;
    color: $color-primary-dark;
  }
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

.total-label {
  font-size: 13px;
  color: $color-text-body;

  strong { color: $color-primary-dark; font-weight: 700; }
}

// ── 表格 ──────────────────────────────────────────────────────────
.borrow-table {
  width: 100%;

  :deep(th.el-table__cell) {
    background: var(--theme-bg-card);
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) { padding: 11px 8px; }

  :deep(.el-table__row:hover > td) { background: var(--theme-bg-light) !important; }

  // 已驳回行：整行灰化
  :deep(.row-rejected) {
    opacity: 0.65;

    td { background: #FAFAFA !important; }

    &:hover > td { background: #F1F5F9 !important; }
  }

  // 已归还行：轻微灰化
  :deep(.row-returned) {
    opacity: 0.8;
  }
}

.archive-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: $color-primary-dark;
}

.title-cell {
  font-size: 13px;
  color: $color-text-title;
  font-weight: 500;

  // 已驳回：题名加删除线
  &.is-rejected {
    text-decoration: line-through;
    color: #94A3B8;
  }
}

.count-cell {
  font-size: 13px;
  color: $color-text-title;
  font-weight: 600;
}

.time-cell {
  font-size: 12px;
  color: $color-text-body;
}

.plan-date {
  font-size: 12px;
  color: $color-text-body;
  font-weight: 500;

  &.is-urgent  { color: #D97706; font-weight: 700; }
  &.is-overdue { color: #DC2626; font-weight: 700; }
  &.is-returned { color: #94A3B8; text-decoration: line-through; }
}

.btn-detail {
  font-size: 12px;
  color: $color-primary;
  padding: 2px 4px;

  &:hover { color: $color-primary-dark; }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid #F1F5F9;

  :deep(.el-pagination.is-background .el-pager li.is-active) {
    background: $color-primary;
    border-color: $color-primary;
  }
}

// ── 卡片视图 ──────────────────────────────────────────────────────
.card-grid-wrap {
  padding: 16px 20px;
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
  cursor: pointer;
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
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid #F1F5F9;
  flex-wrap: wrap;
}

// ── Drawer ────────────────────────────────────────────────────────
.detail-drawer {
  :deep(.el-drawer__header) {
    padding: 0;
    margin-bottom: 0;
    border-bottom: 1px solid #F1F5F9;
  }
  :deep(.el-drawer__body)  { padding: 0; overflow-y: auto; }
  :deep(.el-drawer__footer){ padding: 0; border-top: 1px solid #E2E8F0; }
}

.drawer-header {
  padding: 10px 20px 8px;
  background: linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-light));
}

.drawer-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: $color-primary;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  flex-shrink: 0;
}

.drawer-title-text {
  font-size: 14px;
  font-weight: 700;
  color: $color-text-title;
  font-family: 'JetBrains Mono', Consolas, monospace;
  letter-spacing: 0.3px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-status-row {
  margin-top: 8px;
  padding-left: 38px;
}

// ── Drawer 正文 ───────────────────────────────────────────────────
.drawer-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-section { display: flex; flex-direction: column; gap: 10px; }

.section-header {
  display: flex;
  align-items: center;
  gap: 7px;
}

.section-bar {
  width: 3px;
  height: 15px;
  border-radius: 2px;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
  flex-shrink: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

// 字段网格（竖排）
.detail-block {
  background: var(--theme-bg-card);
  border: 1px solid #F1F5F9;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dl {
  font-size: 12px;
  color: #94A3B8;
  font-weight: 500;
  white-space: nowrap;
  width: 64px;
  flex-shrink: 0;
  padding-top: 1px;
}

.dv {
  font-size: 13px;
  color: $color-text-title;
  flex: 1;
  word-break: break-all;
  line-height: 1.5;

  &--mono {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 13px;
    font-weight: 700;
    color: $color-primary-dark;
  }

  &--emphasis {
    font-weight: 700;
    color: $color-primary-dark;
    font-size: 15px;
  }

  &--warn   { color: #D97706; font-weight: 600; }
  &--danger { color: #DC2626; font-weight: 600; }
  &--green  { color: #059669; font-weight: 500; }
}

.remain-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
  background: #FFEDD5;
  color: #C2410C;
  vertical-align: middle;
}

// 借阅原因
.reason-block {
  background: var(--theme-bg-card);
  border: 1px solid #F1F5F9;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: $color-text-body;
  line-height: 1.7;
  white-space: pre-wrap;
  min-height: 60px;
}

// 审批结果
.approval-block {
  border-radius: 10px;
  border: 1px solid;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.approval-status {
  display: flex;
  align-items: center;
  gap: 7px;
}

.approval-icon { font-size: 17px; }

.approval-status-text {
  font-size: 14px;
  font-weight: 700;
}

.approval-opinion {
  font-size: 13px;
  color: $color-text-body;
  line-height: 1.6;
  white-space: pre-wrap;
  padding: 8px 10px;
  background: rgba(255,255,255,0.6);
  border-radius: 6px;
  margin: 0;

  &--muted {
    color: #94A3B8;
    font-style: italic;
  }
}

.overdue-alert {
  border-radius: 8px;

  :deep(.el-alert__title) { font-size: 13px; line-height: 1.5; }
}

// ── Drawer footer ─────────────────────────────────────────────────
.drawer-footer {
  padding: 14px 20px;
  display: flex;
  justify-content: flex-end;
  background: #fff;
}

.el-button { border-radius: var(--radius-btn); }
</style>
