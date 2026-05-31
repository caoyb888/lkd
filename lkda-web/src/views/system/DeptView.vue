<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DeptApi } from '@/api/system/dept'
import type { DeptVO } from '@/types/vo'

// ── 树配置 ──────────────────────────────────────────────────────
const treeNodeProps = { label: 'deptName', children: 'children' }

// ── 树数据 ──────────────────────────────────────────────────────
const treeLoading = ref(false)
const treeData    = ref<DeptVO[]>([])
const treeRef     = ref()

async function loadTree() {
  treeLoading.value = true
  try {
    treeData.value = await DeptApi.tree()
    // 同步 currentNode 引用到新树对象，恢复高亮
    if (currentNode.value) {
      const refreshed = findNode(treeData.value, currentNode.value.deptId)
      if (refreshed) currentNode.value = refreshed
      nextTick(() => treeRef.value?.setCurrentKey(currentNode.value!.deptId))
    }
  } finally {
    treeLoading.value = false
  }
}

// ── 当前选中节点 ────────────────────────────────────────────────
const currentNode = ref<DeptVO | null>(null)

// DFS 按 deptId 查找节点
function findNode(tree: DeptVO[], deptId: number): DeptVO | null {
  for (const n of tree) {
    if (n.deptId === deptId) return n
    if (n.children?.length) {
      const found = findNode(n.children, deptId)
      if (found) return found
    }
  }
  return null
}

// 向上找父节点（DFS）
function findParent(tree: DeptVO[], deptId: number): DeptVO | null {
  for (const n of tree) {
    if (n.children?.some(c => c.deptId === deptId)) return n
    if (n.children?.length) {
      const found = findParent(n.children, deptId)
      if (found) return found
    }
  }
  return null
}

const parentNode = computed(() =>
  currentNode.value ? findParent(treeData.value, currentNode.value.deptId) : null,
)

const isLeaf = computed(() =>
  !currentNode.value?.children?.length,
)

function handleNodeClick(data: DeptVO) {
  currentNode.value = data
}

// ── 拖拽排序 ────────────────────────────────────────────────────
// el-tree 拖拽会在 node-drop 前已将 treeData 内存中更新
// 我们从更新后的树重新计算位置并持久化
async function handleNodeDrop(draggingNode: any) {
  const dragging = draggingNode.data as DeptVO
  const parent   = findParent(treeData.value, dragging.deptId)
  const siblings = parent?.children ?? treeData.value
  const idx      = siblings.findIndex(s => s.deptId === dragging.deptId)

  try {
    await DeptApi.update(dragging.deptId, {
      deptName:  dragging.deptName,
      parentId:  parent?.deptId ?? 0,
      sortOrder: idx + 1,
    })
    await loadTree()
  } catch {
    await loadTree()   // 失败时回滚到服务端数据
  }
}

// 只允许前/后放置（同级排序），不允许移入子树（避免父级变化的复杂性）
function allowDrop(_draggingNode: any, dropNode: any, type: string) {
  if (type === 'inner') return false
  // 不允许拖到根层级之外
  return true
}

// ── 新增部门弹窗 ────────────────────────────────────────────────
const addDlgVisible = ref(false)
const addDlgLoading = ref(false)
const addDlgFormRef = ref<FormInstance>()
const addParentId   = ref(0)         // 0 = 根部门
const addParentName = ref('（顶层）') // 仅用于展示

const addForm = ref({ deptName: '', sortOrder: 1 })

const addDlgRules: FormRules = {
  deptName: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { max: 50, message: '部门名称不超过 50 个字符', trigger: 'blur' },
  ],
  sortOrder: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
}

function openAddRoot() {
  addParentId.value   = 0
  addParentName.value = '（顶层）'
  addForm.value       = { deptName: '', sortOrder: (treeData.value.length ?? 0) + 1 }
  addDlgVisible.value = true
  nextTick(() => addDlgFormRef.value?.clearValidate())
}

function openAddChild() {
  if (!currentNode.value) return
  addParentId.value   = currentNode.value.deptId
  addParentName.value = currentNode.value.deptName
  addForm.value       = {
    deptName:  '',
    sortOrder: (currentNode.value.children?.length ?? 0) + 1,
  }
  addDlgVisible.value = true
  nextTick(() => addDlgFormRef.value?.clearValidate())
}

async function handleAddSubmit() {
  const valid = await addDlgFormRef.value?.validate().catch(() => false)
  if (!valid) return

  addDlgLoading.value = true
  try {
    await DeptApi.save({
      deptName:  addForm.value.deptName,
      parentId:  addParentId.value,
      sortOrder: addForm.value.sortOrder,
    })
    ElMessage.success('部门创建成功')
    addDlgVisible.value = false
    await loadTree()
    // 若是子部门，展开父节点
    if (addParentId.value !== 0) {
      nextTick(() => treeRef.value?.setCurrentKey(addParentId.value))
    }
  } finally {
    addDlgLoading.value = false
  }
}

// ── 编辑部门弹窗 ────────────────────────────────────────────────
const editDlgVisible = ref(false)
const editDlgLoading = ref(false)
const editDlgFormRef = ref<FormInstance>()

const editForm = ref({ deptName: '', sortOrder: 1 })

const editDlgRules: FormRules = {
  deptName: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { max: 50, message: '部门名称不超过 50 个字符', trigger: 'blur' },
  ],
  sortOrder: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
}

function openEdit() {
  if (!currentNode.value) return
  editForm.value      = {
    deptName:  currentNode.value.deptName,
    sortOrder: currentNode.value.sortOrder,
  }
  editDlgVisible.value = true
  nextTick(() => editDlgFormRef.value?.clearValidate())
}

async function handleEditSubmit() {
  const valid = await editDlgFormRef.value?.validate().catch(() => false)
  if (!valid || !currentNode.value) return

  editDlgLoading.value = true
  try {
    await DeptApi.update(currentNode.value.deptId, {
      deptName:  editForm.value.deptName,
      parentId:  currentNode.value.parentId,
      sortOrder: editForm.value.sortOrder,
    })
    ElMessage.success('部门信息已更新')
    editDlgVisible.value = false
    // 同步内存数据（避免重载时闪烁）
    currentNode.value.deptName  = editForm.value.deptName
    currentNode.value.sortOrder = editForm.value.sortOrder
    await loadTree()
  } finally {
    editDlgLoading.value = false
  }
}

// ── 删除部门 ────────────────────────────────────────────────────
async function handleDelete() {
  if (!currentNode.value) return
  if (!isLeaf.value) {
    ElMessage.warning('请先删除该部门下的所有子部门')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除部门「${currentNode.value.deptName}」吗？删除后不可恢复。`,
      '删除部门',
      {
        confirmButtonText:  '删除',
        cancelButtonText:   '取消',
        type:               'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
    await DeptApi.delete(currentNode.value.deptId)
    ElMessage.success('部门已删除')
    currentNode.value = null
    await loadTree()
  } catch { /* 取消 */ }
}

// ── 初始化 ──────────────────────────────────────────────────────
onMounted(loadTree)
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="部门管理"
      :breadcrumbs="[{ label: '系统管理' }, { label: '部门管理' }]"
    />

    <div class="dept-layout">
      <!-- ── 左侧：树形面板 ─────────────────────────────────────── -->
      <el-card class="tree-card" shadow="never" v-loading="treeLoading">
        <!-- 卡片标题栏 -->
        <template #header>
          <div class="tree-header">
            <span class="tree-title">
              <el-icon><OfficeBuilding /></el-icon>
              部门层级
            </span>
            <div class="tree-actions">
              <el-tooltip content="新增根部门" placement="top">
                <el-button
                  type="primary"
                  size="small"
                  circle
                  @click="openAddRoot"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="刷新" placement="top">
                <el-button size="small" circle @click="loadTree">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </template>

        <!-- 部门树 -->
        <el-tree
          v-if="treeData.length"
          ref="treeRef"
          :data="treeData"
          :props="treeNodeProps"
          node-key="deptId"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          draggable
          :allow-drop="allowDrop"
          class="dept-tree"
          @node-click="handleNodeClick"
          @node-drop="handleNodeDrop"
        >
          <template #default="{ data }">
            <span class="tree-node-wrap">
              <!-- 图标：叶节点用 Document，父节点用 Folder -->
              <el-icon class="node-icon">
                <component :is="data.children?.length ? 'FolderOpened' : 'Document'" />
              </el-icon>
              <span class="node-name">{{ data.deptName }}</span>
              <!-- 子部门数量角标 -->
              <span v-if="data.children?.length" class="node-badge">
                {{ data.children.length }}
              </span>
              <!-- 拖拽提示图标 -->
              <el-icon class="drag-icon"><Rank /></el-icon>
            </span>
          </template>
        </el-tree>

        <!-- 空状态 -->
        <div v-else class="tree-empty">
          <el-icon class="empty-icon"><OfficeBuilding /></el-icon>
          <p>暂无部门数据</p>
          <el-button type="primary" size="small" @click="openAddRoot">
            新增根部门
          </el-button>
        </div>
      </el-card>

      <!-- ── 右侧：操作区 ──────────────────────────────────────── -->
      <el-card class="detail-card" shadow="never">
        <!-- header 插槽始终在顶层，内容根据选中状态切换 -->
        <template #header>
          <div v-if="currentNode" class="detail-header">
            <div class="detail-title">
              <el-icon><OfficeBuilding /></el-icon>
              {{ currentNode.deptName }}
            </div>
            <div class="detail-breadcrumb">
              <span v-if="parentNode">{{ parentNode.deptName }}</span>
              <span v-else>顶层部门</span>
              <el-icon v-if="parentNode"><ArrowRight /></el-icon>
              <span v-if="parentNode" class="current-crumb">{{ currentNode.deptName }}</span>
            </div>
          </div>
          <div v-else class="detail-header-empty">
            <el-icon><OfficeBuilding /></el-icon>
            操作区
          </div>
        </template>

        <!-- 未选择节点：引导状态 -->
        <div v-if="!currentNode" class="guide-state">
          <div class="guide-icon-wrap">
            <el-icon class="guide-icon"><OfficeBuilding /></el-icon>
          </div>
          <p class="guide-title">请在左侧选择部门节点</p>
          <p class="guide-desc">选中节点后可查看详情、新增子部门、编辑或删除</p>
          <el-button type="primary" class="guide-btn" @click="openAddRoot">
            <el-icon><Plus /></el-icon>新增根部门
          </el-button>
        </div>

        <!-- 选中节点：详情 + 操作 -->
        <div v-else>
          <!-- 信息网格 -->
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">部门名称</span>
              <span class="info-value">{{ currentNode.deptName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">上级部门</span>
              <span class="info-value">{{ parentNode?.deptName ?? '—（顶层）' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">排序编号</span>
              <span class="info-value">{{ currentNode.sortOrder }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">子部门数</span>
              <span class="info-value">
                <span class="child-count">{{ currentNode.children?.length ?? 0 }}</span> 个
              </span>
            </div>
          </div>

          <!-- 操作按钮列表 -->
          <div class="action-section">
            <div class="action-title">操作</div>
            <div class="action-btns">

              <div class="action-item" @click="openAddChild">
                <div class="action-icon-wrap green">
                  <el-icon><FolderAdd /></el-icon>
                </div>
                <div class="action-text">
                  <span class="action-name">新增子部门</span>
                  <span class="action-desc">在「{{ currentNode.deptName }}」下添加</span>
                </div>
                <el-icon class="action-arrow"><ArrowRight /></el-icon>
              </div>

              <div class="action-item" @click="openEdit">
                <div class="action-icon-wrap blue">
                  <el-icon><EditPen /></el-icon>
                </div>
                <div class="action-text">
                  <span class="action-name">编辑部门</span>
                  <span class="action-desc">修改名称和排序编号</span>
                </div>
                <el-icon class="action-arrow"><ArrowRight /></el-icon>
              </div>

              <div
                class="action-item"
                :class="{ disabled: !isLeaf }"
                @click="handleDelete"
              >
                <div class="action-icon-wrap red">
                  <el-icon><Delete /></el-icon>
                </div>
                <div class="action-text">
                  <span class="action-name">删除部门</span>
                  <span class="action-desc">
                    {{ isLeaf ? '无子部门时可删除' : '请先删除所有子部门' }}
                  </span>
                </div>
                <el-icon v-if="isLeaf" class="action-arrow"><ArrowRight /></el-icon>
                <el-tag v-else size="small" type="info" class="cant-delete-tag">不可删除</el-tag>
              </div>

            </div>
          </div>

          <!-- 拖拽提示 -->
          <div class="drag-tip">
            <el-icon><Rank /></el-icon>
            可在左侧树中拖拽节点调整同级顺序
          </div>
        </div>
      </el-card>
    </div>

    <!-- ── 新增部门弹窗 ──────────────────────────────────────────── -->
    <el-dialog
      v-model="addDlgVisible"
      :title="addParentId === 0 ? '新增根部门' : `新增子部门 · ${addParentName}`"
      width="400px"
      align-center
      destroy-on-close
      class="dept-dialog"
    >
      <el-form
        ref="addDlgFormRef"
        :model="addForm"
        :rules="addDlgRules"
        label-position="top"
      >
        <el-form-item label="上级部门">
          <el-input :value="addParentName" disabled />
        </el-form-item>
        <el-form-item label="部门名称" prop="deptName" required>
          <el-input
            v-model="addForm.deptName"
            placeholder="请输入部门名称"
            clearable
            autofocus
            @keyup.enter="handleAddSubmit"
          />
        </el-form-item>
        <el-form-item label="排序编号" prop="sortOrder" required>
          <el-input-number
            v-model="addForm.sortOrder"
            :min="1"
            :max="999"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="addDlgLoading" class="dlg-submit-btn" @click="handleAddSubmit">
          创建部门
        </el-button>
      </template>
    </el-dialog>

    <!-- ── 编辑部门弹窗 ──────────────────────────────────────────── -->
    <el-dialog
      v-model="editDlgVisible"
      :title="`编辑部门 · ${currentNode?.deptName}`"
      width="400px"
      align-center
      destroy-on-close
      class="dept-dialog"
    >
      <el-form
        ref="editDlgFormRef"
        :model="editForm"
        :rules="editDlgRules"
        label-position="top"
      >
        <el-form-item label="部门名称" prop="deptName" required>
          <el-input
            v-model="editForm.deptName"
            placeholder="请输入部门名称"
            clearable
            autofocus
            @keyup.enter="handleEditSubmit"
          />
        </el-form-item>
        <el-form-item label="排序编号" prop="sortOrder" required>
          <el-input-number
            v-model="editForm.sortOrder"
            :min="1"
            :max="999"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-tip">数字越小越靠前</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDlgVisible = false">取消</el-button>
        <el-button type="primary" :loading="editDlgLoading" class="dlg-submit-btn" @click="handleEditSubmit">
          保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
}

// ── 主布局：左树 + 右详情 ─────────────────────────────────────────
.dept-layout {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

// ── 左侧树卡片 ───────────────────────────────────────────────────
.tree-card {
  width: 300px;
  flex-shrink: 0;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__header) {
    padding: 14px 16px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 8px 4px;
    min-height: 280px;
  }
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;

  .el-icon { color: $color-primary; }
}

.tree-actions {
  display: flex;
  gap: 6px;
}

// 树组件样式覆盖
.dept-tree {
  :deep(.el-tree-node__content) {
    height: 38px;
    border-radius: 8px;
    margin: 1px 4px;
    transition: background 0.15s;

    &:hover { background: var(--theme-bg-light); }
  }

  :deep(.el-tree-node.is-current > .el-tree-node__content) {
    background: linear-gradient(135deg, $color-primary, $color-primary-dark) !important;

    .node-name      { color: #fff !important; font-weight: 600; }
    .node-icon      { color: #fff !important; }
    .node-badge     { background: rgba(255,255,255,0.25) !important; color: #fff !important; }
    .drag-icon      { color: rgba(255,255,255,0.6) !important; }
  }

  :deep(.el-tree-node__expand-icon) {
    color: #94A3B8;

    &.is-leaf { color: transparent; }
  }
}

.tree-node-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  padding-right: 6px;
}

.node-icon {
  font-size: 14px;
  color: $color-primary;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  font-size: 13px;
  color: $color-text-title;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-badge {
  flex-shrink: 0;
  background: var(--theme-bg-lighter);
  color: $color-primary-dark;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 99px;
  line-height: 1.6;
}

.drag-icon {
  flex-shrink: 0;
  color: #CBD5E1;
  font-size: 14px;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;

  .dept-tree :deep(.el-tree-node__content):hover & {
    opacity: 1;
  }
}

// 树空状态
.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  gap: 10px;
  color: #94A3B8;

  .empty-icon {
    font-size: 40px;
    color: #CBD5E1;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

// ── 右侧详情卡片 ─────────────────────────────────────────────────
.detail-card {
  flex: 1;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;
  min-height: 360px;

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom-color: #F1F5F9;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

// 引导空状态
.guide-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  gap: 12px;
}

.guide-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;

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
  line-height: 1.6;
}

.guide-btn {
  margin-top: 4px;
  border-radius: var(--radius-btn);
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
  }
}

// 详情 header（空态）
.detail-header-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  color: #94A3B8;

  .el-icon { color: #CBD5E1; }
}

// 详情 header（选中态）
.detail-header {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 4px;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 16px;
  font-weight: 700;
  color: $color-text-title;

  .el-icon { color: $color-primary; }
}

.detail-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94A3B8;

  .current-crumb { color: $color-primary; font-weight: 600; }

  .el-icon { font-size: 10px; }
}

// 信息网格
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #F8FAFC;
  border-radius: 10px;
  border: 1px solid #F1F5F9;
}

.info-label {
  font-size: 11px;
  color: #94A3B8;
  letter-spacing: 0.3px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;
}

.child-count {
  font-size: 18px;
  color: $color-primary;
}

// 操作区
.action-section {
  margin-bottom: 20px;
}

.action-title {
  font-size: 12px;
  color: #94A3B8;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-left: 2px;
}

.action-btns {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #F1F5F9;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;

  &:hover:not(.disabled) {
    border-color: var(--theme-border-medium);
    background: var(--theme-bg-soft);
    transform: translateX(2px);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

.action-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .el-icon { font-size: 16px; }

  &.green { background: #DCFCE7; .el-icon { color: #16A34A; } }
  &.blue  { background: #DBEAFE; .el-icon { color: #2563EB; } }
  &.red   { background: #FEE2E2; .el-icon { color: #DC2626; } }
}

.action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.action-name {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-title;
}

.action-desc {
  font-size: 11px;
  color: #94A3B8;
}

.action-arrow {
  color: #CBD5E1;
  font-size: 14px;
  flex-shrink: 0;
}

.cant-delete-tag {
  flex-shrink: 0;
}

// 拖拽提示
.drag-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94A3B8;
  padding: 8px 12px;
  background: #F8FAFC;
  border-radius: 8px;
  border: 1px dashed #E2E8F0;

  .el-icon { color: #CBD5E1; }
}

// ── 弹窗通用样式 ─────────────────────────────────────────────────
.dept-dialog {
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

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #E2E8F0;

    &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
    &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 30%, transparent); }
  }
}

.form-tip {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 5px;
}

.dlg-submit-btn {
  border-radius: var(--radius-btn);
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
  }
}
</style>
