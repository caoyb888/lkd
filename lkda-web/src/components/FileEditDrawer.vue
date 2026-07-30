<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { UploadFile, UploadRawFile } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { FileApi, type ArchiveFileSaveDTO } from '@/api/file'

/**
 * 卷内文件 新建/编辑抽屉（FileListView 与 VolumeEditView 共用）。
 * 保存元数据后如选择了电子原文则自动上传。
 */
const props = defineProps<{
  modelValue: boolean
  /** 编辑时传入文件 recordId，新建为 undefined */
  editId?: number
  /** 关联案卷档号（定位键） */
  archiveNo: string
  /** 关联案卷案卷号 */
  volumeNo: string
  /** 案卷年度 */
  year: string
  /** 当前文件总数（用于新建时默认顺序号） */
  fileCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: []
}>()

const dictStore = useDictStore()
const securityOptions = computed(() => dictStore.getDictItems('security_level'))

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const drawerTitle = computed(() => (props.editId ? '编辑卷内文件' : '新建卷内文件'))

// ── 表单 ───────────────────────────────────────────────────────
type FileForm = Omit<ArchiveFileSaveDTO, 'keywords'> & { keywords: string }

const formRef = ref<FormInstance>()
const saving  = ref(false)

const emptyForm = (): FileForm => ({
  volumeNo:     props.volumeNo,
  archiveNo:    props.archiveNo,
  year:         props.year,
  seqNo:        props.fileCount + 1,
  fileNo:       '',
  fileTitle:    '',
  responsible:  '',
  pages:        undefined,
  securityLevel:'',
  archiveDate:  '',
  keywords:     '',
  originalPath: '',
  remark:       '',
})
const form = ref<FileForm>(emptyForm())

const rules: FormRules = {
  fileTitle: [{ required: true, message: '请输入文件标题', trigger: 'blur' }],
  seqNo:     [{ required: true, message: '请填写顺序号',   trigger: 'blur' }],
}

// 编辑时由父组件通过 setForm 回填
function setForm(row: Partial<FileForm>) {
  form.value = { ...emptyForm(), ...row }
  pendingFile.value = null
}
defineExpose({ setForm })

watch(visible, (v) => {
  if (v && !props.editId) {
    form.value = emptyForm()
    pendingFile.value = null
  }
})

// ── 主题词 Tag 输入 ────────────────────────────────────────────
const keywordInput = ref('')
const keywordList = computed(() =>
  form.value.keywords ? form.value.keywords.split(',').filter(Boolean) : [],
)
function addKeyword() {
  const kw = keywordInput.value.trim()
  if (kw && !keywordList.value.includes(kw)) {
    form.value.keywords = [...keywordList.value, kw].join(',')
  }
  keywordInput.value = ''
}
function removeKeyword(kw: string) {
  form.value.keywords = keywordList.value.filter(k => k !== kw).join(',')
}

// ── 电子原文上传 ───────────────────────────────────────────────
const pendingFile = ref<UploadRawFile | null>(null)
function onFileChange(uploadFile: UploadFile) {
  pendingFile.value = uploadFile.raw ?? null
}
async function handleDownloadOriginal() {
  if (!props.editId) return
  try {
    const blob = await FileApi.downloadOriginal(props.editId, form.value.year)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = form.value.originalPath!.replace(/^\d+_/, '')
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  }
}

// ── 提交 ───────────────────────────────────────────────────────
async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload: ArchiveFileSaveDTO = {
      ...form.value,
      keywords: form.value.keywords || undefined,
    }
    let recordId = props.editId
    if (recordId) {
      await FileApi.update(recordId, payload.year, payload)
    } else {
      const created = await FileApi.save(payload)
      recordId = created.recordId
    }
    if (pendingFile.value && recordId) {
      await FileApi.uploadOriginal(recordId, payload.year, pendingFile.value)
    }
    ElMessage.success(props.editId ? '文件信息已更新' : '文件已新建')
    visible.value = false
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="drawerTitle"
    direction="rtl"
    size="560px"
    :close-on-click-modal="false"
    class="file-drawer"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="drawer-form"
    >
      <!-- 关联案卷号（只读） -->
      <el-form-item label="关联案卷">
        <el-input :value="archiveNo" disabled class="w-full" />
      </el-form-item>

      <div class="form-row-2">
        <el-form-item label="顺序号" prop="seqNo">
          <el-input-number
            v-model="form.seqNo"
            :min="1"
            :max="9999"
            controls-position="right"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="文件编号" prop="fileNo">
          <el-input v-model="form.fileNo" placeholder="可选" clearable class="w-full" />
        </el-form-item>
      </div>

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
        <el-form-item label="责任者" prop="responsible">
          <el-input v-model="form.responsible" placeholder="可选" clearable class="w-full" />
        </el-form-item>
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
              class="keyword-tag"
              @close="removeKeyword(kw)"
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

      <!-- 电子原文上传 -->
      <el-form-item label="电子原文">
        <div class="upload-wrap">
          <el-upload
            :auto-upload="false"
            :limit="1"
            :on-change="onFileChange"
            :file-list="pendingFile ? [{ name: pendingFile.name }] : []"
            class="upload-control"
          >
            <el-button>
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
            <template #tip>
              <div class="upload-tip">保存时自动上传，单个文件不超过 50MB</div>
            </template>
          </el-upload>
          <div v-if="form.originalPath && !pendingFile" class="existing-original">
            <span class="existing-name">已上传：{{ form.originalPath.replace(/^\d+_/, '') }}</span>
            <el-button link type="primary" @click="handleDownloadOriginal">下载</el-button>
          </div>
        </div>
      </el-form-item>

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
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="saving" class="btn-save" @click="submitForm">
          {{ editId ? '保存修改' : '新建文件' }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.keyword-wrap {
  width: 100%;
}

.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.keyword-input {
  width: 160px;
}

.keyword-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-body);
}

.upload-wrap {
  width: 100%;
}

.upload-tip {
  font-size: 12px;
  color: var(--color-text-body);
  line-height: 1.5;
}

.existing-original {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
}

.existing-name {
  color: var(--color-text-body);
  word-break: break-all;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
