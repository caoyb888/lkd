<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UserApi, type UserListVO } from '@/api/system/user'
import { DeptApi } from '@/api/system/dept'
import type { DeptVO } from '@/types/vo'
import { desensitizePhone } from '@/utils/desensitize'
import ViewModeToggle from '@/components/ViewModeToggle.vue'
import { useViewMode } from '@/composables/useViewMode'

// ── 视图模式 ────────────────────────────────────────────────────
const viewMode = useViewMode('user')

// ── 常量 ────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'ROLE_ADMIN',  label: '管理员' },
  { value: 'ROLE_USER',   label: '普通用户' },
  { value: 'ROLE_LEADER', label: '公司领导' },
]
const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map(r => [r.value, r.label]),
)

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{6,}$/

// ── 部门树 ──────────────────────────────────────────────────────
const deptTree = ref<DeptVO[]>([])
const deptTreeProps = { label: 'deptName', value: 'deptId', children: 'children' }

async function loadDeptTree() {
  deptTree.value = await DeptApi.tree().catch(() => [])
}

// ── 搜索 ────────────────────────────────────────────────────────
const search = reactive({
  username: '',
  deptId: undefined as number | undefined,
})

// ── 列表 & 分页 ─────────────────────────────────────────────────
const tableLoading = ref(false)
const tableData   = ref<UserListVO[]>([])
const pagination  = reactive({ current: 1, size: 20, total: 0 })

async function loadList() {
  tableLoading.value = true
  try {
    const res = await UserApi.page({
      current:  pagination.current,
      size:     pagination.size,
      username: search.username || undefined,
      deptId:   search.deptId,
    })
    tableData.value   = res.records
    pagination.total  = res.total
  } finally {
    tableLoading.value = false
  }
}

function handleSearch() {
  pagination.current = 1
  loadList()
}

function handleReset() {
  search.username = ''
  search.deptId   = undefined
  handleSearch()
}

// ── 新建/编辑抽屉 ──────────────────────────────────────────────
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerFormRef = ref<FormInstance>()
const editRow       = ref<UserListVO | null>(null)
const isEdit        = computed(() => editRow.value !== null)
const drawerTitle   = computed(() => isEdit.value ? '编辑用户' : '新建用户')

const drawerForm = reactive({
  username: '',
  nickname: '',
  phone:    '',
  deptId:   undefined as number | undefined,
  roles:    [] as string[],
  password: '',
})

function resetDrawerForm() {
  drawerForm.username = ''
  drawerForm.nickname = ''
  drawerForm.phone    = ''
  drawerForm.deptId   = undefined
  drawerForm.roles    = []
  drawerForm.password = ''
}

// 密码校验：仅新建时强制
function validatePwd(_: unknown, value: string, cb: (e?: Error) => void) {
  if (isEdit.value) { cb(); return }
  if (!value) { cb(new Error('请设置初始密码')); return }
  if (!PASSWORD_REGEX.test(value)) {
    cb(new Error('须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位'))
  } else {
    cb()
  }
}

const drawerRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称',   trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  deptId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  roles:  [{ required: true, type: 'array', min: 1, message: '请至少选择一个角色', trigger: 'change' }],
  password: [{ validator: validatePwd, trigger: ['blur', 'change'] }],
}

function openAdd() {
  editRow.value = null
  resetDrawerForm()
  drawerVisible.value = true
  nextTick(() => drawerFormRef.value?.clearValidate())
}

function openEdit(row: UserListVO) {
  editRow.value = row
  Object.assign(drawerForm, {
    username: row.username,
    nickname: row.nickname,
    phone:    row.phoneRaw || row.phone,
    deptId:   row.deptId,
    roles:    [...row.roles],
    password: '',
  })
  drawerVisible.value = true
  nextTick(() => drawerFormRef.value?.clearValidate())
}

async function handleDrawerSubmit() {
  const valid = await drawerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  drawerLoading.value = true
  try {
    if (isEdit.value) {
      await UserApi.update(editRow.value!.userId, {
        username: drawerForm.username,
        nickname: drawerForm.nickname,
        phone:    drawerForm.phone,
        deptId:   drawerForm.deptId!,
        roles:    drawerForm.roles,
      })
      ElMessage.success('用户信息已更新')
    } else {
      await UserApi.save({
        username: drawerForm.username,
        nickname: drawerForm.nickname,
        phone:    drawerForm.phone,
        deptId:   drawerForm.deptId!,
        roles:    drawerForm.roles,
        password: drawerForm.password,
      })
      ElMessage.success('用户创建成功')
    }
    drawerVisible.value = false
    loadList()
  } finally {
    drawerLoading.value = false
  }
}

// ── 启用 / 禁用 ─────────────────────────────────────────────────
async function handleToggleStatus(row: UserListVO) {
  const toEnable = row.status === 0
  const label    = toEnable ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(
      `确定要${label}用户「${row.nickname}」的账号吗？`,
      `${label}账号`,
      {
        confirmButtonText:  label,
        cancelButtonText:   '取消',
        type:               toEnable ? 'info' : 'warning',
        confirmButtonClass: toEnable ? '' : 'el-button--danger',
      },
    )
    await UserApi.changeStatus(row.userId, toEnable ? 1 : 0)
    ElMessage.success(`账号已${label}`)
    loadList()
  } catch { /* 取消，不操作 */ }
}

// ── 重置密码弹窗 ────────────────────────────────────────────────
const resetDlgVisible = ref(false)
const resetDlgLoading = ref(false)
const resetDlgFormRef = ref<FormInstance>()
const resetTarget     = ref<UserListVO | null>(null)
const resetPwdForm    = reactive({ password: '', confirm: '' })

function validateResetNew(_: unknown, v: string, cb: (e?: Error) => void) {
  if (!v) { cb(new Error('请输入新密码')); return }
  if (!PASSWORD_REGEX.test(v)) {
    cb(new Error('须包含字母、数字及特殊字符（$@!%*#?&），长度 ≥ 6 位'))
  } else {
    if (resetPwdForm.confirm) resetDlgFormRef.value?.validateField('confirm')
    cb()
  }
}
function validateResetConfirm(_: unknown, v: string, cb: (e?: Error) => void) {
  if (!v) { cb(new Error('请再次输入新密码')); return }
  if (v !== resetPwdForm.password) { cb(new Error('两次密码不一致')); return }
  cb()
}

const resetDlgRules: FormRules = {
  password: [{ required: true, validator: validateResetNew,    trigger: ['blur', 'change'] }],
  confirm:  [{ required: true, validator: validateResetConfirm, trigger: ['blur', 'change'] }],
}

function openResetPwd(row: UserListVO) {
  resetTarget.value   = row
  resetPwdForm.password = ''
  resetPwdForm.confirm  = ''
  resetDlgVisible.value = true
  nextTick(() => resetDlgFormRef.value?.clearValidate())
}

async function submitResetPwd() {
  const valid = await resetDlgFormRef.value?.validate().catch(() => false)
  if (!valid || !resetTarget.value) return

  resetDlgLoading.value = true
  try {
    await UserApi.resetPassword(resetTarget.value.userId, resetPwdForm.password)
    ElMessage.success('密码已重置')
    resetDlgVisible.value = false
  } finally {
    resetDlgLoading.value = false
  }
}

// ── 初始化 ──────────────────────────────────────────────────────
onMounted(() => {
  loadDeptTree()
  loadList()
})
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="用户管理"
      :breadcrumbs="[{ label: '系统管理' }, { label: '用户管理' }]"
    />

    <!-- ── 搜索区 ──────────────────────────────────────────────── -->
    <el-card class="search-card" shadow="never">
      <div class="search-row">
        <el-input
          v-model="search.username"
          placeholder="按用户名搜索"
          clearable
          prefix-icon="Search"
          class="search-input"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />

        <el-tree-select
          v-model="search.deptId"
          :data="deptTree"
          :props="deptTreeProps"
          node-key="deptId"
          placeholder="按部门筛选"
          clearable
          check-strictly
          class="search-dept"
          @change="handleSearch"
        />

        <el-button type="primary" class="search-btn" @click="handleSearch">
          <el-icon><Search /></el-icon>查询
        </el-button>
        <el-button class="reset-btn" @click="handleReset">
          <el-icon><Refresh /></el-icon>重置
        </el-button>
      </div>
    </el-card>

    <!-- ── 工具栏 + 表格 ───────────────────────────────────────── -->
    <el-card class="table-card" shadow="never">
      <div class="toolbar">
        <span class="toolbar-title">
          共 <strong>{{ pagination.total }}</strong> 条记录
        </span>
        <div class="toolbar-right">
          <ViewModeToggle v-model="viewMode" />
          <el-button type="primary" class="add-btn" @click="openAdd">
            <el-icon><Plus /></el-icon>新建用户
          </el-button>
        </div>
      </div>

      <el-table
        v-if="viewMode === 'table'"
        v-loading="tableLoading"
        :data="tableData"
        row-key="userId"
        class="user-table"
        stripe
        max-height="calc(100vh - 300px)"
      >
        <!-- 用户名 -->
        <el-table-column label="用户名" prop="username" min-width="120" />

        <!-- 昵称 -->
        <el-table-column label="昵称" prop="nickname" min-width="110" />

        <!-- 手机号（脱敏展示） -->
        <el-table-column label="手机号" min-width="130">
          <template #default="{ row }">
            <span class="phone-text">{{ desensitizePhone(row.phone) }}</span>
          </template>
        </el-table-column>

        <!-- 部门 -->
        <el-table-column label="所属部门" prop="deptName" min-width="120" />

        <!-- 角色 -->
        <el-table-column label="角色" min-width="160">
          <template #default="{ row }">
            <div class="role-tags">
              <span
                v-for="r in row.roles"
                :key="r"
                class="role-tag"
                :class="r.toLowerCase()"
              >
                {{ ROLE_LABEL[r] ?? r }}
              </span>
            </div>
          </template>
        </el-table-column>

        <!-- 账号状态 -->
        <el-table-column label="账号状态" width="100" align="center">
          <template #default="{ row }">
            <span class="status-badge" :class="row.status === 1 ? 'enabled' : 'disabled'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </span>
          </template>
        </el-table-column>

        <!-- 创建时间 -->
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            <span class="time-text">{{ row.createdAt?.slice(0, 16).replace('T', ' ') }}</span>
          </template>
        </el-table-column>

        <!-- 操作栏 -->
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button link type="primary" @click="openEdit(row)">
                <el-icon><EditPen /></el-icon>编辑
              </el-button>

              <el-button
                link
                :type="row.status === 1 ? 'danger' : 'success'"
                @click="handleToggleStatus(row)"
              >
                <el-icon><component :is="row.status === 1 ? 'CircleClose' : 'CircleCheck'" /></el-icon>
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>

              <el-button link type="warning" @click="openResetPwd(row)">
                <el-icon><Key /></el-icon>重置密码
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <EmptyState description="暂无用户数据" />
        </template>
      </el-table>

      <!-- 卡片视图 -->
      <div v-else v-loading="tableLoading" class="card-grid-wrap">
        <EmptyState
          v-if="!tableLoading && tableData.length === 0"
          description="暂无用户数据"
        />

        <div class="card-grid">
          <div
            v-for="row in tableData"
            :key="row.userId"
            class="archive-card"
          >
            <div class="archive-card-icon-wrap">
              <el-icon class="archive-card-icon"><User /></el-icon>
            </div>
            <div class="archive-card-body">
              <div class="archive-card-no">{{ row.username }}</div>
              <div class="archive-card-title" :title="row.nickname">
                {{ row.nickname }}
              </div>
              <div class="archive-card-meta">
                <span class="meta-text">{{ row.deptName || '—' }}</span>
              </div>
              <div class="archive-card-meta">
                <span
                  v-for="r in row.roles"
                  :key="r"
                  class="role-tag"
                  :class="r.toLowerCase()"
                >
                  {{ ROLE_LABEL[r] ?? r }}
                </span>
              </div>
            </div>
            <div class="archive-card-footer">
              <span class="status-badge" :class="row.status === 1 ? 'enabled' : 'disabled'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </span>
              <el-button link type="primary" @click.stop="openEdit(row)">
                <el-icon><EditPen /></el-icon>编辑
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @change="loadList"
        />
      </div>
    </el-card>

    <!-- ── 新建/编辑 对话框 ──────────────────────────────────────── -->
    <el-dialog
      v-model="drawerVisible"
      :title="drawerTitle"
      width="480px"
      align-center
      destroy-on-close
      class="user-dialog"
    >
      <el-form
        ref="drawerFormRef"
        :model="drawerForm"
        :rules="drawerRules"
        label-position="top"
        class="dialog-form"
      >
        <!-- 用户名（编辑时只读） -->
        <el-form-item label="用户名" prop="username" required>
          <el-input
            v-model="drawerForm.username"
            placeholder="请输入用户名（用于登录）"
            :disabled="isEdit"
            clearable
          />
          <div v-if="isEdit" class="field-tip">用户名创建后不可修改</div>
        </el-form-item>

        <!-- 昵称 -->
        <el-form-item label="昵称" prop="nickname" required>
          <el-input v-model="drawerForm.nickname" placeholder="请输入显示昵称" clearable />
        </el-form-item>

        <!-- 手机号 -->
        <el-form-item label="手机号" prop="phone" required>
          <el-input
            v-model="drawerForm.phone"
            placeholder="请输入手机号"
            clearable
            maxlength="11"
          />
        </el-form-item>

        <!-- 所属部门 -->
        <el-form-item label="所属部门" prop="deptId" required>
          <el-tree-select
            v-model="drawerForm.deptId"
            :data="deptTree"
            :props="deptTreeProps"
            node-key="deptId"
            placeholder="请选择所属部门"
            clearable
            check-strictly
            filterable
            style="width: 100%"
          />
        </el-form-item>

        <!-- 角色 -->
        <el-form-item label="角色" prop="roles" required>
          <el-select
            v-model="drawerForm.roles"
            multiple
            placeholder="请选择角色（可多选）"
            style="width: 100%"
          >
            <el-option
              v-for="opt in ROLE_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- 初始密码（仅新建时显示） -->
        <el-form-item v-if="!isEdit" label="初始密码" prop="password" required>
          <el-input
            v-model="drawerForm.password"
            type="password"
            placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
            show-password
            clearable
          />
          <div class="field-tip pwd-tip">
            <el-icon><InfoFilled /></el-icon>
            密码须同时包含字母、数字、特殊字符（$&nbsp;@&nbsp;!&nbsp;%&nbsp;*&nbsp;#&nbsp;?&nbsp;&amp;），且长度 ≥ 6 位
          </div>
        </el-form-item>
      </el-form>

      <!-- 对话框底部按钮 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="drawerLoading"
            class="submit-btn"
            @click="handleDrawerSubmit"
          >
            {{ isEdit ? '保存修改' : '创建用户' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ── 重置密码弹窗 ─────────────────────────────────────────── -->
    <el-dialog
      v-model="resetDlgVisible"
      title="重置密码"
      width="420px"
      align-center
      destroy-on-close
      class="reset-pwd-dialog"
    >
      <div class="reset-pwd-tip">
        <el-icon class="tip-icon"><Warning /></el-icon>
        正在为用户「<strong>{{ resetTarget?.nickname }}</strong>」重置密码，请谨慎操作。
      </div>

      <el-form
        ref="resetDlgFormRef"
        :model="resetPwdForm"
        :rules="resetDlgRules"
        label-position="top"
        class="reset-pwd-form"
      >
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="resetPwdForm.password"
            type="password"
            placeholder="字母 + 数字 + 特殊字符，长度 ≥ 6 位"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirm">
          <el-input
            v-model="resetPwdForm.confirm"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            @keyup.enter="submitResetPwd"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="resetDlgVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="resetDlgLoading"
          class="submit-btn"
          @click="submitResetPwd"
        >
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
}

// ── 搜索区 ────────────────────────────────────────────────────────
.search-card {
  margin-bottom: 16px;
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__body) { padding: 12px 20px; }
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input { width: 220px; }
.search-dept  { width: 200px; }

@media (max-width: 768px) {
  .search-input, .search-dept { width: 100%; }
}

.search-btn,
.reset-btn {
  border-radius: var(--radius-btn);
}

.search-btn {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
  }
}

// ── 表格区 ────────────────────────────────────────────────────────
.table-card {
  border-radius: var(--radius-card);
  border-color: #E2E8F0;

  :deep(.el-card__body) { padding: 0; }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 8px;
  border-bottom: 1px solid #F1F5F9;

  .toolbar-title {
    font-size: 13px;
    color: #94A3B8;

    strong { color: $color-primary-dark; }
  }
}

.add-btn {
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

.user-table {
  :deep(.el-table__header-wrapper th) {
    background: #F8FAFC;
    color: #64748B;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-table__row:hover > td) {
    background-color: var(--theme-bg-light) !important;
  }

  :deep(.el-table__row.el-table__row--striped > td) {
    background: #FAFAFA;
  }
}

.phone-text {
  font-size: 13px;
  color: $color-text-body;
  letter-spacing: 0.5px;
}

.time-text {
  font-size: 12px;
  color: #94A3B8;
}

// 角色标签
.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-tag);
  font-size: 11px;
  font-weight: 500;

  &.role_admin  { background: var(--theme-border-light); color: #065F46; }
  &.role_user   { background: #DBEAFE; color: #1D4ED8; }
  &.role_leader { background: #EDE9FE; color: #5B21B6; }
}

// 账号状态徽章
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 500;

  &.enabled  { background: var(--theme-border-light); color: #065F46; }
  &.disabled { background: #FEE2E2; color: #991B1B; }
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

// 分页
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid #F1F5F9;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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

// ── 对话框 ──────────────────────────────────────────────────────────
.user-dialog {
  :deep(.el-dialog__header) {
    font-size: 16px;
    font-weight: 600;
    color: $color-text-title;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #F1F5F9;
    margin-bottom: 0;
  }

  :deep(.el-dialog__body) {
    padding: 16px 24px 24px;
    overflow-y: auto;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px;
    border-top: 1px solid #F1F5F9;
  }
}

.dialog-form {
  :deep(.el-form-item__label) {
    font-size: 13px;
    font-weight: 600;
    color: $color-text-body;
    padding-bottom: 6px;
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #E2E8F0;

    &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
    &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 30%, transparent); }
  }
}

.field-tip {
  margin-top: 5px;
  font-size: 12px;
  color: #94A3B8;
}

.pwd-tip {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  padding: 7px 10px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  color: #92400E;
  line-height: 1.5;

  .el-icon {
    color: #F59E0B;
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.submit-btn {
  border-radius: var(--radius-btn);
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--color-primary) 38%, transparent);
  }
}

// ── 重置密码弹窗 ──────────────────────────────────────────────────
.reset-pwd-dialog {
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
}

.reset-pwd-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #FFF7ED;
  border: 1px solid #FED7AA;
  border-radius: 10px;
  font-size: 13px;
  color: #92400E;
  margin-bottom: 20px;
  line-height: 1.5;

  .tip-icon {
    color: $color-accent;
    font-size: 18px;
    flex-shrink: 0;
  }

  strong { color: #78350F; }
}

.reset-pwd-form {
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
</style>
