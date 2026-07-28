<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { useAuthStore } from '@/stores/auth'
import { VolumeApi, type ArchiveVolumeSaveDTO } from '@/api/volume'
import type { ArchiveVolumeDetailVO } from '@/types/vo'

const route     = useRoute()
const router    = useRouter()
const dictStore = useDictStore()
const authStore = useAuthStore()

// ── 模式判断 ────────────────────────────────────────────────────
const recordId  = computed(() => route.params.id ? Number(route.params.id) : undefined)
const isEdit    = computed(() => !!recordId.value)
const pageTitle = computed(() => isEdit.value ? '编辑案卷' : '新建案卷')

const yearFromQuery = computed(() => route.query.year as string | undefined)

async function resolveYear(): Promise<string | undefined> {
  if (yearFromQuery.value) return yearFromQuery.value
  if (!recordId.value) return undefined
  try {
    const res = await VolumeApi.page({ current: 1, size: 1, keyword: String(recordId.value) })
    return res.records[0]?.year
  } catch { return undefined }
}

// ── 字典选项 ────────────────────────────────────────────────────
const fondsNoOptions       = computed(() => dictStore.getDictItems('fonds_no'))
const categoryL1Options    = computed(() => dictStore.getDictItems('category_l1'))
const categoryL2Options    = computed(() => dictStore.getDictItems('category_l2'))
const categoryL3Options    = computed(() => dictStore.getDictItems('category_l3'))
const equipCodeOptions     = computed(() => dictStore.getDictItems('equipment_code'))
const securityOptions      = computed(() => dictStore.getDictItems('security_level'))
const retentionOptions     = computed(() => dictStore.getDictItems('retention_period'))

// ── 年度选项（当前年往前 10 年）────────────────────────────────
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: currentYear - 2017 }, (_, i) => String(currentYear - i))

// ── 表单数据 ────────────────────────────────────────────────────
const formRef = ref<FormInstance>()
const form = reactive<ArchiveVolumeSaveDTO & { compileDate: string; archiveDate: string; compiler: string }>({
  fondsNo:        '',
  year:           String(currentYear),
  categoryL1:     '',
  categoryL2:     '',
  categoryL3:     '',
  deviceCode:     '',
  volumeTitle:    '',
  compileUnit:    '',
  securityLevel:  '',
  retentionPeriod:'',
  copies:         1,
  totalPages:     undefined,
  compiler:       authStore.userInfo?.nickname ?? '',
  compileDate:    '',
  reviewer:       '',
  archiveDate:    '',
  remark:         '',
  notes:          '',
})

// ── 状态 ────────────────────────────────────────────────────────
const currentStatus = ref(0)
const readonly      = computed(() => currentStatus.value > 0)
const loading       = ref(false)
const saving        = ref(false)
const submitting    = ref(false)

// ── 档号预览 ────────────────────────────────────────────────────
const archiveNoPreview = ref('')
const previewLoading   = ref(false)

const canPreview = computed(() =>
  !!form.fondsNo && !!form.year && !!form.categoryL1 && !!form.deviceCode
)

let previewTimer: ReturnType<typeof setTimeout> | null = null

async function fetchPreviewNo() {
  if (!canPreview.value) {
    archiveNoPreview.value = ''
    return
  }
  previewLoading.value = true
  try {
    archiveNoPreview.value = await VolumeApi.previewNo({
      fondsNo:      form.fondsNo,
      categoryL1:   form.categoryL1,
      categoryL2:   form.categoryL2 || undefined,
      categoryL3:   form.categoryL3 || undefined,
      deviceCode:   form.deviceCode,
      year:         form.year,
    })
  } catch {
    // 错误由 http 拦截器统一提示
  } finally {
    previewLoading.value = false
  }
}

const previewWatchSource = computed(() => ({
  fondsNo:      form.fondsNo,
  year:         form.year,
  categoryL1:   form.categoryL1,
  categoryL2:   form.categoryL2,
  categoryL3:   form.categoryL3,
  deviceCode:form.deviceCode,
}))

watch(previewWatchSource, () => {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(fetchPreviewNo, 300)
}, { deep: true })

// 类目联动重置
watch(() => form.categoryL1, () => { form.categoryL2 = ''; form.categoryL3 = '' })
watch(() => form.categoryL2, () => { form.categoryL3 = '' })

// ── 编辑回填 ────────────────────────────────────────────────────
async function loadDetail() {
  if (!recordId.value) return
  loading.value = true
  try {
    const y = await resolveYear()
    if (!y) throw new Error('无法确定案卷年度')
    const d = await VolumeApi.detail(recordId.value, y) as ArchiveVolumeDetailVO
    currentStatus.value = d.status
    Object.assign(form, {
      fondsNo:        d.fondsNo        ?? '',
      year:           d.year           ?? String(currentYear),
      categoryL1:     d.categoryL1     ?? '',
      categoryL2:     d.categoryL2     ?? '',
      categoryL3:     d.categoryL3     ?? '',
      deviceCode:  d.deviceCode  ?? '',
      volumeTitle:    d.volumeTitle    ?? '',
      compileUnit:  d.compileUnit  ?? '',
      securityLevel:  d.securityLevel  ?? '',
      retentionPeriod:d.retentionPeriod?? '',
      copies:         d.copies         ?? 1,
      totalPages:      d.totalPages      || undefined,
      compiler:   d.compiler   ?? '',
      compileDate:    d.compileDate    ?? '',
      reviewer:   d.reviewer   ?? '',
      archiveDate:    d.archiveDate    ?? '',
      remark:         d.remark         ?? '',
      notes:           d.notes           ?? '',
    })
    archiveNoPreview.value = d.archiveNo ?? ''
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!dictStore.loaded) {
    await dictStore.loadAll().catch(() => {})
  }
  loadDetail()
})

// ── 校验规则 ────────────────────────────────────────────────────
const rules: FormRules = {
  fondsNo:      [{ required: true, message: '请选择全宗号',   trigger: 'change' }],
  year:         [{ required: true, message: '请选择年度',     trigger: 'change' }],
  categoryL1:   [{ required: true, message: '请选择一级类目', trigger: 'change' }],
  deviceCode:[{ required: true, message: '请选择设备代号', trigger: 'change' }],
  volumeTitle:  [
    { required: true, message: '请输入案卷题名', trigger: 'blur' },
    { max: 200,       message: '不超过 200 字',  trigger: 'blur' },
  ],
  copies: [
    { type: 'number', min: 1, message: '件数最小为 1', trigger: 'blur' },
  ],
}

// ── 操作 ─────────────────────────────────────────────────────────
function handleCancel() {
  router.back()
}

async function saveDraft() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (isEdit.value) {
      await VolumeApi.update(recordId.value!, form.year, buildPayload())
      ElMessage.success('草稿已保存')
    } else {
      const newId = (await VolumeApi.saveDraft(buildPayload())).recordId
      ElMessage.success('草稿已创建')
      router.replace(`/volume/edit/${newId}`)
    }
  } finally {
    saving.value = false
  }
}

async function submitForReview() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  await ElMessageBox.confirm(
    '提交审核后，案卷将进入待审核状态，不可再编辑，确认提交？',
    '确认提交审核',
    { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' },
  )

  submitting.value = true
  try {
    let targetId = recordId.value
    if (!targetId) {
      targetId = (await VolumeApi.saveDraft(buildPayload())).recordId
    } else {
      await VolumeApi.update(targetId, form.year, buildPayload())
    }
    await VolumeApi.submit(targetId!, form.year)
    ElMessage.success('已成功提交审核')
    router.push(`/volume/detail/${targetId}`)
  } catch {
    // 错误由 http 拦截器处理
  } finally {
    submitting.value = false
  }
}

function buildPayload(): ArchiveVolumeSaveDTO {
  return {
    fondsNo:        form.fondsNo,
    year:           form.year,
    categoryL1:     form.categoryL1,
    categoryL2:     form.categoryL2    || undefined,
    categoryL3:     form.categoryL3    || undefined,
    deviceCode:     form.deviceCode,
    volumeTitle:    form.volumeTitle,
    compileUnit:    form.compileUnit || undefined,
    securityLevel:  form.securityLevel || undefined,
    retentionPeriod:form.retentionPeriod || undefined,
    copies:         form.copies,
    totalPages:     form.totalPages     || undefined,
    compileDate:    form.compileDate   || undefined,
    reviewer:       form.reviewer  || undefined,
    archiveDate:    form.archiveDate   || undefined,
    remark:         form.remark        || undefined,
    notes:          form.notes          || undefined,
  }
}

// ── 状态标签映射 ────────────────────────────────────────────────
const STATUS_LABELS: Record<number, { text: string; color: string; bg: string }> = {
  0: { text: '草稿',   color: '#64748B', bg: '#F1F5F9' },
  1: { text: '待审核', color: '#854D0E', bg: '#FEF9C3' },
  2: { text: '待确认', color: '#1D4ED8', bg: '#DBEAFE' },
  3: { text: '已归档', color: '#065F46', bg: 'var(--theme-border-light)' },
}
const statusTag = computed(() => STATUS_LABELS[currentStatus.value] ?? STATUS_LABELS[0])
</script>

<template>
  <div class="page-container" v-loading="loading">
    <!-- 页头 -->
    <div class="page-header-wrap">
      <PageHeader
        :title="pageTitle"
        show-back
        :breadcrumbs="[
          { label: '案卷管理', path: '/volume/list' },
          { label: pageTitle },
        ]"
      />
      <span
        class="status-badge"
        :style="{ color: statusTag.color, background: statusTag.bg }"
      >{{ statusTag.text }}</span>
    </div>

    <!-- 只读提示 -->
    <el-alert
      v-if="readonly"
      type="info"
      :closable="false"
      show-icon
    >
      该案卷当前状态为「{{ statusTag.text }}」，已提交至审批流程，内容只读。
    </el-alert>

    <el-form
      ref="formRef"
      :model="form"
      :rules="readonly ? {} : rules"
      :disabled="readonly"
      label-position="top"
      class="volume-form"
    >
      <!-- ── 第一区：分类定位 ─────────────────────────────────────── -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-dot" />
            <span class="section-title">分类定位</span>
            <span class="section-sub">档号组成要素</span>
          </div>
        </template>

        <div class="form-grid">
          <!-- 全宗号 -->
          <el-form-item label="全宗号" prop="fondsNo" required>
            <el-select v-model="form.fondsNo" placeholder="请选择全宗号" clearable class="w-full">
              <el-option
                v-for="item in fondsNoOptions"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>

          <!-- 年度 -->
          <el-form-item label="年度" prop="year" required>
            <el-select v-model="form.year" placeholder="请选择年度" class="w-full">
              <el-option
                v-for="y in yearOptions"
                :key="y"
                :label="y + ' 年'"
                :value="y"
              />
            </el-select>
          </el-form-item>

          <!-- 一级类目 -->
          <el-form-item label="一级类目" prop="categoryL1" required>
            <el-select v-model="form.categoryL1" placeholder="请选择一级类目" clearable class="w-full">
              <el-option
                v-for="item in categoryL1Options"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>

          <!-- 二级类目 -->
          <el-form-item label="二级类目" prop="categoryL2">
            <el-select
              v-model="form.categoryL2"
              placeholder="请先选择一级类目"
              clearable
              :disabled="readonly || !form.categoryL1"
              class="w-full"
            >
              <el-option
                v-for="item in categoryL2Options"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>

          <!-- 三级类目 -->
          <el-form-item label="三级类目" prop="categoryL3">
            <el-select
              v-model="form.categoryL3"
              placeholder="请先选择二级类目"
              clearable
              :disabled="readonly || !form.categoryL2"
              class="w-full"
            >
              <el-option
                v-for="item in categoryL3Options"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>

          <!-- 设备代号 -->
          <el-form-item label="设备代号" prop="deviceCode" required>
            <el-select v-model="form.deviceCode" placeholder="请选择设备代号" clearable class="w-full">
              <el-option
                v-for="item in equipCodeOptions"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>
        </div>

        <!-- 档号预览 -->
        <div class="archive-no-wrap">
          <span class="archive-no-label">档号预览</span>
          <div class="archive-no-box" :class="{ loading: previewLoading, 'has-value': !!archiveNoPreview }">
            <template v-if="previewLoading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span class="archive-no-hint">正在生成档号…</span>
            </template>
            <template v-else-if="archiveNoPreview">
              <el-icon><DocumentChecked /></el-icon>
              <span class="archive-no-value">{{ archiveNoPreview }}</span>
            </template>
            <template v-else>
              <el-icon><Document /></el-icon>
              <span class="archive-no-hint">填写全宗号、年度、一级类目、设备代号后自动生成</span>
            </template>
          </div>
        </div>
      </el-card>

      <!-- ── 第二区：案卷描述 ─────────────────────────────────────── -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-dot" />
            <span class="section-title">案卷描述</span>
          </div>
        </template>

        <div class="form-grid">
          <!-- 案卷题名（全宽） -->
          <el-form-item label="案卷题名" prop="volumeTitle" required class="col-span-3">
            <el-input
              v-model="form.volumeTitle"
              placeholder="请输入案卷题名（必填）"
              maxlength="200"
              show-word-limit
              clearable
            />
          </el-form-item>

          <!-- 编制单位 -->
          <el-form-item label="编制单位" prop="compileUnit" class="col-span-2">
            <el-input v-model="form.compileUnit" placeholder="请输入编制单位" clearable />
          </el-form-item>

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

          <!-- 保管期限 -->
          <el-form-item label="保管期限" prop="retentionPeriod">
            <el-select v-model="form.retentionPeriod" placeholder="请选择保管期限" clearable class="w-full">
              <el-option
                v-for="item in retentionOptions"
                :key="item.itemValue"
                :label="item.itemLabel"
                :value="item.itemValue"
              />
            </el-select>
          </el-form-item>

          <!-- 件数 -->
          <el-form-item label="件数" prop="copies">
            <el-input-number
              v-model="form.copies"
              :min="1"
              :max="9999"
              controls-position="right"
              class="w-full"
            />
          </el-form-item>

          <!-- 页数 -->
          <el-form-item label="页数" prop="totalPages">
            <el-input-number
              v-model="form.totalPages"
              :min="0"
              :max="99999"
              placeholder="选填"
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
        </div>
      </el-card>

      <!-- ── 第三区：流程信息 ─────────────────────────────────────── -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-dot" />
            <span class="section-title">流程信息</span>
          </div>
        </template>

        <div class="form-grid">
          <!-- 立卷人 -->
          <el-form-item label="立卷人" prop="compiler">
            <el-input v-model="form.compiler" placeholder="请输入立卷人姓名" clearable />
          </el-form-item>

          <!-- 立卷日期 -->
          <el-form-item label="立卷日期" prop="compileDate">
            <el-date-picker
              v-model="form.compileDate"
              type="date"
              placeholder="请选择立卷日期"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </el-form-item>

          <!-- 审核人 -->
          <el-form-item label="审核人" prop="reviewer">
            <el-input v-model="form.reviewer" placeholder="请输入审核人姓名" clearable />
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
      </el-card>

      <!-- ── 第四区：备考 ─────────────────────────────────────────── -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-header">
            <span class="section-dot" />
            <span class="section-title">备考</span>
          </div>
        </template>

        <div class="form-grid">
          <el-form-item label="备考说明" prop="remark" class="col-span-2">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备考说明（选填）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="备注" prop="notes" class="col-span-2">
            <el-input
              v-model="form.notes"
              type="textarea"
              :rows="3"
              placeholder="请输入备注（选填）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>
      </el-card>
    </el-form>

    <!-- ── 底部操作栏 ──────────────────────────────────────────── -->
    <div class="form-footer">
      <el-button size="large" @click="handleCancel">取消</el-button>
      <template v-if="!readonly">
        <el-button
          size="large"
          class="btn-draft"
          :loading="saving"
          @click="saveDraft"
        >
          <el-icon><FolderChecked /></el-icon>
          保存草稿
        </el-button>
        <el-button
          type="primary"
          size="large"
          class="btn-submit"
          :loading="submitting"
          @click="submitForReview"
        >
          提交审核
          <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1100px;
}

// 页头行（PageHeader + 状态胶囊）
.page-header-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  :deep(.page-header) {
    flex: 1;
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

// 状态胶囊
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 14px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

// ── 表单卡片区块 ──────────────────────────────────────────────
.form-section {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: var(--theme-bg-card);
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-dot {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
  flex-shrink: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: $color-text-title;
}

.section-sub {
  font-size: 12px;
  color: #94A3B8;
  margin-left: 4px;
}

// ── 表单网格 ──────────────────────────────────────────────────
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 20px;

  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
}

.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }

.w-full { width: 100%; }

// ── 输入框样式 ────────────────────────────────────────────────
:deep(.el-select),
:deep(.el-input),
:deep(.el-input-number),
:deep(.el-date-editor) {
  width: 100%;

  .el-input__wrapper {
    border-radius: 8px;
    box-shadow: 0 0 0 1px #E2E8F0;
    transition: box-shadow 0.2s;

    &:hover   { box-shadow: 0 0 0 1px var(--theme-accent-light); }
    &.is-focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent); }
  }
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #E2E8F0;
  resize: vertical;
  font-size: 14px;
  transition: box-shadow 0.2s;

  &:hover  { box-shadow: 0 0 0 1px var(--theme-accent-light); }
  &:focus  { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent); }
}

:deep(.el-input-number .el-input__wrapper) {
  padding-right: 40px;
}

// ── 档号预览 ──────────────────────────────────────────────────
.archive-no-wrap {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #E2E8F0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.archive-no-label {
  font-size: 13px;
  font-weight: 600;
  color: $color-text-body;
  white-space: nowrap;
  flex-shrink: 0;
}

.archive-no-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #F8FAFC;
  border: 1.5px dashed #CBD5E1;
  min-height: 50px;
  transition: border-color 0.25s, background 0.25s;

  .el-icon {
    font-size: 18px;
    color: #94A3B8;
    flex-shrink: 0;
  }

  &.has-value {
    background: linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-light));
    border-color: $color-primary;
    border-style: solid;

    .el-icon { color: $color-primary; }
  }

  &.loading {
    .el-icon { color: $color-primary; }
  }
}

.archive-no-value {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 22px;
  font-weight: 700;
  color: $color-primary-dark;
  letter-spacing: 1px;
}

.archive-no-hint {
  font-size: 13px;
  color: #94A3B8;
}

// ── 表单项标签 ────────────────────────────────────────────────
:deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 500;
  color: $color-text-body;
  line-height: 1.4;
  padding-bottom: 4px;
}

// ── 底部操作栏 ────────────────────────────────────────────────
.form-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #fff;
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  bottom: 16px;

  .el-button {
    border-radius: var(--radius-btn);
    font-size: 14px;
    font-weight: 500;
    padding: 0 24px;
  }
}

.btn-draft {
  border-color: $color-primary;
  color: $color-primary;
  background: var(--theme-bg-soft);

  &:hover {
    background: var(--theme-bg-lighter);
    border-color: $color-primary-dark;
    color: $color-primary-dark;
  }
}

.btn-submit {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none;
  font-weight: 600;
  min-width: 120px;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
  }

  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}

// 只读态提示
:deep(.el-alert) {
  border-radius: 10px;
}

// 只读时禁用表单外观调整
:deep(.el-form.is-disabled) {
  .el-input__wrapper,
  .el-textarea__inner {
    background: #FAFAFA;
    cursor: default;
  }

  .el-select .el-input.is-disabled .el-input__wrapper {
    background: #FAFAFA;
  }
}
</style>
