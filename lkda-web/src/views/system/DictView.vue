<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DictApi, type DictVO } from '@/api/system/dict'
import type { DictItemVO } from '@/types/vo'
import { useDictStore } from '@/stores/dict'

const dictStore = useDictStore()

// ════════════════════════════════════════════════════════════════
// 左侧：字典主表
// ════════════════════════════════════════════════════════════════

// ── 搜索 ────────────────────────────────────────────────────────
const dictSearch = reactive({ dictCode: '', dictName: '' })

// ── 主表数据 ────────────────────────────────────════════════════
const dictLoading    = ref(false)
const dictList       = ref<DictVO[]>([])
const dictPagination = reactive({ current: 1, size: 20, total: 0 })

async function loadDictList() {
  dictLoading.value = true
  try {
    const res = await DictApi.page({
      current:  dictPagination.current,
      size:     dictPagination.size,
      dictCode: dictSearch.dictCode || undefined,
      dictName: dictSearch.dictName || undefined,
    })
    dictList.value           = res.records
    dictPagination.total     = res.total
  } finally {
    dictLoading.value = false
  }
}

function handleDictSearch() {
  dictPagination.current = 1
  loadDictList()
}

function handleDictReset() {
  dictSearch.dictCode = ''
  dictSearch.dictName = ''
  handleDictSearch()
}

// ── 当前选中字典 ────────────────────────────────────────────────
const selectedDict = ref<DictVO | null>(null)

function handleDictRowClick(row: DictVO) {
  selectedDict.value = row
  loadItems(row.dictCode)
}

// ── 新建/编辑字典弹窗 ───────────────────────────────────────────
const dictDlgVisible = ref(false)
const dictDlgLoading = ref(false)
const dictDlgFormRef = ref<FormInstance>()
const editDictRow    = ref<DictVO | null>(null)
const isDictEdit     = computed(() => editDictRow.value !== null)

const dictForm = reactive({
  dictCode: '',
  dictName: '',
  remark:   '',
  status:   1,
})

const dictFormRules: FormRules = {
  dictCode: [
    { required: true, message: '请输入字典编码', trigger: 'blur' },
    { pattern: /^[a-z_][a-z0-9_]*$/, message: '编码只能包含小写字母、数字和下划线', trigger: 'blur' },
  ],
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
}

function openAddDict() {
  editDictRow.value = null
  Object.assign(dictForm, { dictCode: '', dictName: '', remark: '', status: 1 })
  dictDlgVisible.value = true
  nextTick(() => dictDlgFormRef.value?.clearValidate())
}

function openEditDict(row: DictVO, e: Event) {
  e.stopPropagation()   // 阻止触发行点击选中
  editDictRow.value = row
  Object.assign(dictForm, {
    dictCode: row.dictCode,
    dictName: row.dictName,
    remark:   row.remark ?? '',
    status:   row.status,
  })
  dictDlgVisible.value = true
  nextTick(() => dictDlgFormRef.value?.clearValidate())
}

async function handleDictSubmit() {
  const valid = await dictDlgFormRef.value?.validate().catch(() => false)
  if (!valid) return

  dictDlgLoading.value = true
  try {
    if (isDictEdit.value) {
      await DictApi.update(editDictRow.value!.dictId, {
        dictCode: dictForm.dictCode,
        dictName: dictForm.dictName,
        remark:   dictForm.remark,
        status:   dictForm.status,
      })
      ElMessage.success('字典已更新')
    } else {
      await DictApi.save({
        dictCode: dictForm.dictCode,
        dictName: dictForm.dictName,
        remark:   dictForm.remark,
        status:   dictForm.status,
      })
      ElMessage.success('字典创建成功')
    }
    dictDlgVisible.value = false
    await loadDictList()
    await dictStore.loadAll()
  } finally {
    dictDlgLoading.value = false
  }
}

// ── 切换字典启用/停用 ───────────────────────────────────────────
async function handleDictStatus(row: DictVO, e: Event) {
  e.stopPropagation()
  const toEnable = row.status === 0
  const label    = toEnable ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(
      toEnable
        ? `确定要启用字典「${row.dictName}」吗？`
        : `停用字典「${row.dictName}」后，业务下拉框中该字典下仍启用的选项不受影响，\n但该字典将无法继续维护。确定停用？`,
      `${label}字典`,
      {
        confirmButtonText:  label,
        cancelButtonText:   '取消',
        type:               toEnable ? 'info' : 'warning',
        confirmButtonClass: toEnable ? '' : 'el-button--danger',
      },
    )
    await DictApi.changeStatus(row.dictId, toEnable ? 1 : 0, row.dictName)
    ElMessage.success(`字典已${label}`)
    await loadDictList()
    await dictStore.loadAll()
  } catch { /* 取消 */ }
}

// ════════════════════════════════════════════════════════════════
// 右侧：字典项列表
// ════════════════════════════════════════════════════════════════

const itemsLoading = ref(false)
const itemsList    = ref<DictItemVO[]>([])

async function loadItems(dictCode: string) {
  itemsLoading.value = true
  try {
    itemsList.value = await DictApi.listItems(dictCode)
  } finally {
    itemsLoading.value = false
  }
}

// 任何字典项变更后，刷新列表 + 全局 store
async function afterItemChange() {
  if (selectedDict.value) {
    await loadItems(selectedDict.value.dictCode)
  }
  await dictStore.loadAll()
}

// ── 新建/编辑字典项弹窗 ─────────────────────────────────────────
const itemDlgVisible = ref(false)
const itemDlgLoading = ref(false)
const itemDlgFormRef = ref<FormInstance>()
const editItemRow    = ref<DictItemVO | null>(null)
const isItemEdit     = computed(() => editItemRow.value !== null)
const itemDlgTitle   = computed(() => isItemEdit.value ? '编辑字典项' : '新增字典项')

const itemForm = reactive({
  itemValue: '',
  itemLabel: '',
  sortOrder: 1,
  status:    1,
})

const itemFormRules: FormRules = {
  itemValue: [{ required: true, message: '请输入字典值', trigger: 'blur' }],
  itemLabel: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请输入排序', trigger: 'blur' }],
}

function openAddItem() {
  editItemRow.value = null
  Object.assign(itemForm, {
    itemValue: '',
    itemLabel: '',
    sortOrder: (itemsList.value.length ?? 0) + 1,
    status:    1,
  })
  itemDlgVisible.value = true
  nextTick(() => itemDlgFormRef.value?.clearValidate())
}

function openEditItem(row: DictItemVO) {
  editItemRow.value = row
  Object.assign(itemForm, {
    itemValue: row.itemValue,
    itemLabel: row.itemLabel,
    sortOrder: row.sortOrder,
    status:    row.status,
  })
  itemDlgVisible.value = true
  nextTick(() => itemDlgFormRef.value?.clearValidate())
}

async function handleItemSubmit() {
  const valid = await itemDlgFormRef.value?.validate().catch(() => false)
  if (!valid || !selectedDict.value) return

  itemDlgLoading.value = true
  try {
    if (isItemEdit.value) {
      await DictApi.updateItem(editItemRow.value!.itemId, {
        dictCode:  selectedDict.value.dictCode,
        itemValue: itemForm.itemValue,
        itemLabel: itemForm.itemLabel,
        sortOrder: itemForm.sortOrder,
        status:    itemForm.status,
      })
      ElMessage.success('字典项已更新')
    } else {
      await DictApi.saveItem({
        dictCode:  selectedDict.value.dictCode,
        itemValue: itemForm.itemValue,
        itemLabel: itemForm.itemLabel,
        sortOrder: itemForm.sortOrder,
        status:    itemForm.status,
      })
      ElMessage.success('字典项已添加')
    }
    itemDlgVisible.value = false
    await afterItemChange()
  } finally {
    itemDlgLoading.value = false
  }
}

// ── 删除字典项 ──────────────────────────────────────────────────
async function handleDeleteItem(row: DictItemVO) {
  try {
    await ElMessageBox.confirm(
      `确定删除字典项「${row.itemLabel}（${row.itemValue}）」吗？`,
      '删除字典项',
      {
        confirmButtonText:  '删除',
        cancelButtonText:   '取消',
        type:               'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
    await DictApi.deleteItem(row.itemId)
    ElMessage.success('字典项已删除')
    await afterItemChange()
  } catch { /* 取消 */ }
}

// ── 切换字典项启用/停用 ─────────────────────────────────────────
async function handleItemStatus(row: DictItemVO) {
  const toEnable = row.status === 0
  await DictApi.updateItem(row.itemId, {
    dictCode:  row.dictCode,
    itemValue: row.itemValue,
    itemLabel: row.itemLabel,
    sortOrder: row.sortOrder,
    status:    toEnable ? 1 : 0,
  })
  ElMessage.success(toEnable ? '已启用' : '已停用')
  await afterItemChange()
}

// ── 初始化 ──────────────────────────────────────────────────────
onMounted(loadDictList)
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="数据字典"
      :breadcrumbs="[{ label: '系统管理' }, { label: '数据字典' }]"
    />

    <div class="dict-layout">
      <!-- ══ 左侧：字典主表 ══════════════════════════════════════ -->
      <el-card class="dict-card" shadow="never">
        <template #header>
          <div class="panel-header">
            <span class="panel-title">
              <el-icon><Collection /></el-icon>
              字典列表
            </span>
            <el-button type="primary" size="small" @click="openAddDict">
              <el-icon><Plus /></el-icon>新增
            </el-button>
          </div>
        </template>

        <!-- 搜索区 -->
        <div class="dict-search">
          <el-input
            v-model="dictSearch.dictCode"
            placeholder="编码"
            clearable
            size="small"
            class="search-code"
            @keyup.enter="handleDictSearch"
            @clear="handleDictSearch"
          />
          <el-input
            v-model="dictSearch.dictName"
            placeholder="名称"
            clearable
            size="small"
            class="search-name"
            @keyup.enter="handleDictSearch"
            @clear="handleDictSearch"
          />
          <el-button size="small" @click="handleDictSearch">
            <el-icon><Search /></el-icon>
          </el-button>
          <el-button size="small" @click="handleDictReset">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 字典列表 -->
        <div v-loading="dictLoading" class="dict-list">
          <div
            v-for="row in dictList"
            :key="row.dictId"
            class="dict-row"
            :class="{ active: selectedDict?.dictId === row.dictId }"
            @click="handleDictRowClick(row)"
          >
            <!-- 主要信息 -->
            <div class="dict-row-main">
              <span class="dict-code">{{ row.dictCode }}</span>
              <span class="dict-status" :class="row.status === 1 ? 'enabled' : 'disabled'">
                {{ row.status === 1 ? '启用' : '停用' }}
              </span>
            </div>
            <div class="dict-name">{{ row.dictName }}</div>

            <!-- 操作（hover 显示） -->
            <div class="dict-row-actions" @click.stop>
              <el-tooltip content="编辑" placement="top">
                <el-icon class="row-action-icon" @click="openEditDict(row, $event)">
                  <EditPen />
                </el-icon>
              </el-tooltip>
              <el-tooltip :content="row.status === 1 ? '停用' : '启用'" placement="top">
                <el-icon
                  class="row-action-icon"
                  :class="row.status === 1 ? 'danger' : 'success'"
                  @click="handleDictStatus(row, $event)"
                >
                  <component :is="row.status === 1 ? 'CircleClose' : 'CircleCheck'" />
                </el-icon>
              </el-tooltip>
            </div>
          </div>

          <div v-if="!dictLoading && !dictList.length" class="list-empty">
            <el-icon><Collection /></el-icon>
            <span>暂无字典数据</span>
          </div>
        </div>

        <!-- 分页（简化） -->
        <div v-if="dictPagination.total > dictPagination.size" class="dict-pagination">
          <el-pagination
            v-model:current-page="dictPagination.current"
            :page-size="dictPagination.size"
            :total="dictPagination.total"
            layout="prev, pager, next"
            small
            background
            @change="loadDictList"
          />
        </div>
      </el-card>

      <!-- ══ 右侧：字典项 ════════════════════════════════════════ -->
      <el-card class="items-card" shadow="never">
        <!-- header：根据是否选中字典切换内容 -->
        <template #header>
          <div v-if="selectedDict" class="panel-header">
            <div class="items-header-left">
              <span class="panel-title">
                <el-icon><Memo /></el-icon>
                {{ selectedDict.dictName }}
              </span>
              <el-tag size="small" class="dict-code-tag">{{ selectedDict.dictCode }}</el-tag>
            </div>
            <el-button type="primary" size="small" @click="openAddItem">
              <el-icon><Plus /></el-icon>新增字典项
            </el-button>
          </div>
          <div v-else class="panel-header">
            <span class="panel-title empty-title">
              <el-icon><Memo /></el-icon>
              字典项
            </span>
          </div>
        </template>

        <!-- 未选中字典：引导状态 -->
        <div v-if="!selectedDict" class="guide-state">
          <div class="guide-icon-wrap">
            <el-icon class="guide-icon"><Collection /></el-icon>
          </div>
          <p class="guide-title">请在左侧选择字典</p>
          <p class="guide-desc">选中字典后查看并维护其字典项</p>
        </div>

        <!-- 选中字典：字典项表格 -->
        <el-table
          v-else
          v-loading="itemsLoading"
          :data="itemsList"
          class="items-table"
          row-key="itemId"
          max-height="calc(100vh - 360px)"
        >
          <!-- 字典值 -->
          <el-table-column label="字典值" prop="itemValue" min-width="130">
            <template #default="{ row }">
              <code class="item-value-code">{{ row.itemValue }}</code>
            </template>
          </el-table-column>

          <!-- 显示名称 -->
          <el-table-column label="显示名称" prop="itemLabel" min-width="120" />

          <!-- 排序 -->
          <el-table-column label="排序" prop="sortOrder" width="70" align="center">
            <template #default="{ row }">
              <span class="sort-badge">{{ row.sortOrder }}</span>
            </template>
          </el-table-column>

          <!-- 状态 -->
          <el-table-column label="状态" width="84" align="center">
            <template #default="{ row }">
              <span class="status-badge" :class="row.status === 1 ? 'enabled' : 'disabled'">
                {{ row.status === 1 ? '启用' : '停用' }}
              </span>
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button link type="primary" @click="openEditItem(row)">
                  <el-icon><EditPen /></el-icon>编辑
                </el-button>

                <el-button
                  link
                  :type="row.status === 1 ? 'warning' : 'success'"
                  @click="handleItemStatus(row)"
                >
                  <el-icon>
                    <component :is="row.status === 1 ? 'Remove' : 'CircleCheck'" />
                  </el-icon>
                  {{ row.status === 1 ? '停用' : '启用' }}
                </el-button>

                <el-button link type="danger" @click="handleDeleteItem(row)">
                  <el-icon><Delete /></el-icon>删除
                </el-button>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyState description="该字典暂无字典项，点击右上角新增" />
          </template>
        </el-table>
      </el-card>
    </div>

    <!-- ══ 新建/编辑字典弹窗 ═════════════════════════════════════ -->
    <el-dialog
      v-model="dictDlgVisible"
      :title="isDictEdit ? `编辑字典 · ${editDictRow?.dictName}` : '新增字典'"
      width="440px"
      align-center
      destroy-on-close
      class="form-dialog"
    >
      <el-form
        ref="dictDlgFormRef"
        :model="dictForm"
        :rules="dictFormRules"
        label-position="top"
      >
        <el-form-item label="字典编码" prop="dictCode" required>
          <el-input
            v-model="dictForm.dictCode"
            placeholder="如 security_level（小写字母+下划线）"
            :disabled="isDictEdit"
            clearable
          />
          <div v-if="isDictEdit" class="form-tip">字典编码创建后不可修改</div>
        </el-form-item>

        <el-form-item label="字典名称" prop="dictName" required>
          <el-input
            v-model="dictForm.dictName"
            placeholder="如 密级"
            clearable
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="dictForm.remark"
            type="textarea"
            placeholder="选填，说明该字典的用途"
            :rows="2"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="dictForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dictDlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="dictDlgLoading" class="dlg-primary-btn" @click="handleDictSubmit">
          {{ isDictEdit ? '保存修改' : '创建字典' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ══ 新建/编辑字典项弹窗 ═══════════════════════════════════ -->
    <el-dialog
      v-model="itemDlgVisible"
      :title="itemDlgTitle"
      width="440px"
      align-center
      destroy-on-close
      class="form-dialog"
    >
      <el-form
        ref="itemDlgFormRef"
        :model="itemForm"
        :rules="itemFormRules"
        label-position="top"
      >
        <!-- 所属字典（只读） -->
        <el-form-item label="所属字典">
          <el-input :value="`${selectedDict?.dictName}（${selectedDict?.dictCode}）`" disabled />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="字典值" prop="itemValue" required class="flex-form-item">
            <el-input
              v-model="itemForm.itemValue"
              placeholder="如 secret"
              clearable
              :disabled="isItemEdit"
            />
            <div v-if="isItemEdit" class="form-tip">字典值创建后不可修改</div>
          </el-form-item>

          <el-form-item label="显示名称" prop="itemLabel" required class="flex-form-item">
            <el-input
              v-model="itemForm.itemLabel"
              placeholder="如 机密"
              clearable
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="排序" prop="sortOrder" required class="sort-form-item">
            <el-input-number
              v-model="itemForm.sortOrder"
              :min="1"
              :max="999"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="状态" class="status-form-item">
            <el-radio-group v-model="itemForm.status">
              <el-radio :value="1">启用</el-radio>
              <el-radio :value="0">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>

        <div class="stop-tip">
          <el-icon><InfoFilled /></el-icon>
          停用的字典项不会出现在业务下拉框中（如密级、保管期限选项）
        </div>
      </el-form>

      <template #footer>
        <el-button @click="itemDlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="itemDlgLoading" class="dlg-primary-btn" @click="handleItemSubmit">
          {{ isItemEdit ? '保存修改' : '添加字典项' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
}

// ── 主布局 ────────────────────────────────────────────────────────
.dict-layout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

// ── 通用面板 header ───────────────────────────────────────────────
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;

  .el-icon { color: $color-primary; }

  &.empty-title { color: #94A3B8; .el-icon { color: #CBD5E1; } }
}

.items-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dict-code-tag {
  background: #CCFBF1;
  border-color: #A7F3D0;
  color: $color-primary-dark;
  font-family: monospace;
  font-size: 11px;
}

// ════════════════════════════════════════════════════════════════
// 左侧卡片
// ════════════════════════════════════════════════════════════════
.dict-card {
  width: 300px;
  flex-shrink: 0;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__header) {
    padding: 14px 16px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 12px 8px 8px;
  }
}

// 搜索行
.dict-search {
  display: flex;
  gap: 6px;
  padding: 0 4px 10px;
  flex-wrap: wrap;

  .search-code { flex: 2; }
  .search-name { flex: 3; }

  @media (max-width: 768px) {
    .search-code, .search-name { flex: none; width: 100%; }
  }
}

// 字典列表
.dict-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 520px;
  overflow-y: auto;
  padding: 0 4px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #A7F3D0; border-radius: 2px; }
}

.dict-row {
  position: relative;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  border: 1px solid transparent;

  &:hover {
    background: #F0FDFA;
    border-color: #A7F3D0;

    .dict-row-actions { opacity: 1; }
  }

  &.active {
    background: linear-gradient(135deg, #CCFBF1, #A7F3D0);
    border-color: #5EEAD4;

    .dict-code    { color: $color-primary-dark; }
    .dict-name    { color: $color-text-title; font-weight: 600; }
    .dict-row-actions { opacity: 1; }
  }
}

.dict-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}

.dict-code {
  font-family: monospace;
  font-size: 12px;
  color: $color-primary-dark;
  font-weight: 600;
}

.dict-name {
  font-size: 13px;
  color: $color-text-body;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dict-status {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;

  &.enabled  { background: #D1FAE5; color: #065F46; }
  &.disabled { background: #FEE2E2; color: #991B1B; }
}

// 行操作图标（hover 显示）
.dict-row-actions {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
  background: inherit;
}

.row-action-icon {
  font-size: 15px;
  color: #94A3B8;
  cursor: pointer;
  transition: color 0.15s;

  &:hover        { color: $color-primary; }
  &.danger:hover { color: #DC2626; }
  &.success:hover { color: #16A34A; }
}

// 空状态
.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: #94A3B8;
  font-size: 13px;

  .el-icon { font-size: 32px; color: #CBD5E1; }
}

// 分页
.dict-pagination {
  padding: 8px 0 0;
  display: flex;
  justify-content: center;
}

// ════════════════════════════════════════════════════════════════
// 右侧卡片
// ════════════════════════════════════════════════════════════════
.items-card {
  flex: 1;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;
  min-height: 400px;

  :deep(.el-card__header) {
    padding: 14px 16px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

// 引导空状态
.guide-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 12px;
}

.guide-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, #CCFBF1, #A7F3D0);
  display: flex;
  align-items: center;
  justify-content: center;

  .guide-icon {
    font-size: 32px;
    color: $color-primary-dark;
  }
}

.guide-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text-title;
  margin: 0;
}

.guide-desc {
  font-size: 13px;
  color: #94A3B8;
  margin: 0;
}

// 字典项表格
.items-table {
  :deep(.el-table__header-wrapper th) {
    background: #F8FAFC;
    color: #64748B;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row:hover > td) {
    background-color: #ECFDF5 !important;
  }
}

// 字典值代码样式
.item-value-code {
  font-family: monospace;
  font-size: 12px;
  background: #F1F5F9;
  color: $color-primary-dark;
  padding: 2px 7px;
  border-radius: 5px;
  font-weight: 600;
}

// 排序角标
.sort-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #F1F5F9;
  color: #64748B;
  font-size: 12px;
  font-weight: 600;
}

// 状态胶囊（共用）
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 500;

  &.enabled  { background: #D1FAE5; color: #065F46; }
  &.disabled { background: #F1F5F9; color: #64748B; }
}

// 操作按钮
.action-btns {
  display: flex;
  align-items: center;
  gap: 2px;

  :deep(.el-button.is-link) {
    font-size: 12px;
    padding: 4px 6px;
  }
}

// ════════════════════════════════════════════════════════════════
// 弹窗通用
// ════════════════════════════════════════════════════════════════
.form-dialog {
  :deep(.el-dialog__header) {
    font-weight: 600;
    border-bottom: 1px solid #F1F5F9;
    padding-bottom: 14px;
  }

  :deep(.el-dialog__body) {
    padding: 20px 24px 10px;
  }

  :deep(.el-dialog__footer) {
    padding: 12px 24px 20px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-body;
    padding-bottom: 6px;
  }

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #E2E8F0;

    &:hover   { box-shadow: 0 0 0 1px #5EEAD4; }
    &.is-focus { box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.3); }
  }
}

// 双列表单行
.form-row {
  display: flex;
  gap: 12px;

  .flex-form-item   { flex: 1; min-width: 0; }
  .sort-form-item   { width: 120px; flex-shrink: 0; }
  .status-form-item { flex: 1; }
}

.form-tip {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
}

// 停用提示条
.stop-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 12px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.5;
  margin-bottom: 4px;

  .el-icon {
    color: #F59E0B;
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.dlg-primary-btn {
  border-radius: var(--radius-btn);
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
  }
}
</style>
