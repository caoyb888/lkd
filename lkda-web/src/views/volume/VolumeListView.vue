<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDictStore } from '@/stores/dict'
import { useAuthStore } from '@/stores/auth'
import { VolumeApi } from '@/api/volume'
import type { ArchiveVolumeListVO } from '@/types/vo'

const router    = useRouter()
const dictStore = useDictStore()
const authStore = useAuthStore()

// ── 视图模式 ────────────────────────────────────────────────────
type ViewMode = 'table' | 'card'
const viewMode = ref<ViewMode>('table')

// ── 年度选项（2018 - 当前年）────────────────────────────────────
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: currentYear - 2017 }, (_, i) =>
  String(currentYear - i),
)

// ── 字典选项 ────────────────────────────────────────────────────
const categoryL1Options = computed(() => dictStore.getDictItems('category_l1'))
const categoryL2Options = computed(() => dictStore.getDictItems('category_l2'))

const STATUS_OPTIONS = [
  { label: '草稿',   value: 0 },
  { label: '待审核', value: 1 },
  { label: '待确认', value: 2 },
  { label: '已归档', value: 3 },
]

const STOCK_OPTIONS = [
  { label: '在库', value: 1 },
  { label: '借出', value: 0 },
]

// ── 查询参数 ────────────────────────────────────────────────────
const query = reactive({
  year:       undefined as string | undefined,
  categoryL1: undefined as string | undefined,
  categoryL2: undefined as string | undefined,
  status:     undefined as number | undefined,
  inStock:    undefined as number | undefined,
  keyword:    '',
  current:    1,
  size:       20,
})

// 一级类目变更时重置二级
watch(() => query.categoryL1, () => { query.categoryL2 = undefined })

// ── 列表数据 ────────────────────────────────────────────────────
const loading   = ref(false)
const tableData = ref<ArchiveVolumeListVO[]>([])
const total     = ref(0)

async function loadList() {
  loading.value = true
  try {
    const res = await VolumeApi.page({
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
  query.year       = undefined
  query.categoryL1 = undefined
  query.categoryL2 = undefined
  query.status     = undefined
  query.inStock    = undefined
  query.keyword    = ''
  query.current    = 1
  loadList()
}

onMounted(async () => {
  if (!dictStore.loaded) {
    await dictStore.loadAll().catch(() => {})
  }
  loadList()
})

// ── 权限 ────────────────────────────────────────────────────────
const isAdmin = computed(() => authStore.isAdmin)

// ── 导航操作 ────────────────────────────────────────────────────
const goDetail = (row: ArchiveVolumeListVO) => router.push({
  path: `/volume/detail/${row.recordId}`,
  query: { year: row.year }
})
const goEdit   = (row: ArchiveVolumeListVO) => router.push({
  path: `/volume/edit/${row.recordId}`,
  query: { year: row.year }
})
const goBorrow = (row: ArchiveVolumeListVO) => router.push({
  path: `/borrow/apply/${encodeURIComponent(row.archiveNo)}`,
})
const goNew    = () => router.push('/volume/edit')
const goImport = () => router.push('/volume/import')

// ── 密级标签样式 ────────────────────────────────────────────────
const SECURITY_STYLE: Record<string, { bg: string; color: string }> = {
  public:       { bg: '#F0FDF4', color: '#166534' },
  internal:     { bg: '#EFF6FF', color: '#1E40AF' },
  secret:       { bg: '#FFFBEB', color: '#92400E' },
  confidential: { bg: '#FFF7ED', color: '#9A3412' },
  topsecret:    { bg: '#FFF1F2', color: '#881337' },
}
const securityStyle = (level: string) =>
  SECURITY_STYLE[level] ?? { bg: '#F1F5F9', color: '#64748B' }

// 案卷归档状态展示值（优先判断销毁待审批）
const archiveStatusValue = (row: ArchiveVolumeListVO) => {
  if (row.pendingDestroy === 1) return 10
  return row.status
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="案卷目录" />

    <!-- ── 检索面板 ──────────────────────────────────────────────── -->
    <div class="search-panel">
      <div class="search-grid">
        <el-select v-model="query.year" placeholder="年度" clearable>
          <el-option v-for="y in yearOptions" :key="y" :label="y + ' 年'" :value="y" />
        </el-select>

        <el-select v-model="query.categoryL1" placeholder="一级类目" clearable>
          <el-option
            v-for="item in categoryL1Options"
            :key="item.itemValue"
            :label="item.itemLabel"
            :value="item.itemValue"
          />
        </el-select>

        <el-select
          v-model="query.categoryL2"
          placeholder="二级类目"
          clearable
          :disabled="!query.categoryL1"
        >
          <el-option
            v-for="item in categoryL2Options"
            :key="item.itemValue"
            :label="item.itemLabel"
            :value="item.itemValue"
          />
        </el-select>

        <el-select v-model="query.status" placeholder="归档状态" clearable>
          <el-option
            v-for="s in STATUS_OPTIONS"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>

        <el-select v-model="query.inStock" placeholder="在库状态" clearable>
          <el-option
            v-for="s in STOCK_OPTIONS"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>

        <el-input
          v-model="query.keyword"
          placeholder="案卷题名 / 档号 / 主题词"
          clearable
          prefix-icon="Search"
          @keyup.enter="handleSearch"
        />

        <div class="search-actions">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            检索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- ── 工具栏 ────────────────────────────────────────────────── -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" class="new-btn" @click="goNew">
          <el-icon><Plus /></el-icon>
          新建案卷
        </el-button>
        <el-button v-if="isAdmin" @click="goImport">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button>
          <el-icon><Download /></el-icon>
          导出列表
        </el-button>
      </div>

      <div class="view-toggle">
        <el-tooltip content="表格视图" placement="top">
          <el-button
            :type="viewMode === 'table' ? 'primary' : 'default'"
            circle
            size="small"
            @click="viewMode = 'table'"
          >
            <el-icon><List /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="卡片视图" placement="top">
          <el-button
            :type="viewMode === 'card' ? 'primary' : 'default'"
            circle
            size="small"
            @click="viewMode = 'card'"
          >
            <el-icon><Grid /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- ── 表格视图 ──────────────────────────────────────────────── -->
    <el-card v-if="viewMode === 'table'" shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="recordId"
        class="archive-table"
        max-height="calc(100vh - 300px)"
      >
        <template #empty>
          <EmptyState description="暂无案卷数据，试试调整检索条件" />
        </template>

        <el-table-column prop="archiveNo" label="档号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="volumeTitle" label="案卷题名" min-width="220" show-overflow-tooltip />
        <el-table-column prop="year" label="年度" width="72" align="center" />

        <el-table-column label="密级" width="90" align="center">
          <template #default="{ row }">
            <span
              class="security-tag"
              :style="securityStyle(row.securityLevel)"
            >{{ row.securityLevelLabel || row.securityLevel || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="保管期限" width="96" align="center">
          <template #default="{ row }">
            <span class="period-text">{{ row.retentionPeriodLabel || row.retentionPeriod || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="归档状态" width="100" align="center">
          <template #default="{ row }">
            <StatusTag type="archive" :value="archiveStatusValue(row)" />
          </template>
        </el-table-column>

        <el-table-column label="在库" width="76" align="center">
          <template #default="{ row }">
            <StatusTag type="stock" :value="row.inStock" />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">查看</el-button>
            <el-button
              v-if="row.status === 0"
              link
              type="primary"
              @click="goEdit(row)"
            >编辑</el-button>
            <el-button
              v-if="row.status === 3 && row.inStock === 1"
              link
              type="success"
              @click="goBorrow(row)"
            >借阅</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @change="loadList"
        />
      </div>
    </el-card>

    <!-- ── 卡片视图 ──────────────────────────────────────────────── -->
    <div v-else class="card-view" v-loading="loading">
      <EmptyState
        v-if="!loading && tableData.length === 0"
        description="暂无案卷数据，试试调整检索条件"
      />

      <div class="card-grid">
        <div
          v-for="row in tableData"
          :key="row.recordId"
          class="archive-card"
          @click="goDetail(row)"
        >
          <div class="archive-card-icon-wrap">
            <el-icon class="archive-card-icon"><Folder /></el-icon>
          </div>
          <div class="archive-card-body">
            <div class="archive-card-no">{{ row.archiveNo }}</div>
            <div class="archive-card-title" :title="row.volumeTitle">
              {{ row.volumeTitle }}
            </div>
            <div class="archive-card-meta">
              <span class="meta-year">{{ row.year }} 年</span>
              <span
                class="security-tag small"
                :style="securityStyle(row.securityLevel)"
              >{{ row.securityLevelLabel || row.securityLevel || '—' }}</span>
            </div>
          </div>
          <div class="archive-card-footer">
            <StatusTag type="archive" :value="archiveStatusValue(row)" />
            <StatusTag type="stock" :value="row.inStock" />
            <el-button
              v-if="row.status === 3 && row.inStock === 1"
              link
              type="success"
              size="small"
              @click.stop="goBorrow(row)"
            >借阅</el-button>
          </div>
        </div>
      </div>

      <div v-if="tableData.length > 0" class="card-pagination">
        <el-pagination
          v-model:current-page="query.current"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @change="loadList"
        />
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
}

// ── 检索面板 ────────────────────────────────────────────────────
.search-panel {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  background: #fff;
  box-shadow: var(--shadow-card);
  padding: 20px;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, auto));
  gap: 12px;
  margin-bottom: 0;
  align-items: center;

  :deep(.el-select),
  :deep(.el-input) {
    width: 100%;

    .el-input__wrapper {
      border-radius: 8px;
      box-shadow: 0 0 0 1px #E2E8F0;
      transition: box-shadow 0.2s;

      &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
      &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 30%, transparent); }
    }
  }

  .search-actions {
    display: flex;
    gap: 10px;
    justify-self: start;
    align-self: center;
  }
}

// ── 工具栏 ────────────────────────────────────────────────────────
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.new-btn {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 600;
  border-radius: var(--radius-btn);

  &:hover {
    opacity: 0.9;
  }
}

.view-toggle {
  display: flex;
  gap: 6px;

  .el-button {
    border-radius: 8px;
  }
}

// ── 表格卡片 ──────────────────────────────────────────────────────
.table-card {
  :deep(.el-card__body) {
    padding: 0;
  }
}

.archive-table {
  :deep(.el-table__header-wrapper th) {
    background: #F8FAFC;
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
  }

  :deep(.el-table__row) {
    cursor: pointer;
    transition: background 0.15s;

    &:hover td {
      background: var(--theme-bg-soft) !important;
    }
  }
}

.security-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;

  &.small {
    padding: 1px 6px;
    font-size: 10px;
  }
}

.period-text {
  font-size: 12px;
  color: $color-text-body;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #F1F5F9;
}

// ── 卡片视图 ──────────────────────────────────────────────────────
.card-view {
  min-height: 200px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
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
}

.meta-year {
  font-size: 12px;
  color: $color-text-body;
}

.archive-card-footer {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid #F1F5F9;
  flex-wrap: wrap;
}

.card-pagination {
  display: flex;
  justify-content: flex-end;
}
</style>
