<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BorrowApi } from '@/api/borrow'
import type { BorrowVO } from '@/types/vo'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import { useViewMode } from '@/composables/useViewMode'

// ── 视图模式 ─────────────────────────────────────────────────────
const viewMode = useViewMode('borrow_approve')

// ── 查询参数 ─────────────────────────────────────────────────────
const query = reactive({
  keyword: '',
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
    const res = await BorrowApi.approvePage({
      keyword: query.keyword || undefined,
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
  query.keyword = ''
  query.current = 1
  loadList()
}

onMounted(loadList)

// ── Drawer 状态 ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const currentRow    = ref<BorrowVO | null>(null)
const opinion       = ref('')
const submitting    = ref(false)

function openApprove(row: BorrowVO) {
  currentRow.value    = row
  opinion.value       = ''
  drawerVisible.value = true
}

const drawerTitle = computed(() =>
  currentRow.value ? `审批 · ${currentRow.value.archiveNo}` : '借阅审批',
)

// ── 可借份数超出警告 ─────────────────────────────────────────────
const isOverApply = computed(() => {
  if (!currentRow.value) return false
  const avail = currentRow.value.volumeAvailable
  if (avail === undefined) return false
  return currentRow.value.applyCount > avail
})

// ── 审批操作 ─────────────────────────────────────────────────────
function validateOpinion(): boolean {
  if (!opinion.value.trim()) {
    ElMessage.warning('请填写审批意见')
    return false
  }
  return true
}

async function handleApprove() {
  if (!validateOpinion() || !currentRow.value) return

  await ElMessageBox.confirm(
    `确认批准「${currentRow.value.borrowerName}」对档案「${currentRow.value.archiveNo}」的借阅申请？\n批准后档案在库状态将更新为"借出"。`,
    '确认批准',
    {
      type:                'success',
      confirmButtonText:   '确认批准',
      cancelButtonText:    '取消',
    },
  )

  submitting.value = true
  try {
    await BorrowApi.approve(currentRow.value.borrowId, { action: 'PASS', opinion: opinion.value.trim() })
    ElMessage.success('已批准，档案在库状态已更新')
    drawerVisible.value = false
    loadList()
  } finally {
    submitting.value = false
  }
}

async function handleReject() {
  if (!validateOpinion() || !currentRow.value) return

  await ElMessageBox.confirm(
    `确认驳回「${currentRow.value.borrowerName}」的借阅申请？`,
    '确认驳回',
    {
      type:                'warning',
      confirmButtonText:   '确认驳回',
      cancelButtonText:    '取消',
    },
  )

  submitting.value = true
  try {
    await BorrowApi.reject(currentRow.value.borrowId, { action: 'REJECT', opinion: opinion.value.trim() })
    ElMessage.success('已驳回该借阅申请')
    drawerVisible.value = false
    loadList()
  } finally {
    submitting.value = false
  }
}

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
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ───────────────────────────────────────────────── -->
    <PageHeader
      title="借阅审批队列"
      :breadcrumbs="[{ label: '借阅管理' }, { label: '借阅审批队列' }]"
    />

    <!-- ── 筛选栏 ─────────────────────────────────────────────── -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <el-input
          v-model="query.keyword"
          placeholder="搜索申请人姓名或档号"
          clearable
          class="filter-keyword"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
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
        <span class="queue-badge">待审批</span>
        <span class="queue-count">
          共 <strong>{{ total }}</strong> 条待处理借阅申请
        </span>
        <div class="toolbar-spacer" />
        <ViewModeToggle v-model="viewMode" />
      </div>

      <template v-if="loading && tableData.length === 0">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无待审批的借阅申请"
      />

      <el-table
        v-else-if="viewMode === 'table'"
        v-loading="loading"
        :data="tableData"
        row-key="borrowId"
        class="approve-table"
        max-height="calc(100vh - 300px)"
      >
        <el-table-column label="档号" min-width="165" fixed>
          <template #default="{ row }">
            <span class="archive-no">{{ row.archiveNo }}</span>
          </template>
        </el-table-column>

        <el-table-column label="档案题名" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="title-cell">{{ row.volumeTitle }}</span>
          </template>
        </el-table-column>

        <el-table-column label="申请人" width="120">
          <template #default="{ row }">
            <div class="applicant-cell">
              <span class="applicant-name">{{ row.borrowerName }}</span>
              <span class="applicant-dept">{{ row.borrowerDept }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="份数" width="72" align="center">
          <template #default="{ row }">
            <span class="count-cell">{{ row.applyCount }} 件</span>
          </template>
        </el-table-column>

        <el-table-column label="申请时间" min-width="155">
          <template #default="{ row }">
            <span class="time-cell">{{ row.createdAt }}</span>
          </template>
        </el-table-column>

        <el-table-column label="计划归还" width="112">
          <template #default="{ row }">
            <span class="time-cell">{{ row.planReturnDate || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              class="btn-approve"
              @click="openApprove(row)"
            >
              <el-icon><EditPen /></el-icon>
              审批
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
            @click="openApprove(row)"
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
                <span class="applicant-name">{{ row.borrowerName }}</span>
                <span class="applicant-dept">{{ row.borrowerDept }}</span>
              </div>
              <div class="archive-card-meta">
                <span class="meta-text">{{ row.applyCount }} 件</span>
                <span class="meta-text">计划归还 {{ row.planReturnDate || '—' }}</span>
              </div>
            </div>
            <div class="archive-card-footer">
              <span class="meta-text">{{ row.createdAt }}</span>
              <el-button
                type="primary"
                size="small"
                class="btn-approve"
                @click.stop="openApprove(row)"
              >
                <el-icon><EditPen /></el-icon>
                审批
              </el-button>
            </div>
          </div>
        </div>
      </div>

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
    <!-- 审批侧滑 Drawer                                             -->
    <!-- ─────────────────────────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="580px"
      :destroy-on-close="false"
      class="approve-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title-icon">
              <el-icon><Suitcase /></el-icon>
            </span>
            <span class="drawer-title-text">{{ drawerTitle }}</span>
          </div>
          <span v-if="currentRow" class="drawer-sub">
            {{ currentRow.volumeTitle }}
          </span>
        </div>
      </template>

      <div v-if="currentRow" class="drawer-body">

        <!-- ── 申请人信息 ──────────────────────────────────────── -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">申请人信息</span>
          </div>
          <div class="applicant-card">
            <div class="applicant-avatar">
              {{ currentRow.borrowerName.slice(-1) }}
            </div>
            <div class="applicant-info">
              <span class="applicant-info-name">{{ currentRow.borrowerName }}</span>
              <span class="applicant-info-dept">{{ currentRow.borrowerDept }}</span>
              <span v-if="currentRow.borrowerPhone" class="applicant-info-phone">
                <el-icon><Phone /></el-icon>
                {{ currentRow.borrowerPhone }}
              </span>
            </div>
          </div>
        </section>

        <!-- ── 档案信息 ────────────────────────────────────────── -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">档案信息</span>
          </div>
          <div class="archive-banner">
            <el-icon class="banner-icon"><DocumentChecked /></el-icon>
            <span class="banner-no">{{ currentRow.archiveNo }}</span>
          </div>
          <div class="detail-block">
            <div class="detail-row">
              <span class="dl">档案题名</span>
              <span class="dv">{{ currentRow.volumeTitle }}</span>
            </div>
            <div v-if="currentRow.volumeAvailable !== undefined" class="detail-row">
              <span class="dl">剩余可借</span>
              <span
                class="dv available-val"
                :class="{
                  'is-ok':    currentRow.volumeAvailable > 0 && !isOverApply,
                  'is-warn':  isOverApply,
                  'is-empty': currentRow.volumeAvailable === 0,
                }"
              >
                <el-icon v-if="currentRow.volumeAvailable === 0"><CircleClose /></el-icon>
                <el-icon v-else-if="isOverApply"><Warning /></el-icon>
                <el-icon v-else><CircleCheck /></el-icon>
                {{
                  currentRow.volumeAvailable === 0
                    ? '已借空（无法批准）'
                    : `${currentRow.volumeAvailable} 件可借（共 ${currentRow.volumeCopies ?? '?'} 件）`
                }}
              </span>
            </div>
            <div v-if="isOverApply" class="over-apply-warn">
              <el-icon><WarningFilled /></el-icon>
              申请份数（{{ currentRow.applyCount }} 件）超出剩余可借份数，请核实后再批准
            </div>
          </div>
        </section>

        <!-- ── 借阅申请详情 ────────────────────────────────────── -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">借阅申请详情</span>
          </div>
          <div class="detail-block">
            <div class="detail-row">
              <span class="dl">申请份数</span>
              <span class="dv dv--emphasis">{{ currentRow.applyCount }} 件</span>
            </div>
            <div class="detail-row">
              <span class="dl">计划归还</span>
              <span class="dv">{{ currentRow.planReturnDate || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="dl">申请时间</span>
              <span class="dv">{{ currentRow.createdAt }}</span>
            </div>
          </div>
        </section>

        <!-- ── 借阅原因 ────────────────────────────────────────── -->
        <section class="detail-section">
          <div class="section-header">
            <span class="section-bar" />
            <span class="section-title">借阅原因</span>
          </div>
          <div class="reason-block">
            {{ currentRow.reason || '（申请人未填写借阅原因）' }}
          </div>
        </section>

      </div>

      <!-- ── 审批操作区（固定底部）──────────────────────────────── -->
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
              :disabled="currentRow?.volumeAvailable === 0"
              @click="handleApprove"
            >
              <el-icon><CircleCheck /></el-icon>
              批准
            </el-button>
          </div>
          <p
            v-if="currentRow?.volumeAvailable === 0"
            class="empty-stock-tip"
          >
            <el-icon><WarningFilled /></el-icon>
            该档案当前无可借份数，无法批准，请驳回并通知申请人等待归还
          </p>
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

.filter-keyword { flex: 1; min-width: 240px; max-width: 400px; }

@media (max-width: 768px) {
  .filter-keyword { width: 100%; max-width: none; flex: none; }
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
  gap: 10px;
  padding: 10px 20px 8px;
  border-bottom: 1px solid #F1F5F9;
}

.queue-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  background: #F1F5F9;
  color: #64748B;
}

.queue-count {
  font-size: 13px;
  color: $color-text-body;

  strong { color: $color-primary-dark; font-weight: 700; }
}

.approve-table {
  width: 100%;

  :deep(.el-table__row:hover > td) { background: var(--theme-bg-light) !important; }

  :deep(th.el-table__cell) {
    background: var(--theme-bg-card);
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) { padding: 11px 8px; }
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
}

.applicant-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.applicant-name {
  font-size: 13px;
  color: $color-text-title;
  font-weight: 500;
}

.applicant-dept {
  font-size: 11px;
  color: #94A3B8;
}

.count-cell {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

.time-cell {
  font-size: 12px;
  color: $color-text-body;
}

.btn-approve {
  background: $color-primary;
  border-color: $color-primary;
  border-radius: var(--radius-btn);
  font-weight: 500;
  font-size: 12px;

  &:hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
    transform: translateY(-1px);
  }
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

.toolbar-spacer { flex: 1; }

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
  justify-content: space-between;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid #F1F5F9;
  flex-wrap: wrap;
}

// ── Drawer ────────────────────────────────────────────────────────
.approve-drawer {
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
  font-size: 15px;
  font-weight: 700;
  color: $color-text-title;
  font-family: 'JetBrains Mono', Consolas, monospace;
  letter-spacing: 0.3px;
}

.drawer-sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: $color-text-body;
  padding-left: 38px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

// 申请人卡片
.applicant-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-light));
  border-radius: 12px;
  border: 1px solid var(--theme-border-medium);
}

.applicant-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.applicant-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.applicant-info-name {
  font-size: 15px;
  font-weight: 700;
  color: $color-text-title;
}

.applicant-info-dept {
  font-size: 12px;
  color: $color-text-body;
}

.applicant-info-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94A3B8;
  font-family: 'JetBrains Mono', Consolas, monospace;

  .el-icon { font-size: 12px; }
}

// 档案横幅
.archive-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--theme-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--theme-border-medium);
}

.banner-icon { font-size: 18px; color: $color-primary; }

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 15px;
  font-weight: 700;
  color: $color-primary-dark;
  letter-spacing: 0.5px;
  word-break: break-all;
}

// 字段行
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

  &--emphasis {
    font-size: 16px;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

.available-val {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;

  &.is-ok    { color: $color-primary-dark; }
  &.is-warn  { color: #D97706; }
  &.is-empty { color: #DC2626; }

  .el-icon { font-size: 14px; }
}

.over-apply-warn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 6px;
  font-size: 12px;
  color: #92400E;
  font-weight: 500;

  .el-icon { font-size: 13px; color: #D97706; flex-shrink: 0; }
}

.reason-block {
  background: var(--theme-bg-card);
  border: 1px solid #F1F5F9;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: $color-text-body;
  line-height: 1.7;
  white-space: pre-wrap;
  min-height: 56px;
}

// 审批操作区
.approve-action-bar {
  padding: 14px 20px 18px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opinion-wrap { display: flex; flex-direction: column; gap: 6px; }

.opinion-label {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

.required-star { color: #EF4444; margin-left: 2px; }

.opinion-textarea {
  width: 100%;

  :deep(.el-textarea__inner) {
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    resize: vertical;

    &:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent) !important; }
  }
}

.action-btns {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-reject {
  border-color: #FB923C;
  color: #EA580C;
  background: #FFF7ED;
  border-radius: var(--radius-btn);
  font-weight: 600;
  min-width: 90px;

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
  min-width: 90px;

  &:not(:disabled):hover {
    background: $color-primary-dark;
    border-color: $color-primary-dark;
    transform: translateY(-1px);
  }

  &:disabled { opacity: 0.4; }
}

.empty-stock-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #DC2626;
  margin: 0;

  .el-icon { font-size: 13px; flex-shrink: 0; }
}

.el-button { border-radius: var(--radius-btn); }
</style>
