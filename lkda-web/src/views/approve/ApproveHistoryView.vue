<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ApproveApi } from '@/api/approve'
import type { ApproveLogVO } from '@/types/vo'

const router = useRouter()

// ── 业务类型选项 ─────────────────────────────────────────────────
const BIZ_OPTIONS = [
  { label: '归档审核', value: 1 },
  { label: '归档确认', value: 2 },
  { label: '借阅审批', value: 3 },
  { label: '销毁审批', value: 4 },
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

// 从 dateRange 拆出 dateFrom / dateTo
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
    ElMessage.error('加载审批历史失败，请稍后重试')
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

// ── 展开行：追踪已展开的 logId 集合 ─────────────────────────────
const expandedRows = ref<Set<number>>(new Set())

function toggleRow(row: ApproveLogVO) {
  if (expandedRows.value.has(row.logId)) {
    expandedRows.value.delete(row.logId)
  } else {
    expandedRows.value.add(row.logId)
  }
}

// ── 业务类型样式 ─────────────────────────────────────────────────
interface TagStyle { text: string; bg: string; color: string }

const BIZ_META: Record<number, TagStyle> = {
  1: { text: '归档审核', bg: '#FEF9C3', color: '#854D0E' },
  2: { text: '归档确认', bg: '#D1FAE5', color: '#065F46' },
  3: { text: '借阅审批', bg: '#DBEAFE', color: '#1D4ED8' },
  4: { text: '销毁审批', bg: '#FEE2E2', color: '#991B1B' },
}
const bizMeta = (type: number): TagStyle =>
  BIZ_META[type] ?? { text: `类型${type}`, bg: '#F1F5F9', color: '#64748B' }

// ── 审批动作样式 ─────────────────────────────────────────────────
const ACTION_META: Record<string, TagStyle> = {
  PASS:   { text: '通过', bg: '#D1FAE5', color: '#065F46' },
  REJECT: { text: '驳回', bg: '#FEE2E2', color: '#991B1B' },
  BACK:   { text: '退回', bg: '#DBEAFE', color: '#1D4ED8' },
}
const actionMeta = (action: string): TagStyle =>
  ACTION_META[action] ?? { text: action, bg: '#F1F5F9', color: '#64748B' }

// 意见截断，表格内只显示前 40 字
const truncateOpinion = (text: string, max = 40): string =>
  text && text.length > max ? text.slice(0, max) + '…' : (text || '—')

// 销毁审批条目标记
const isDestroyType = (type: number) => type === 4

// 导航到案卷详情
const goVolumeDetail = (row: ApproveLogVO) =>
  router.push({ path: `/volume/detail/${row.targetId}`, query: { year: row.targetArchiveNo?.split('-')[1] } })

// 日期格式化（YYYY-MM-DD 供接口）
const DATE_FORMAT = 'YYYY-MM-DD'
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ───────────────────────────────────────────────── -->
    <PageHeader
      title="审批历史追溯"
      :breadcrumbs="[{ label: '归档审批' }, { label: '审批历史追溯' }]"
    />

    <!-- ── 筛选栏 ─────────────────────────────────────────────── -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-grid">
        <!-- 第一行 -->
        <el-select
          v-model="query.businessType"
          placeholder="业务类型"
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
          placeholder="审批人姓名"
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

    <!-- ── 数据表格 ───────────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="total-label">
            共 <strong>{{ total }}</strong> 条审批记录
          </span>
        </div>
        <div class="toolbar-right">
          <el-tooltip content="点击表格行可展开完整审批意见" placement="top">
            <span class="expand-tip">
              <el-icon><InfoFilled /></el-icon>
              点击行展开意见
            </span>
          </el-tooltip>
        </div>
      </div>

      <!-- 骨架屏 -->
      <template v-if="loading && tableData.length === 0">
        <el-skeleton :rows="8" animated class="skeleton-padding" />
      </template>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!loading && tableData.length === 0"
        description="暂无审批记录，请调整筛选条件后重试"
      />

      <!-- 表格 -->
      <el-table
        v-else
        v-loading="loading"
        :data="tableData"
        row-key="logId"
        class="history-table"
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
                <span class="expand-title">完整审批意见</span>
              </div>
              <p v-if="row.opinion" class="expand-opinion">{{ row.opinion }}</p>
              <p v-else class="expand-empty">该审批操作未填写意见</p>

              <!-- 销毁类型额外警示 -->
              <div v-if="isDestroyType(row.businessType)" class="expand-destroy-warn">
                <el-icon><WarningFilled /></el-icon>
                此为高危销毁审批操作，已写入不可撤销审计日志
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 业务类型 -->
        <el-table-column label="业务类型" width="120">
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
            <span
              class="archive-no-link"
              :title="row.targetArchiveNo"
              @click.stop="goVolumeDetail(row)"
            >
              {{ row.targetArchiveNo || '—' }}
            </span>
          </template>
        </el-table-column>

        <!-- 审批人 -->
        <el-table-column label="审批人" width="100">
          <template #default="{ row }">
            <span class="approver-cell">
              <el-icon><UserFilled /></el-icon>
              {{ row.approverName }}
            </span>
          </template>
        </el-table-column>

        <!-- 审批动作 -->
        <el-table-column label="审批动作" width="90" align="center">
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

        <!-- 意见摘要 -->
        <el-table-column label="意见摘要" min-width="200">
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

        <!-- 审批时间 -->
        <el-table-column label="审批时间" prop="createdAt" min-width="160" sortable>
          <template #default="{ row }">
            <span class="time-cell">{{ row.createdAt }}</span>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="" width="80" align="center">
          <template #default="{ row }">
            <el-button
              link
              size="small"
              class="link-detail"
              @click.stop="goVolumeDetail(row)"
            >
              查看档案
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

// 业务类型下拉选项内的小标签
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

.toolbar-left { display: flex; align-items: center; gap: 8px; }
.toolbar-right { display: flex; align-items: center; }

.total-label {
  font-size: 13px;
  color: $color-text-body;

  strong { color: $color-primary-dark; font-weight: 700; }
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
.history-table {
  width: 100%;
  cursor: pointer;

  // 表头
  :deep(th.el-table__cell) {
    background: #FAFFFE;
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 2px solid #E2E8F0;
  }

  :deep(.el-table__cell) { padding: 11px 8px; }

  // 普通行 hover
  :deep(.el-table__row:hover > td) { background: #ECFDF5 !important; }

  // 销毁类型行：右侧细红条
  :deep(.row-destroy > td:first-child) {
    border-left: 3px solid #FECDD3;
  }

  // 展开行样式
  :deep(.el-table__expanded-cell) {
    padding: 0 !important;
    background: #FAFFFE;
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

.destroy-icon {
  font-size: 11px;
}

.archive-no-link {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
    text-decoration: underline;
  }
}

.approver-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: $color-text-title;

  .el-icon { font-size: 13px; color: #94A3B8; }
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

.time-cell {
  font-size: 12px;
  color: $color-text-body;
}

.link-detail {
  font-size: 12px;
  color: $color-primary;
  padding: 2px 4px;

  &:hover { color: $color-primary-dark; }
}

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
