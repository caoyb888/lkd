<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { VolumeApi } from '@/api/volume'

const router = useRouter()

// ── 文件状态 ──────────────────────────────────────────────────────
const fileInput      = ref<HTMLInputElement | null>(null)
const selectedFile   = ref<File | null>(null)
const isDragging     = ref(false)
const importing      = ref(false)
const importResult   = ref<{ totalCount: number; successCount: number; fileName: string } | null>(null)

const hasResult = computed(() => importResult.value !== null)

// ── 拖拽 ──────────────────────────────────────────────────────────
function onDragOver(e: DragEvent) { e.preventDefault(); isDragging.value = true }
function onDragLeave() { isDragging.value = false }
function onDrop(e: DragEvent) {
  e.preventDefault(); isDragging.value = false
  const f = e.dataTransfer?.files[0]
  if (f) pickFile(f)
}

function onFileInput(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) pickFile(f)
  ;(e.target as HTMLInputElement).value = ''
}

function pickFile(f: File) {
  if (!f.name.toLowerCase().endsWith('.xlsx')) {
    ElMessage.error('只允许上传 .xlsx 格式的 Excel 文件，请重新选择')
    return
  }
  if (f.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10 MB')
    return
  }
  selectedFile.value  = f
  importResult.value  = null
}

function clearFile() {
  selectedFile.value   = null
  importResult.value   = null
}

// ── 导入 ──────────────────────────────────────────────────────────
async function handleImport() {
  if (!selectedFile.value) { ElMessage.warning('请先选择要上传的文件'); return }
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', selectedFile.value)
    const res = await VolumeApi.importVolumes(fd)
    importResult.value = res
    ElMessage.success(`导入完成，成功导入 ${res.successCount} 条记录`)
  } finally {
    importing.value = false
  }
}

async function downloadTemplate() {
  try {
    const blob = await VolumeApi.downloadTemplate()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '案卷目录导入模板.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch {
    ElMessage.error('模板下载失败，请稍后重试')
  }
}

function goToList() { router.push('/volume/list') }

function formatSize(bytes: number) {
  if (bytes < 1024)        return bytes + ' B'
  if (bytes < 1048576)     return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(2) + ' MB'
}
</script>

<template>
  <div class="page-container">
    <PageHeader
      title="Excel 批量导入"
      show-back
      :breadcrumbs="[
        { label: '案卷管理', path: '/volume/list' },
        { label: 'Excel 批量导入' },
      ]"
    />

    <!-- 导入结果 -->
    <el-card v-if="hasResult" class="result-card" shadow="never">
      <div class="result-wrap">
        <div class="result-icon-bg">
          <el-icon class="result-icon"><CircleCheckFilled /></el-icon>
        </div>
        <h3 class="result-h3">导入完成</h3>
        <p class="result-p">
          文件 <strong>{{ importResult?.fileName }}</strong><br>
          共读取 <strong class="num">{{ importResult?.totalCount }}</strong> 条，
          成功导入 <strong class="num">{{ importResult?.successCount }}</strong> 条
        </p>
        <div class="result-btns">
          <el-button type="primary" size="large" class="btn-primary" @click="goToList">
            <el-icon><List /></el-icon>前往案卷列表
          </el-button>
          <el-button size="large" @click="clearFile">继续导入</el-button>
        </div>
      </div>
    </el-card>

    <!-- 模板下载 + 上传区 -->
    <el-card v-else class="upload-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="dot" /><span class="card-title">上传 Excel 文件</span>
            <span class="card-sub">仅支持 .xlsx，大小 ≤ 10 MB</span>
          </div>
          <el-button type="primary" plain size="small" @click="downloadTemplate">
            <el-icon><Download /></el-icon>下载导入模板
          </el-button>
        </div>
      </template>

      <div
        class="drop-zone"
        :class="{ dragging: isDragging, 'has-file': !!selectedFile }"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="!selectedFile && fileInput?.click()"
      >
        <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileInput" />

        <template v-if="!selectedFile">
          <div class="drop-icon-bg">
            <el-icon class="drop-icon"><Upload /></el-icon>
          </div>
          <p class="drop-title">拖拽文件到此处，或<span class="drop-link">点击选择文件</span></p>
          <p class="drop-hint">支持 .xlsx 格式，文件大小不超过 10 MB</p>
        </template>

        <template v-else>
          <div class="file-row">
            <div class="file-icon-bg"><el-icon class="file-icon"><Document /></el-icon></div>
            <div class="file-meta">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
            </div>
            <el-button link type="danger" @click.stop="clearFile"><el-icon><Close /></el-icon></el-button>
          </div>
        </template>
      </div>

      <el-alert type="info" :closable="false" show-icon class="rule-alert">
        <ul class="rule-list">
          <li>第 <b>1 行</b>为表头，数据从第 <b>2 行</b>开始</li>
          <li>字典类字段须填写字典中存在的<b>实际值</b>（如 <code>internal</code>），而非中文标签</li>
          <li>日期格式统一为 <b>YYYY-MM-DD</b></li>
          <li>导入成功后所有记录状态初始化为<b>待审核（status=1）</b></li>
        </ul>
      </el-alert>

      <div class="step-footer">
        <el-button size="large" @click="goToList">取消</el-button>
        <el-button
          type="primary" size="large" :loading="importing" :disabled="!selectedFile"
          class="btn-primary" @click="handleImport"
        >
          <el-icon><Upload /></el-icon>开始导入
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 960px;
}

.card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.header-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.dot {
  width: 4px; height: 18px; border-radius: 2px; flex-shrink: 0;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
}
.card-title { font-size: 15px; font-weight: 600; color: $color-text-title; }
.card-sub   { font-size: 12px; color: #94A3B8; margin-left: 4px; }

.upload-card, .result-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);
  :deep(.el-card__header) {
    padding: 14px 24px;
    border-bottom: 1px solid #F1F5F9;
    background: var(--theme-bg-card);
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }
  :deep(.el-card__body) { padding: 24px; }
}

.drop-zone {
  border: 2px dashed #CBD5E1; border-radius: 12px; padding: 48px 32px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  cursor: pointer; transition: border-color 0.2s, background 0.2s; background: var(--theme-bg-card);
  &:hover { border-color: $color-primary; background: var(--theme-bg-soft); }
  &.dragging { border-color: $color-primary; background: var(--theme-bg-lighter); }
  &.has-file { cursor: default; border-style: solid; border-color: $color-primary;
    background: linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-light)); padding: 24px 32px; }
}

.hidden { display: none; }

.drop-icon-bg {
  width: 64px; height: 64px; border-radius: 16px;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex; align-items: center; justify-content: center;
}
.drop-icon { font-size: 30px; color: $color-primary-dark; }
.drop-title {
  font-size: 15px; font-weight: 600; color: $color-text-title;
  .drop-link { color: $color-primary; text-decoration: underline; cursor: pointer; }
}
.drop-hint { font-size: 12px; color: #94A3B8; }

.file-row { display: flex; align-items: center; gap: 16px; width: 100%; }
.file-icon-bg {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex; align-items: center; justify-content: center;
}
.file-icon { font-size: 24px; color: $color-primary-dark; }
.file-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.file-name { font-size: 14px; font-weight: 600; color: $color-text-title; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 12px; color: #94A3B8; }

.rule-alert {
  border-radius: 10px; margin-top: 16px;
  :deep(.el-alert__content) { width: 100%; }
}
.rule-list {
  padding-left: 18px; margin: 6px 0 0;
  li { font-size: 13px; color: $color-text-body; line-height: 1.9;
    b { color: $color-text-title; }
    code { background: #F1F5F9; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  }
}

.step-footer {
  display: flex; justify-content: flex-end; gap: 12px;
  margin-top: 24px; padding-top: 20px; border-top: 1px solid #F1F5F9;
  .el-button { border-radius: var(--radius-btn); font-weight: 500; }
}

.btn-primary {
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border: none; font-weight: 600;
  &:hover { opacity: 0.9; }
}

.result-card { :deep(.el-card__body) { padding: 56px 32px; } }
.result-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
.result-icon-bg {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-bg-lighter), var(--theme-border-medium));
  display: flex; align-items: center; justify-content: center;
}
.result-icon { font-size: 44px; color: $color-primary; }
.result-h3   { font-size: 22px; font-weight: 700; color: $color-text-title; margin: 0; }
.result-p    { font-size: 15px; color: $color-text-body; margin: 0; strong { color: $color-text-title; } }
.result-btns { display: flex; gap: 12px; margin-top: 8px;
  .el-button { border-radius: var(--radius-btn); font-weight: 500; }
}
.num { font-size: 22px; color: $color-primary; margin: 0 4px; font-weight: 700; }
</style>
