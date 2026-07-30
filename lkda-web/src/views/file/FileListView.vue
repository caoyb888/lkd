<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElTable } from 'element-plus'
import Sortable from 'sortablejs'
import { useDictStore } from '@/stores/dict'
import { useAuthStore } from '@/stores/auth'
import { VolumeApi } from '@/api/volume'
import { FileApi } from '@/api/file'
import type { ArchiveVolumeDetailVO, ArchiveFileListVO } from '@/types/vo'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import FileEditDrawer from '@/components/FileEditDrawer.vue'
import FileDetailDrawer from '@/components/FileDetailDrawer.vue'
import { useViewMode } from '@/composables/useViewMode'

const route     = useRoute()
const router    = useRouter()
const dictStore = useDictStore()
const authStore = useAuthStore()

const volumeId = computed(() => Number(route.params.volumeId))
const yearFromQuery = computed(() => route.query.year as string | undefined)

// ── 关联案卷 ─────────────────────────────────────────────────────
const volume   = ref<ArchiveVolumeDetailVO | null>(null)
const volLoading = ref(false)

async function loadVolume() {
  volLoading.value = true
  try {
    const y = yearFromQuery.value
    if (y) {
      volume.value = await VolumeApi.detail(volumeId.value, y)
    } else {
      const res = await VolumeApi.page({ current: 1, size: 1, keyword: String(volumeId.value) })
      const found = res.records[0]
      if (found) {
        volume.value = await VolumeApi.detail(volumeId.value, found.year)
      }
    }
  } finally {
    volLoading.value = false
  }
}

// 草稿状态（status=0）才允许增删改排序
const isDraft = computed(() => volume.value?.status === 0)

// 权限：立卷人本人 或 管理员
const isAdmin = computed(() => authStore.isAdmin)
const canEdit = computed(() =>
  isDraft.value && (
    isAdmin.value ||
    (volume.value?.compilerId != null && volume.value.compilerId === authStore.userInfo?.userId)
  )
)

// ── 卷内文件列表 ─────────────────────────────────────────────────
const files     = ref<ArchiveFileListVO[]>([])
const loading   = ref(false)
const tableRef  = ref<InstanceType<typeof ElTable> | null>(null)
let   sortable: Sortable | null = null

async function loadFiles() {
  loading.value = true
  try {
    if (volume.value?.archiveNo && volume.value?.year) {
      files.value = await FileApi.listByVolume(volume.value.archiveNo, volume.value.year)
    } else {
      files.value = []
    }
  } finally {
    loading.value = false
  }
}

// ── 视图模式（表格容器用 v-show 切换，避免 tbody 销毁导致 sortable 失效）──
const viewMode = useViewMode('file')

// ── 前端分页（listByVolume 一次返回全量，页内切片展示）─────────────
const PAGE_SIZE = 20
const page = ref(1)
const pagedFiles = computed(() =>
  files.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
)

// 切换案卷时重置页码
watch(
  () => [volume.value?.archiveNo, volume.value?.year],
  () => { page.value = 1 }
)

// ── 拖拽排序 ─────────────────────────────────────────────────────
const sortSaving = ref(false)

function initSortable() {
  const tbody = tableRef.value?.$el?.querySelector('tbody')
  if (!tbody) return
  if (sortable) sortable.destroy()

  sortable = Sortable.create(tbody as HTMLElement, {
    handle:    '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      // DOM 下标是当前页的页内下标，换算为全量列表下标
      const offset = (page.value - 1) * PAGE_SIZE
      const from = oldIndex + offset
      const to   = newIndex + offset
      const moved = files.value.splice(from, 1)[0]
      files.value.splice(to, 0, moved)
      // 重新编号
      files.value = files.value.map((f, i) => ({ ...f, seqNo: i + 1 }))
      await saveSortOrder()
    },
  })
}

async function saveSortOrder() {
  sortSaving.value = true
  try {
    await FileApi.batchSort(
      files.value.map(f => ({ recordId: f.recordId, year: f.year, seqNo: f.seqNo }))
    )
    ElMessage.success('排序已保存')
  } catch {
    await loadFiles()  // 回滚
  } finally {
    sortSaving.value = false
  }
}

// ── 字典选项 ─────────────────────────────────────────────────────
const securityOptions = computed(() => dictStore.getDictItems('security_level'))

// ── 密级样式 ─────────────────────────────────────────────────────
const SECURITY_STYLE: Record<string, { bg: string; color: string }> = {
  public:       { bg: '#F0FDF4', color: '#166534' },
  internal:     { bg: '#EFF6FF', color: '#1E40AF' },
  secret:       { bg: '#FFFBEB', color: '#92400E' },
  confidential: { bg: '#FFF7ED', color: '#9A3412' },
  topsecret:    { bg: '#FFF1F2', color: '#881337' },
}
const securityStyle = (lv: string) => SECURITY_STYLE[lv] ?? { bg: '#F1F5F9', color: '#64748B' }

// 通过字典 store 获取密级显示标签
const getSecurityLabel = (value: string) =>
  dictStore.getDictLabel('security_level', value) || value

// ── 新建/编辑/详情 Drawer（共享组件）──────────────────────────────
const drawerVisible = ref(false)
const editId        = ref<number | undefined>()
const editDrawerRef = ref<InstanceType<typeof FileEditDrawer> | null>(null)

function openCreate() {
  editId.value = undefined
  drawerVisible.value = true
}

function openEdit(row: ArchiveFileListVO) {
  editId.value = row.recordId
  drawerVisible.value = true
  nextTick(() => {
    editDrawerRef.value?.setForm({
      year:         row.year ?? volume.value?.year ?? '',
      seqNo:        row.seqNo,
      fileNo:       row.fileNo  ?? '',
      fileTitle:    row.fileTitle,
      responsible:  row.responsible ?? '',
      pages:        row.pages,
      securityLevel:row.securityLevel ?? '',
      archiveDate:  row.archiveDate ?? '',
      keywords:     row.keywords ?? '',
      originalPath: row.originalPath ?? '',
      remark:       row.remark ?? '',
    })
  })
}

async function onSaved() {
  await loadFiles()
  nextTick(bindSortable)
}

// ── 只读详情 Drawer ─────────────────────────────────────────────
const detailVisible = ref(false)
const detailId      = ref<number | undefined>()

function openDetail(row: ArchiveFileListVO) {
  detailId.value = row.recordId
  detailVisible.value = true
}

// ── 删除 ─────────────────────────────────────────────────────────
async function handleDelete(row: ArchiveFileListVO) {
  await ElMessageBox.confirm(
    `确认删除文件「${row.fileTitle}」？此操作不可撤销。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
  await FileApi.delete(row.recordId, row.year)
  ElMessage.success('已删除')
  await loadFiles()
  nextTick(bindSortable)
}

// ── 初始化 ───────────────────────────────────────────────────────
async function bindSortable() {
  await nextTick()
  if (canEdit.value) initSortable()
}

onMounted(async () => {
  await loadVolume()
  await loadFiles()
  bindSortable()
})
</script>

<template>
  <div class="page-container">
    <!-- ── 页头 ──────────────────────────────────────────────────── -->
    <PageHeader
      title="卷内文件目录"
      show-back
      :breadcrumbs="[
        { label: '案卷管理', path: '/volume/list' },
        { label: volume?.volumeTitle || '案卷详情', path: volume ? `/volume/detail/${volumeId}` : undefined },
        { label: '卷内文件' },
      ]"
    />

    <!-- ── 关联案卷卡 ─────────────────────────────────────────────── -->
    <el-card v-if="volume" class="volume-banner" shadow="never">
      <div class="banner-row">
        <el-icon class="banner-icon"><Folder /></el-icon>
        <div class="banner-info">
          <span class="banner-no">{{ volume.archiveNo }}</span>
          <span class="banner-title">{{ volume.volumeTitle }}</span>
        </div>
        <StatusTag type="archive" :value="volume.status" />
        <el-tag v-if="!isDraft" type="info" size="small" class="readonly-tip">
          <el-icon><Lock /></el-icon>
          只读（{{ volume.status === 1 ? '审核中' : volume.status === 2 ? '待确认' : '已归档' }}）
        </el-tag>
      </div>
    </el-card>

    <!-- ── 工具栏 ─────────────────────────────────────────────────── -->
    <div class="toolbar">
      <div class="info-stat">
        共 <strong>{{ files.length }}</strong> 份文件
        <span v-if="sortSaving" class="saving-tip">
          <el-icon class="is-loading"><Loading /></el-icon>
          保存排序…
        </span>
      </div>
      <div class="toolbar-right">
        <ViewModeToggle v-model="viewMode" />
        <el-button
          v-if="canEdit"
          type="primary"
          class="btn-new"
          @click="openCreate"
        >
          <el-icon><Plus /></el-icon>
          新建文件
        </el-button>
      </div>
    </div>

    <!-- ── 文件列表（表格视图）────────────────────────────────────── -->
    <el-card v-show="viewMode === 'table'" shadow="never" class="table-card">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="pagedFiles"
        row-key="recordId"
        class="file-table"
        max-height="calc(100vh - 300px)"
      >
        <template #empty>
          <EmptyState description="暂无卷内文件，点击「新建文件」开始录入" />
        </template>

        <!-- 拖拽把手（草稿可用） -->
        <el-table-column v-if="canEdit" width="44" align="center">
          <template #default>
            <el-icon class="drag-handle" title="拖拽排序"><Rank /></el-icon>
          </template>
        </el-table-column>

        <el-table-column prop="seqNo"     label="顺序号" width="76"  align="center" />
        <el-table-column prop="fileNo"    label="文件编号" width="130" show-overflow-tooltip />
        <el-table-column prop="fileTitle" label="文件标题"  min-width="220" show-overflow-tooltip />
        <el-table-column prop="responsible" label="责任者"  width="110" show-overflow-tooltip />
        <el-table-column label="页数" width="70" align="center">
          <template #default="{ row }">
            {{ row.pages ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column label="密级" width="90" align="center">
          <template #default="{ row }">
            <span
              v-if="row.securityLevel"
              class="security-chip"
              :style="securityStyle(row.securityLevel)"
            >{{ getSecurityLabel(row.securityLevel) }}</span>
            <span v-else class="dash">—</span>
          </template>
        </el-table-column>
        <el-table-column label="主题词" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="keywords-text">{{ row.keywords || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="归档日期" width="108" align="center">
          <template #default="{ row }">{{ row.archiveDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <template v-if="canEdit">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger"  @click="handleDelete(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="files.length > PAGE_SIZE" class="pager-bar">
        <el-pagination
          v-model:current-page="page"
          :page-size="PAGE_SIZE"
          :total="files.length"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </el-card>

    <!-- ── 卡片视图 ───────────────────────────────────────────────── -->
    <div v-show="viewMode === 'card'" class="card-view" v-loading="loading">
      <EmptyState
        v-if="!loading && pagedFiles.length === 0"
        description="暂无卷内文件，点击「新建文件」开始录入"
      />

      <div class="card-grid">
        <div
          v-for="row in pagedFiles"
          :key="row.recordId"
          class="archive-card"
        >
          <div class="archive-card-icon-wrap">
            <el-icon class="archive-card-icon"><Document /></el-icon>
          </div>
          <div class="archive-card-body">
            <div class="archive-card-no">{{ row.fileNo || '—' }}</div>
            <div class="archive-card-title" :title="row.fileTitle">
              {{ row.fileTitle }}
            </div>
            <div class="archive-card-meta">
              <span class="meta-text">{{ row.responsible || '—' }}</span>
              <span class="meta-text">{{ row.pages ?? '—' }} 页</span>
              <span
                v-if="row.securityLevel"
                class="security-chip small"
                :style="securityStyle(row.securityLevel)"
              >{{ getSecurityLabel(row.securityLevel) }}</span>
            </div>
          </div>
          <div class="archive-card-footer">
            <span class="meta-text">{{ row.archiveDate || '—' }}</span>
            <el-button
              link
              type="primary"
              size="small"
              @click.stop="openDetail(row)"
            >查看</el-button>
            <el-button
              v-if="canEdit"
              link
              type="primary"
              size="small"
              @click.stop="openEdit(row)"
            >编辑</el-button>
          </div>
        </div>
      </div>

      <div v-if="files.length > PAGE_SIZE" class="pager-bar">
        <el-pagination
          v-model:current-page="page"
          :page-size="PAGE_SIZE"
          :total="files.length"
          layout="total, prev, pager, next"
          background
        />
      </div>
    </div>

    <!-- ── 新建/编辑 Drawer（共享组件） ──────────────────────────── -->
    <FileEditDrawer
      ref="editDrawerRef"
      v-model="drawerVisible"
      :edit-id="editId"
      :archive-no="volume?.archiveNo ?? ''"
      :volume-no="volume?.volumeNo ?? ''"
      :year="volume?.year ?? ''"
      :file-count="files.length"
      @saved="onSaved"
    />

    <!-- ── 只读详情 Drawer ───────────────────────────────────────── -->
    <FileDetailDrawer
      v-model="detailVisible"
      :record-id="detailId"
      :year="volume?.year ?? ''"
    />
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1200px;
}

// ── 分页栏 ────────────────────────────────────────────────────────
.pager-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}

// ── 关联案卷横幅 ──────────────────────────────────────────────────
.volume-banner {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) { padding: 12px 20px; }
}

.banner-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.banner-icon {
  font-size: 24px;
  color: $color-primary;
  flex-shrink: 0;
}

.banner-info {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.banner-no {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  color: $color-primary-dark;
  font-weight: 600;
  flex-shrink: 0;
}

.banner-title {
  font-size: 14px;
  color: $color-text-title;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.readonly-tip {
  border-radius: var(--radius-tag);
  display: flex;
  align-items: center;
  gap: 4px;
}

// ── 工具栏 ────────────────────────────────────────────────────────
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-stat {
  font-size: 13px;
  color: $color-text-body;

  strong { color: $color-text-title; font-size: 15px; }
}

.saving-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $color-primary;
  margin-left: 8px;

  .el-icon { font-size: 13px; }
}

.btn-new {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 600;
  border-radius: var(--radius-btn);

  &:hover { opacity: 0.9; }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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

.security-chip.small {
  padding: 1px 6px;
  font-size: 10px;
}

// ── 表格 ──────────────────────────────────────────────────────────
.table-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) { padding: 0; }
}

.file-table {
  :deep(.el-table__header-wrapper th) {
    background: #F8FAFC;
    color: $color-text-body;
    font-weight: 600;
    font-size: 13px;
  }

  :deep(.el-table__row) {
    transition: background 0.15s;
    &:hover td { background: var(--theme-bg-soft) !important; }
  }
}

// 拖拽把手
.drag-handle {
  cursor: grab;
  color: #CBD5E1;
  font-size: 18px;
  transition: color 0.15s;

  &:hover { color: $color-primary; }
  &:active { cursor: grabbing; }
}

// SortableJS 拖拽幽灵行
:global(.sortable-ghost) {
  opacity: 0.4;
  background: var(--theme-bg-lighter) !important;
}

.security-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 600;
}

.keywords-text {
  font-size: 12px;
  color: $color-text-body;
}

.dash { color: #CBD5E1; }

// ── Drawer 表单 ───────────────────────────────────────────────────
.file-drawer {
  :deep(.el-drawer__header) {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #F1F5F9;
    margin-bottom: 0;
    font-size: 16px;
    font-weight: 600;
    color: $color-text-title;
  }

  :deep(.el-drawer__body) {
    padding: 20px 24px;
    overflow-y: auto;
  }

  :deep(.el-drawer__footer) {
    padding: 16px 24px;
    border-top: 1px solid #F1F5F9;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
  }
}

.drawer-form {
  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 500;
    color: $color-text-body;
    padding-bottom: 4px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #E2E8F0;
    transition: box-shadow 0.2s;
    &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
    &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent); }
  }

  :deep(.el-select .el-input__wrapper) {
    box-shadow: 0 0 0 1px #E2E8F0;
    border-radius: 8px;
    &:hover { box-shadow: 0 0 0 1px var(--theme-accent-light); }
  }
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.w-full { width: 100%; }

// ── 主题词输入 ────────────────────────────────────────────────────
.keyword-wrap {
  width: 100%;
}

.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  min-height: 40px;
  transition: border-color 0.2s;

  &:focus-within { border-color: $color-primary; }
}

.keyword-tag {
  border-radius: var(--radius-tag);
  background: var(--theme-bg-lighter);
  border-color: #99F6E4;
  color: $color-primary-dark;
  font-size: 12px;
}

.keyword-input {
  border: none;
  box-shadow: none;
  flex: 1;
  min-width: 120px;

  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    padding: 0;
    background: transparent;
  }
}

.keyword-hint {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
}

// ── Drawer 底部 ───────────────────────────────────────────────────
.drawer-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;

  .el-button {
    border-radius: var(--radius-btn);
    font-weight: 500;
  }
}

.btn-save {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  min-width: 96px;

  &:hover { opacity: 0.9; }
}
</style>
