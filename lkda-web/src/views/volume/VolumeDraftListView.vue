<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VolumeApi } from '@/api/volume'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import { useViewMode } from '@/composables/useViewMode'
import type { ArchiveVolumeListVO } from '@/types/vo'

const router = useRouter()

// ── 视图模式 ────────────────────────────────────────────────────
const viewMode = useViewMode('volume_draft')

// ── 列表数据 ────────────────────────────────────────────────────
const loading   = ref(false)
const tableData = ref<ArchiveVolumeListVO[]>([])
const total     = ref(0)
const query     = ref({ current: 1, size: 20 })

async function loadList() {
  loading.value = true
  try {
    const res = await VolumeApi.draftPage(query.value)
    tableData.value = res.records
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(loadList)

// ── 操作 ────────────────────────────────────────────────────────
function goEdit(row: ArchiveVolumeListVO) {
  router.push(`/volume/edit/${row.recordId}?year=${encodeURIComponent(row.year)}`)
}

function goFiles(row: ArchiveVolumeListVO) {
  router.push(`/file/list/${row.recordId}?year=${encodeURIComponent(row.year)}`)
}

const submitting = ref<number | null>(null)
async function handleSubmit(row: ArchiveVolumeListVO) {
  await ElMessageBox.confirm(
    `确认提交案卷「${row.volumeTitle}」进入归档审核？提交后不可再编辑。`,
    '提交审核',
    { confirmButtonText: '提交', cancelButtonText: '取消', type: 'warning' },
  )
  submitting.value = row.recordId
  try {
    await VolumeApi.submit(row.recordId, row.year)
    ElMessage.success('已提交审核')
    await loadList()
  } finally {
    submitting.value = null
  }
}

async function handleDelete(row: ArchiveVolumeListVO) {
  await ElMessageBox.confirm(
    `确认删除草稿「${row.volumeTitle}」？其卷内文件草稿将一并失效，此操作不可撤销。`,
    '删除草稿',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'error' },
  )
  await VolumeApi.delete(row.recordId, row.year)
  ElMessage.success('草稿已删除')
  await loadList()
}
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="待归档"
      :breadcrumbs="[
        { label: '案卷管理', path: '/volume/list' },
        { label: '待归档' },
      ]"
    />

    <!-- ── 工具栏 ─────────────────────────────────────────────── -->
    <div class="toolbar">
      <div class="info-stat">
        共 <strong>{{ total }}</strong> 卷草稿
      </div>
      <ViewModeToggle v-model="viewMode" />
    </div>

    <!-- ── 表格视图 ────────────────────────────────────────────── -->
    <el-card v-if="viewMode === 'table'" shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="recordId"
        max-height="calc(100vh - 280px)"
      >
        <template #empty>
          <EmptyState description="暂无草稿，去「案卷目录 → 新建案卷」开始著录" />
        </template>

        <el-table-column prop="archiveNo" label="档号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="volumeTitle" label="案卷题名" min-width="220" show-overflow-tooltip />
        <el-table-column prop="year" label="年度" width="72" align="center" />
        <el-table-column label="密级" width="90" align="center">
          <template #default="{ row }">
            {{ row.securityLevelLabel || row.securityLevel || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="卷内件数" width="88" align="center">
          <template #default="{ row }">{{ row.fileCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="160" align="center" />

        <el-table-column label="操作" width="270" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="goEdit(row)">继续编辑</el-button>
            <el-button link type="primary" @click="goFiles(row)">卷内文件</el-button>
            <el-button
              link
              type="success"
              :loading="submitting === row.recordId"
              @click="handleSubmit(row)"
            >提交审核</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- ── 卡片视图 ────────────────────────────────────────────── -->
    <div v-else class="card-view" v-loading="loading">
      <EmptyState
        v-if="!loading && tableData.length === 0"
        description="暂无草稿，去「案卷目录 → 新建案卷」开始著录"
      />

      <div class="card-grid">
        <div
          v-for="row in tableData"
          :key="row.recordId"
          class="archive-card"
          @click="goEdit(row)"
        >
          <div class="archive-card-icon-wrap">
            <el-icon class="archive-card-icon"><EditPen /></el-icon>
          </div>
          <div class="archive-card-body">
            <div class="archive-card-no">{{ row.archiveNo }}</div>
            <div class="archive-card-title" :title="row.volumeTitle">{{ row.volumeTitle }}</div>
            <div class="archive-card-meta">
              <span class="meta-year">{{ row.year }} 年</span>
              <span class="meta-sec">{{ row.securityLevelLabel || row.securityLevel || '—' }}</span>
            </div>
          </div>
          <div class="archive-card-footer">
            <el-button link type="primary" size="small" @click.stop="goFiles(row)">卷内文件</el-button>
            <el-button
              link
              type="success"
              size="small"
              :loading="submitting === row.recordId"
              @click.stop="handleSubmit(row)"
            >提交审核</el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(row)">删除</el-button>
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.info-stat {
  color: var(--color-text-body);
  font-size: 14px;

  strong { color: $color-primary; }
}

.table-card {
  :deep(.el-card__body) { padding: 0; }
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}

// ── 卡片视图 ────────────────────────────────────────────────────
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.archive-card {
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-card);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--color-primary) 14%, transparent);
  }
}

.archive-card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--theme-bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.archive-card-icon {
  font-size: 22px;
  color: $color-primary;
}

.archive-card-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  color: $color-primary-dark;
  font-weight: 600;
}

.archive-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-title);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.archive-card-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-body);
}

.archive-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  border-top: 1px dashed #E2E8F0;
  padding-top: 8px;
}

.card-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
