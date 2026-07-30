<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { FileApi, type ArchiveFileDetailVO } from '@/api/file'

/**
 * 卷内文件只读详情抽屉（所有状态可查看，解决导入历史数据无法查看详情的问题）。
 */
const props = defineProps<{
  modelValue: boolean
  recordId?: number
  year: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const loading = ref(false)
const detail  = ref<ArchiveFileDetailVO | null>(null)

watch(visible, async (v) => {
  if (!v || !props.recordId) return
  loading.value = true
  detail.value = null
  try {
    detail.value = await FileApi.detail(props.recordId, props.year)
  } finally {
    loading.value = false
  }
})

const downloading = ref(false)
async function handleDownload() {
  if (!props.recordId || !detail.value?.originalPath) return
  downloading.value = true
  try {
    const blob = await FileApi.downloadOriginal(props.recordId, props.year)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = detail.value.originalPath.replace(/^\d+_/, '')
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败，原文可能不存在')
  } finally {
    downloading.value = false
  }
}

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
</script>

<template>
  <el-drawer
    v-model="visible"
    title="卷内文件详情"
    direction="rtl"
    size="560px"
    class="file-detail-drawer"
  >
    <div v-loading="loading" class="detail-body">
      <template v-if="detail">
        <el-descriptions :column="2" border class="detail-desc">
          <el-descriptions-item label="档号" :span="2">
            <span class="mono">{{ detail.archiveNo }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="顺序号">{{ show(detail.seqNo) }}</el-descriptions-item>
          <el-descriptions-item label="文件编号">{{ show(detail.fileNo) }}</el-descriptions-item>
          <el-descriptions-item label="文件标题" :span="2">{{ show(detail.fileTitle) }}</el-descriptions-item>
          <el-descriptions-item label="责任者" :span="2">{{ show(detail.responsible) }}</el-descriptions-item>
          <el-descriptions-item label="页数">{{ show(detail.pages) }}</el-descriptions-item>
          <el-descriptions-item label="密级">{{ show(detail.securityLevelLabel || detail.securityLevel) }}</el-descriptions-item>
          <el-descriptions-item label="编制日期">{{ show(detail.compileDate) }}</el-descriptions-item>
          <el-descriptions-item label="归档日期">{{ show(detail.archiveDate) }}</el-descriptions-item>
          <el-descriptions-item label="主题词" :span="2">{{ show(detail.keywords) }}</el-descriptions-item>
          <el-descriptions-item label="图幅">{{ show(detail.drawingSize) }}</el-descriptions-item>
          <el-descriptions-item label="折合A4">{{ show(detail.a4Equivalent) }}</el-descriptions-item>
          <el-descriptions-item label="橱号">{{ show(detail.cabinetNo) }}</el-descriptions-item>
          <el-descriptions-item label="抽屉号">{{ show(detail.drawerNo) }}</el-descriptions-item>
          <el-descriptions-item label="页次">{{ show(detail.pageStart) }}</el-descriptions-item>
          <el-descriptions-item label="库位号">{{ show(detail.locationNo) }}</el-descriptions-item>
          <el-descriptions-item label="项目名称" :span="2">{{ show(detail.projectName) }}</el-descriptions-item>
          <el-descriptions-item label="变更记载" :span="2">{{ show(detail.changeRecord) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ show(detail.remark) }}</el-descriptions-item>
          <el-descriptions-item label="电子原文" :span="2">
            <template v-if="detail.originalPath">
              <span class="mono original-name">{{ detail.originalPath.replace(/^\d+_/, '') }}</span>
              <el-button
                link
                type="primary"
                :loading="downloading"
                @click="handleDownload"
              >下载</el-button>
            </template>
            <span v-else>—</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.detail-body {
  min-height: 200px;
}

.mono {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
}

.original-name {
  margin-right: 8px;
  word-break: break-all;
}
</style>
