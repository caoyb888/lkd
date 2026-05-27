<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElTable } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import Sortable from 'sortablejs'
import { useDictStore } from '@/stores/dict'
import { useAuthStore } from '@/stores/auth'
import { VolumeApi } from '@/api/volume'
import { FileApi, type ArchiveFileSaveDTO } from '@/api/file'
import type { ArchiveVolumeDetailVO, ArchiveFileListVO } from '@/types/vo'

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
    if (volume.value?.volumeNo && volume.value?.year) {
      files.value = await FileApi.listByVolume(volume.value.volumeNo, volume.value.year)
    } else {
      files.value = []
    }
  } finally {
    loading.value = false
  }
}

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
      const moved = files.value.splice(oldIndex, 1)[0]
      files.value.splice(newIndex, 0, moved)
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

// ── Drawer 表单 ──────────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerTitle   = ref('')
const editId        = ref<number | undefined>()
const formRef       = ref<FormInstance>()
const saving        = ref(false)

const emptyForm = (): ArchiveFileSaveDTO & { keywords: string } => ({
  volumeId:     volumeId.value,
  year:         volume.value?.year ?? '',
  seqNo:        (files.value.length + 1),
  fileNo:       '',
  fileTitle:    '',
  responsible:  '',
  pages:        undefined as unknown as number,
  securityLevel:'',
  archiveDate:  '',
  keywords:     '',
  originalPath: '',
  remark:       '',
})

const form = ref(emptyForm())

const rules: FormRules = {
  fileTitle: [{ required: true, message: '请输入文件标题', trigger: 'blur' }],
  seqNo:     [{ required: true, message: '请填写顺序号',   trigger: 'blur' }],
}

function openCreate() {
  editId.value      = undefined
  drawerTitle.value = '新建卷内文件'
  form.value        = emptyForm()
  drawerVisible.value = true
}

function openEdit(row: ArchiveFileListVO) {
  editId.value      = row.recordId
  drawerTitle.value = '编辑卷内文件'
  form.value = {
    volumeId:     volumeId.value,
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
  }
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
  formRef.value?.resetFields()
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      ...form.value,
      keywords: form.value.keywords || undefined,
    }
    if (editId.value) {
      await FileApi.update(editId.value, payload.year, payload)
      ElMessage.success('文件信息已更新')
    } else {
      await FileApi.save(payload)
      ElMessage.success('文件已新建')
    }
    closeDrawer()
    await loadFiles()
    nextTick(bindSortable)
  } finally {
    saving.value = false
  }
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

// ── 主题词 Tag 输入 ───────────────────────────────────────────────
const keywordInput  = ref('')
const keywordList   = computed<string[]>(() =>
  form.value.keywords
    ? form.value.keywords.split(',').map(s => s.trim()).filter(Boolean)
    : []
)

function addKeyword() {
  const kw = keywordInput.value.trim()
  if (!kw) return
  const exists = keywordList.value.includes(kw)
  if (!exists) {
    const arr = [...keywordList.value, kw]
    form.value.keywords = arr.join(',')
  }
  keywordInput.value = ''
}

function removeKeyword(kw: string) {
  form.value.keywords = keywordList.value.filter(k => k !== kw).join(',')
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

    <!-- ── 文件列表 ───────────────────────────────────────────────── -->
    <el-card shadow="never" class="table-card">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="files"
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
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="canEdit">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger"  @click="handleDelete(row)">删除</el-button>
            </template>
            <span v-else class="dash">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ── 新建/编辑 Drawer ───────────────────────────────────────── -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      direction="rtl"
      size="560px"
      :close-on-click-modal="false"
      class="file-drawer"
      @closed="closeDrawer"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="drawer-form"
      >
        <!-- 关联案卷号（只读） -->
        <el-form-item label="关联案卷号">
          <el-input :value="volume?.archiveNo ?? ''" disabled class="w-full" />
        </el-form-item>

        <div class="form-row-2">
          <!-- 顺序号 -->
          <el-form-item label="顺序号" prop="seqNo">
            <el-input-number
              v-model="form.seqNo"
              :min="1"
              :max="9999"
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
          <!-- 文件编号 -->
          <el-form-item label="文件编号" prop="fileNo">
            <el-input v-model="form.fileNo" placeholder="可选" clearable class="w-full" />
          </el-form-item>
        </div>

        <!-- 文件标题 -->
        <el-form-item label="文件标题" prop="fileTitle" required>
          <el-input
            v-model="form.fileTitle"
            placeholder="请输入文件标题（必填）"
            maxlength="200"
            show-word-limit
            clearable
            class="w-full"
          />
        </el-form-item>

        <div class="form-row-2">
          <!-- 责任者 -->
          <el-form-item label="责任者" prop="responsible">
            <el-input v-model="form.responsible" placeholder="可选" clearable class="w-full" />
          </el-form-item>
          <!-- 页数 -->
          <el-form-item label="页数" prop="pages">
            <el-input-number
              v-model="form.pages"
              :min="0"
              :max="99999"
              placeholder="可选"
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </div>

        <div class="form-row-2">
          <!-- 密级 -->
          <el-form-item label="密级" prop="securityLevel">
            <el-select v-model="form.securityLevel" placeholder="请选择密级" clearable class="w-full">
              <el-option
                v-for="item in securityOptions"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>
          <!-- 归档日期 -->
          <el-form-item label="归档日期" prop="archiveDate">
            <el-date-picker
              v-model="form.archiveDate"
              type="date"
              placeholder="请选择归档日期"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </el-form-item>
        </div>

        <!-- 主题词 Tag 输入 -->
        <el-form-item label="主题词" prop="keywords">
          <div class="keyword-wrap">
            <div class="keyword-tags">
              <el-tag
                v-for="kw in keywordList"
                :key="kw"
                closable
                @close="removeKeyword(kw)"
                class="keyword-tag"
              >{{ kw }}</el-tag>
              <el-input
                v-model="keywordInput"
                placeholder="输入后按 Enter 添加"
                size="small"
                class="keyword-input"
                @keyup.enter.prevent="addKeyword"
              />
            </div>
            <div class="keyword-hint">多个主题词逐个添加，点击标签右侧 × 删除</div>
          </div>
        </el-form-item>

        <!-- 原文路径 -->
        <el-form-item label="原文路径" prop="originalPath">
          <el-input
            v-model="form.originalPath"
            placeholder="电子原文存储路径（可选）"
            clearable
            class="w-full"
          />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="可选"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="closeDrawer">取消</el-button>
          <el-button type="primary" :loading="saving" class="btn-save" @click="submitForm">
            {{ editId ? '保存修改' : '新建文件' }}
          </el-button>
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
  max-width: 1200px;
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
    &:hover td { background: #F0FDFA !important; }
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
  background: #CCFBF1 !important;
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
    &:hover   { box-shadow: 0 0 0 1px #5EEAD4; }
    &.is-focus { box-shadow: 0 0 0 2px rgba(20,184,166,0.25); }
  }

  :deep(.el-select .el-input__wrapper) {
    box-shadow: 0 0 0 1px #E2E8F0;
    border-radius: 8px;
    &:hover { box-shadow: 0 0 0 1px #5EEAD4; }
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
  background: #CCFBF1;
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
