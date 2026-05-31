<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ApproveApi } from '@/api/approve'
import type { ApproveLogVO } from '@/types/vo'

// ── 业务类型选项（与后端 ApproveBusinessType 常量严格对齐）──
const BIZ_OPTIONS = [
  { label: '归档审核', value: 1 },
  { label: '归档确认', value: 2 },
  { label: '销毁审批', value: 3 },
  { label: '借阅审批', value: 4 },
]

// ── 查询参数 ─────────────────────────────────────────────────────
const query = reactive({
  businessType: undefined as number | undefined,
  approverName: '',
  keyword:      '',
  dateRange:    null as [string, string] | null,
  current:      1,
  size:         20,
})

const dateFrom = computed(() => query.dateRange?.[0] ?? undefined)
const dateTo   = computed(() => query.dateRange?.[1] ?? undefined)

// ── 列表数据 ─────────────────────────────────────────────────────
const loading   = ref(false)
const tableData = ref<ApproveLogVO[]>([])
const total     = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await ApproveApi.historyPage({
      businessType: query.businessType,
      approverName: query.approverName || undefined,
      keyword:      query.keyword      || undefined,
      dateFrom:     dateFrom.value,
      dateTo:       dateTo.value,
      current:      query.current,
      size:         query.size,
    })
    tableData.value = res.records
    total.value     = res.total
  } catch {
    ElMessage.error('加载审计日志失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.current = 1
  loadList()
}

function handleReset() {
  query.businessType = undefined
  query.approverName = ''
  query.keyword      = ''
  query.dateRange    = null
  query.current      = 1
  loadList()
}

function handlePageChange(page: number) {
  query.current = page
  loadList()
}

function handleSizeChange(size: number) {
  query.size    = size
  query.current = 1
  loadList()
}

// ── 展开行 ───────────────────────────────────────────────────────
const expandedRows = ref<Set<number>>(new Set())

function toggleRow(row: ApproveLogVO) {
  if (expandedRows.value.has(row.logId)) {
    expandedRows.value.delete(row.logId)
  } else {
    expandedRows.value.add(row.logId)
  }
}

// ── 样式辅助 ─────────────────────────────────────────────────────
interface TagStyle { text: string; bg: string; color: string }

const BIZ_META: Record<number, TagStyle> = {
  1: { text: '归档审核', bg: '#FEF9C3', color: '#854D0E' },
  2: { text: '归档确认', bg: 'var(--theme-border-light)', color: '#065F46' },
  3: { text: '销毁审批', bg: '#FEE2E2', color: '#991B1B' },
  4: { text: '借阅审批', bg: '#DBEAFE', color: '#1D4ED8' },
}
const bizMeta = (type: number): TagStyle =>
  BIZ_META[type] ?? { text: `类型${type}`, bg: '#F1F5F9', color: '#64748B' }

const ACTION_META: Record<string, TagStyle> = {
  PASS:   { text: '通过',  bg: 'var(--theme-border-light)', color: '#065F46' },
  REJECT: { text: '驳回',  bg: '#FEE2E2', color: '#991B1B' },
  BACK:   { text: '退回',  bg: '#DBEAFE', color: '#1D4ED8' },
  APPLY:  { text: '申请',  bg: '#EDE9FE', color: '#5B21B6' },
}
const actionMeta = (action: string): TagStyle =>
  ACTION_META[action] ?? { text: action, bg: '#F1F5F9', color: '#64748B' }

const isDestroyType = (type: number) => type === 3

const truncateOpinion = (text: string, max = 40): string =>
  text && text.length > max ? text.slice(0, max) + '…' : (text || '—')

const DATE_FORMAT = 'YYYY-MM-DD'
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ─────────────────────────────────────────────────── -->
    <PageHeader
      title="操作审计日志"
      :breadcrumbs="[{ label: '审计日志' }, { label: '操作审计日志' }]"
    />

    <!-- ── 筛选栏 ───────────────────────────────────────────────── -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-grid">
        <el-select
          v-model="query.businessType"
          placeholder="操作类型"
          clearable
          class="filter-item"
          @change="handleSearch"
        >
          <el-option
            v-for="opt in BIZ_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          >
            <span
              class="biz-option-dot"
              :style="{ background: BIZ_META[opt.value]?.bg, color: BIZ_META[opt.value]?.color }"
            >{{ opt.label }}</span>
          </el-option>
        </el-select>

        <el-input
          v-model="query.approverName"
          placeholder="操作人姓名"
          clearable
          class="filter-item"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><User /></el-icon></template>
        </el-input>

        <el-input
          v-model="query.keyword"
          placeholder="档号关键词"
          clearable
          class="filter-item"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-date-picker
          v-model="query.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :value-format="DATE_FORMAT"
          class="filter-date"
          @change="handleSearch"
        />

        <div class="filter-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- ── 数据表格 ─────────────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="total-label">
            共 <strong>{{ total }}</strong> 条审计记录
          </span>
          <el-tag size="small" type="info" effect="plain" class="readonly-badge">
            <el-icon><Lock /></el-icon>
            只读
          </el-tag>
        </div>
        <div class="toolbar-right">
          <el-tooltip content="点击表格行可展开完整审计意见" placement="top">
            <span class="expand-tip">
              <el-icon><InfoFilled /></el-icon>
              点击行展开详情
            </span>
          </el-tooltip>
        </div>
      </div>

      <template v-if="loading && tableData.length === 0">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无审计记录，请调整筛选条件后重试"
      />

      <el-table
        v-else
        v-loading="loading"
        :data="tableData"
        row-key="logId"
        class="audit-table"
        max-height="calc(100vh - 300px)"
        :row-class-name="({ row }) => isDestroyType(row.businessType) ? 'row-destroy' : ''"
        @row-click="toggleRow"
      >
        <!-- 展开列 -->
        <el-table-column type="expand" width="40">
          <template #default="{ row }">
            <div class="expand-content">
              <div class="expand-header">
                <el-icon class="expand-icon"><ChatDotRound /></el-icon>
                <span class="expand-title">完整审计意见</span>
              </div>
              <p v-if="row.opinion" class="expand-opinion">{{ row.opinion }}</p>
              <p v-else class="expand-empty">该操作未填写意见</p>

              <div v-if="isDestroyType(row.businessType)" class="expand-destroy-warn">
                <el-icon><WarningFilled /></el-icon>
                此为高危销毁审批操作，已写入不可撤销审计日志
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 时间 -->
        <el-table-column label="操作时间" prop="createdAt" min-width="160" sortable>
          <template #default="{ row }">
            <span class="time-cell">{{ row.createdAt }}</span>
          </template>
        </el-table-column>

        <!-- 操作人 -->
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">
            <span class="approver-cell">
              <el-icon><UserFilled /></el-icon>
              {{ row.approverName }}
            </span>
          </template>
        </el-table-column>

        <!-- 操作类型 -->
        <el-table-column label="操作类型" width="120">
          <template #default="{ row }">
            <span
              class="biz-tag"
              :style="{
                background: bizMeta(row.businessType).bg,
                color:      bizMeta(row.businessType).color,
              }"
            >
              <el-icon v-if="isDestroyType(row.businessType)" class="destroy-icon">
                <WarningFilled />
              </el-icon>
              {{ bizMeta(row.businessType).text }}
            </span>
          </template>
        </el-table-column>

        <!-- 目标档号 -->
        <el-table-column label="目标档号" min-width="170">
          <template #default="{ row }">
            <span class="archive-no-cell" :title="row.targetArchiveNo">
              {{ row.targetArchiveNo || '—' }}
            </span>
          </template>
        </el-table-column>

        <!-- 操作结果 -->
        <el-table-column label="操作结果" width="90" align="center">
          <template #default="{ row }">
            <span
              class="action-tag"
              :style="{
                background: actionMeta(row.action).bg,
                color:      actionMeta(row.action).color,
              }"
            >{{ actionMeta(row.action).text }}</span>
          </template>
        </el-table-column>

        <!-- 审计摘要 -->
        <el-table-column label="审计摘要" min-width="220">
          <template #default="{ row }">
            <span
              v-if="row.opinion"
              class="opinion-summary"
              :class="{ 'has-more': row.opinion.length > 40 }"
            >
              {{ truncateOpinion(row.opinion) }}
            </span>
            <span v-else class="opinion-empty">—</span>
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
  </div>
</template>

<style scoped lang="scss">
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

  :deep(.el-card__body) { padding: 12px 20px; }
}

.filter-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-item  { width: 160px; }
.filter-date  { width: 260px; }

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 768px) {
  .filter-item, .filter-date { width: 100%; }
  .filter-actions { width: 100%; margin-left: 0; justify-content: flex-end; }
}

.biz-option-dot {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 500;
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

.toolbar-right {
  display: flex;
  align-items: center;
}

.total-label {
  font-size: 13px;
  color: $color-text-body;

  strong { color: $color-primary-dark; font-weight: 700; }
}

.readonly-badge {
  border-radius: var(--radius-tag);
  font-size: 12px;

  :deep(.el-icon) { font-size: 12px; margin-right: 2px; }
}

.expand-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94A3B8;
  cursor: default;

  .el-icon { font-size: 13px; }
}

// ── 表格 ──────────────────────────────────────────────────────────
.audit-table {
  width: 100%;
  cursor: pointer;

  :deep(th.el-table__cell) {
    background: var(--theme-bg-card);
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) { padding: 11px 8px; }

  :deep(.el-table__row:hover > td) { background: var(--theme-bg-light) !important; }

  :deep(.row-destroy > td:first-child) {
    border-left: 3px solid #F87171;
  }

  :deep(.el-table__expanded-cell) {
    padding: 0 !important;
    background: var(--theme-bg-card);
  }
}

// ── 展开内容区 ────────────────────────────────────────────────────
.expand-content {
  padding: 16px 60px 16px 56px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px dashed #E2E8F0;
}

.expand-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.expand-icon {
  font-size: 14px;
  color: $color-primary;
}

.expand-title {
  font-size: 12px;
  font-weight: 600;
  color: $color-text-title;
}

.expand-opinion {
  font-size: 13px;
  color: $color-text-body;
  line-height: 1.7;
  white-space: pre-wrap;
  padding: 10px 14px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
  margin: 0;
}

.expand-empty {
  font-size: 13px;
  color: #CBD5E1;
  font-style: italic;
  margin: 0;
}

.expand-destroy-warn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  background: #FFF1F2;
  border: 1px solid #FECDD3;
  font-size: 12px;
  color: #BE123C;
  font-weight: 500;
  width: fit-content;

  .el-icon { font-size: 13px; }
}

// ── 单元格样式 ────────────────────────────────────────────────────
.time-cell {
  font-size: 12px;
  color: $color-text-body;
}

.approver-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: $color-text-title;

  .el-icon { font-size: 13px; color: #94A3B8; }
}

.biz-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.destroy-icon { font-size: 11px; }

.archive-no-cell {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: $color-text-title;
}

.action-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.opinion-summary {
  font-size: 12px;
  color: $color-text-body;
  line-height: 1.5;

  &.has-more {
    cursor: pointer;

    &::after {
      content: ' 展开';
      font-size: 11px;
      color: $color-primary;
      font-weight: 500;
    }
  }
}

.opinion-empty { color: #CBD5E1; font-size: 13px; }

// ── 分页 ──────────────────────────────────────────────────────────
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

.el-button { border-radius: var(--radius-btn); }
</style>
