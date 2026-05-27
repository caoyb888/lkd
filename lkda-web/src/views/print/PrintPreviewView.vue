<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDictStore } from '@/stores/dict'
import { VolumeApi } from '@/api/volume'
import { FileApi } from '@/api/file'
import { PrintApi } from '@/api/print'
import type { ArchiveVolumeDetailVO } from '@/types/vo'
import type { ArchiveFileListVO } from '@/types/vo'

const route     = useRoute()
const router    = useRouter()
const dictStore = useDictStore()

const volumeId = computed(() => Number(route.params.volumeId))
const yearFromQuery = computed(() => route.query.year as string | undefined)

// ── 数据 ─────────────────────────────────────────────────────────
const volume   = ref<ArchiveVolumeDetailVO | null>(null)
const files    = ref<ArchiveFileListVO[]>([])
const loading  = ref(false)

async function loadData() {
  loading.value = true
  try {
    let vol: ArchiveVolumeDetailVO | null = null
    const y = yearFromQuery.value
    if (y) {
      vol = await VolumeApi.detail(volumeId.value, y)
    } else {
      const res = await VolumeApi.page({ current: 1, size: 1, keyword: String(volumeId.value) })
      const found = res.records[0]
      if (found) {
        vol = await VolumeApi.detail(volumeId.value, found.year)
      }
    }
    volume.value = vol
    if (vol?.volumeNo && vol?.year) {
      files.value = await FileApi.listByVolume(vol.volumeNo, vol.year)
    } else {
      files.value = []
    }
  } catch {
    ElMessage.error('加载打印数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ── Tab ───────────────────────────────────────────────────────────
type TabKey = 'cover' | 'spine' | 'vol-catalogue' | 'file-catalogue'
const activeTab = ref<TabKey>('cover')

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'cover',          label: '封皮',         icon: 'Document' },
  { key: 'spine',          label: '侧脊',         icon: 'Notebook' },
  { key: 'vol-catalogue',  label: '案卷目录',     icon: 'Files' },
  { key: 'file-catalogue', label: '卷内文件目录', icon: 'List' },
]

// ── 字典辅助 ─────────────────────────────────────────────────────
const lbl = (code: string, val?: string) =>
  (val ? dictStore.getDictLabel(code, val) || val : null) || '—'

// ── 下载 Word ────────────────────────────────────────────────────
const downloading = ref(false)

async function handleDownload() {
  if (!volume.value) return
  downloading.value = true
  try {
    const blob = await PrintApi.downloadDocx(volumeId.value, volume.value.year)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `档案_${volume.value.archiveNo}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败，请稍后重试')
  } finally {
    downloading.value = false
  }
}

// ── 浏览器打印 ───────────────────────────────────────────────────
function handlePrint() {
  window.print()
}

// ── 侧脊：将题名切为单字竖排 ─────────────────────────────────────
const spineChars = computed(() =>
  (volume.value?.volumeTitle ?? '').split('')
)

// ── 案卷目录中只展示当前案卷行（可扩展为同类列表） ──────────────
const volTableRows = computed(() => (volume.value ? [volume.value] : []))
</script>

<template>
  <div class="print-page" v-loading="loading">
    <!-- ────────────────────── 屏幕工具栏（打印时隐藏） ─────────── -->
    <div class="toolbar no-print">
      <div class="toolbar-left">
        <el-button link class="back-btn" @click="router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">打印预览</h2>
        <span v-if="volume" class="archive-no-badge">
          {{ volume.archiveNo }}
        </span>
      </div>

      <div class="toolbar-right">
        <el-button
          :loading="downloading"
          class="btn-download"
          size="default"
          @click="handleDownload"
        >
          <el-icon><Download /></el-icon>
          下载 Word(.docx)
        </el-button>
        <el-button
          type="primary"
          size="default"
          class="btn-print"
          @click="handlePrint"
        >
          <el-icon><Printer /></el-icon>
          直接打印
        </el-button>
      </div>
    </div>

    <!-- ───────────────────── Tab 切换栏（打印时隐藏） ───────────── -->
    <div class="tab-bar no-print">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <el-icon class="tab-icon"><component :is="tab.icon" /></el-icon>
        {{ tab.label }}
      </button>
    </div>

    <!-- ───────────────────── A4 预览区 ────────────────────────── -->
    <div class="preview-stage">
      <template v-if="volume">

        <!-- ═══════════════════ 封皮 ═══════════════════════════════ -->
        <div
          v-show="activeTab === 'cover'"
          class="a4-page print-section"
          :class="{ 'print-active': activeTab === 'cover' }"
          data-print-label="封皮"
        >
          <div class="cover-box">
            <!-- 左侧纵栏：全宗名 / 保管期限 -->
            <div class="cover-left-strip">
              <div class="cover-strip-item">
                <span class="cover-strip-label">全宗名称</span>
                <span class="cover-strip-value">莱矿</span>
              </div>
              <div class="cover-strip-item">
                <span class="cover-strip-label">保管期限</span>
                <span class="cover-strip-value">{{ lbl('retention_period', volume.retentionPeriod) }}</span>
              </div>
            </div>

            <!-- 主体区 -->
            <div class="cover-main">
              <!-- 顶部：年度 + 密级 -->
              <div class="cover-meta-row">
                <div class="cover-meta-item">
                  <span class="cover-meta-label">年度</span>
                  <span class="cover-meta-val">{{ volume.year }}</span>
                </div>
                <div class="cover-meta-item">
                  <span class="cover-meta-label">密级</span>
                  <span class="cover-meta-val security">
                    {{ lbl('security_level', volume.securityLevel) }}
                  </span>
                </div>
              </div>

              <!-- 案卷题名 -->
              <div class="cover-title-wrap">
                <p class="cover-title-label">案卷题名</p>
                <p class="cover-title-val">{{ volume.volumeTitle }}</p>
              </div>

              <!-- 分隔线 -->
              <div class="cover-divider" />

              <!-- 档号 -->
              <div class="cover-archiveno-row">
                <span class="cover-archiveno-label">档&emsp;&emsp;号</span>
                <span class="cover-archiveno-val">{{ volume.archiveNo }}</span>
              </div>

              <!-- 件数 / 页数 -->
              <div class="cover-count-row">
                <span class="cover-count-item">
                  件数 <strong>{{ volume.copies ?? '—' }}</strong>
                </span>
                <span class="cover-count-item">
                  页数 <strong>{{ volume.pageCount ?? '—' }}</strong>
                </span>
              </div>

              <!-- 底部：档案馆名称 -->
              <div class="cover-footer">
                <span class="cover-footer-name">莱矿档案室</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════ 侧脊 ═══════════════════════════════ -->
        <div
          v-show="activeTab === 'spine'"
          class="a4-page spine-page print-section"
          :class="{ 'print-active': activeTab === 'spine' }"
          data-print-label="侧脊"
        >
          <!-- 模拟两个并排侧脊（一页常印 2~4 个） -->
          <div class="spine-stage">
            <div class="spine-block" v-for="n in 2" :key="n">
              <div class="spine-inner">
                <!-- 全宗号 -->
                <div class="spine-row">
                  <span class="spine-sub-label">全</span>
                  <span class="spine-sub-val">{{ volume.fondsNo || '—' }}</span>
                </div>
                <!-- 年度 -->
                <div class="spine-row">
                  <span class="spine-sub-label">年</span>
                  <span class="spine-sub-val">{{ volume.year }}</span>
                </div>
                <!-- 档号（缩）-->
                <div class="spine-row">
                  <span class="spine-sub-label">号</span>
                  <span class="spine-sub-val small">{{ volume.archiveNo }}</span>
                </div>
                <!-- 题名竖排 -->
                <div class="spine-title-wrap">
                  <span
                    v-for="(ch, idx) in spineChars"
                    :key="idx"
                    class="spine-char"
                  >{{ ch }}</span>
                </div>
                <!-- 件数 -->
                <div class="spine-bottom">
                  <span class="spine-sub-label">件</span>
                  <span class="spine-sub-val">{{ volume.copies ?? '—' }}</span>
                </div>
              </div>
            </div>
          </div>
          <p class="spine-tip no-print">档案盒侧脊（每页可印多份，此处预览 2 份）</p>
        </div>

        <!-- ═══════════════════ 案卷目录 ════════════════════════════ -->
        <div
          v-show="activeTab === 'vol-catalogue'"
          class="a4-page print-section"
          :class="{ 'print-active': activeTab === 'vol-catalogue' }"
          data-print-label="案卷目录"
        >
          <div class="catalogue-wrap">
            <h3 class="catalogue-title">案&emsp;卷&emsp;目&emsp;录</h3>
            <p class="catalogue-subtitle">
              全宗号：{{ lbl('fonds_no', volume.fondsNo) }}&emsp;
              年度：{{ volume.year }}&emsp;
              一级类目：{{ volume.categoryL1Label || lbl('category_l1', volume.categoryL1) }}
            </p>
            <table class="archive-table">
              <thead>
                <tr>
                  <th class="col-seq">序号</th>
                  <th class="col-no">档号</th>
                  <th class="col-title">案卷题名</th>
                  <th class="col-year">年度</th>
                  <th class="col-copies">件数</th>
                  <th class="col-pages">页数</th>
                  <th class="col-period">保管期限</th>
                  <th class="col-sec">密级</th>
                  <th class="col-remark">备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in volTableRows" :key="row.recordId">
                  <td class="center">{{ idx + 1 }}</td>
                  <td class="mono">{{ row.archiveNo }}</td>
                  <td>{{ row.volumeTitle }}</td>
                  <td class="center">{{ row.year }}</td>
                  <td class="center">{{ row.copies ?? '—' }}</td>
                  <td class="center">{{ row.pageCount ?? '—' }}</td>
                  <td class="center">{{ row.retentionPeriodLabel || lbl('retention_period', row.retentionPeriod) }}</td>
                  <td class="center">{{ row.securityLevelLabel || lbl('security_level', row.securityLevel) }}</td>
                  <td>{{ row.note || '—' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="catalogue-footer">
              <span>编制单位：{{ volume.compilingUnit || '—' }}</span>
              <span>立卷人：{{ volume.compilerName || '—' }}</span>
              <span>立卷日期：{{ volume.compileDate || '—' }}</span>
              <span>审核人：{{ volume.reviewerName || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- ═══════════════════ 卷内文件目录 ════════════════════════ -->
        <div
          v-show="activeTab === 'file-catalogue'"
          class="a4-page print-section"
          :class="{ 'print-active': activeTab === 'file-catalogue' }"
          data-print-label="卷内文件目录"
        >
          <div class="catalogue-wrap">
            <h3 class="catalogue-title">卷内文件目录</h3>
            <p class="catalogue-subtitle">
              档号：{{ volume.archiveNo }}&emsp;
              案卷题名：{{ volume.volumeTitle }}
            </p>

            <EmptyState
              v-if="files.length === 0"
              description="该案卷暂无卷内文件"
            />

            <table v-else class="archive-table file-table">
              <thead>
                <tr>
                  <th class="col-seq">顺序号</th>
                  <th class="col-fileno">文件编号</th>
                  <th class="col-filetitle">文件标题</th>
                  <th class="col-responsible">责任者</th>
                  <th class="col-date">归档日期</th>
                  <th class="col-pages">页数</th>
                  <th class="col-sec">密级</th>
                  <th class="col-remark">备注</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in files" :key="file.recordId">
                  <td class="center">{{ file.seqNo }}</td>
                  <td class="mono">{{ file.fileNo || '—' }}</td>
                  <td>{{ file.fileTitle }}</td>
                  <td>{{ file.responsible || '—' }}</td>
                  <td class="center">{{ file.archiveDate || '—' }}</td>
                  <td class="center">{{ file.pages ?? '—' }}</td>
                  <td class="center">{{ file.securityLevelLabel || lbl('security_level', file.securityLevel) }}</td>
                  <td>{{ file.remark || '—' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="catalogue-footer" v-if="files.length > 0">
              <span>共 {{ files.length }} 件</span>
              <span>立卷人：{{ volume.compilerName || '—' }}</span>
            </div>
          </div>
        </div>

      </template>

      <!-- 加载中占位 -->
      <div v-else-if="!loading" class="empty-stage no-print">
        <EmptyState description="未找到该案卷数据，请返回重试" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// ── 变量复用 ────────────────────────────────────────────────────
$primary:      #14B8A6;
$primary-dark: #0F766E;
$text-title:   #1E293B;
$text-body:    #475569;
$border-color: #CBD5E1;

// ── 外层容器 ─────────────────────────────────────────────────────
.print-page {
  min-height: 100vh;
  background: #F1F5F9;
  display: flex;
  flex-direction: column;
}

// ── 工具栏 ───────────────────────────────────────────────────────
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  flex-wrap: wrap;
  gap: 12px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-btn {
  color: $primary;
  font-size: 14px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: $text-title;
}

.archive-no-badge {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13px;
  padding: 3px 12px;
  background: #F0FDFA;
  color: $primary-dark;
  border-radius: 999px;
  border: 1px solid #A7F3D0;
  font-weight: 600;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.btn-download {
  border-color: $primary;
  color: $primary;
  border-radius: 8px;

  &:hover {
    background: #F0FDFA;
    border-color: $primary-dark;
    color: $primary-dark;
  }
}

.btn-print {
  background: $primary;
  border-color: $primary;
  border-radius: 8px;

  &:hover {
    background: $primary-dark;
    border-color: $primary-dark;
    transform: translateY(-1px);
  }
}

// ── Tab 栏 ────────────────────────────────────────────────────────
.tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 24px;
  background: #fff;
  border-bottom: 1px solid #E2E8F0;
  flex-shrink: 0;
  overflow-x: auto;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: $text-body;
  transition: all 0.18s;
  white-space: nowrap;

  &:hover {
    background: #ECFDF5;
    color: $primary;
  }

  &.active {
    background: $primary;
    color: #fff;
    border-color: $primary;
    box-shadow: 0 2px 8px rgba(20,184,166,0.3);
  }

  .tab-icon {
    font-size: 15px;
  }
}

// ── 预览舞台 ──────────────────────────────────────────────────────
.preview-stage {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 32px 24px 48px;
}

.empty-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

// ── A4 纸张通用样式 ───────────────────────────────────────────────
.a4-page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
  font-family: '宋体', SimSun, 'Times New Roman', serif;
  font-size: 12pt;
  color: #000;
}

// ════════════════════════ 封皮样式 ════════════════════════════════
.cover-box {
  display: flex;
  min-height: 297mm;
  border: 3px solid #000;
  margin: 8mm;
  min-height: calc(297mm - 16mm);
}

.cover-left-strip {
  width: 22mm;
  border-right: 2px solid #000;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  background: #F8FAFC;
  padding: 8mm 0;
  gap: 0;
}

.cover-strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.cover-strip-label {
  font-size: 8pt;
  color: #64748B;
  writing-mode: vertical-rl;
  letter-spacing: 4px;
}

.cover-strip-value {
  font-size: 9pt;
  font-weight: 600;
  color: #000;
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}

.cover-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12mm 14mm;
  gap: 0;
}

.cover-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10mm;
}

.cover-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cover-meta-label {
  font-size: 10pt;
  color: #475569;
}

.cover-meta-val {
  font-size: 12pt;
  font-weight: 600;
  color: #000;
  border-bottom: 1px solid #000;
  min-width: 18mm;
  text-align: center;
  padding: 0 4px;

  &.security {
    background: #FFFBEB;
    color: #92400E;
    border: 1px solid #F59E0B;
    border-radius: 2px;
  }
}

.cover-title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 8mm 0;
}

.cover-title-label {
  font-size: 11pt;
  color: #64748B;
  margin-bottom: 8px;
  letter-spacing: 2px;
}

.cover-title-val {
  font-size: 18pt;
  font-weight: bold;
  color: #000;
  line-height: 1.6;
  letter-spacing: 1px;
  word-break: break-all;
  text-align: center;
}

.cover-divider {
  border-top: 1.5px solid #000;
  margin: 8mm 0 6mm;
}

.cover-archiveno-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6mm;
}

.cover-archiveno-label {
  font-size: 11pt;
  color: #475569;
  white-space: nowrap;
}

.cover-archiveno-val {
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 13pt;
  font-weight: bold;
  color: #000;
  border-bottom: 1.5px solid #000;
  flex: 1;
  padding: 2px 6px;
  letter-spacing: 1px;
}

.cover-count-row {
  display: flex;
  gap: 32px;
  margin-bottom: 10mm;
}

.cover-count-item {
  font-size: 10pt;
  color: #475569;

  strong {
    font-size: 12pt;
    color: #000;
    margin-left: 4px;
    border-bottom: 1px solid #000;
    padding: 0 6px;
  }
}

.cover-footer {
  margin-top: auto;
  text-align: center;
  border-top: 1px solid #CBD5E1;
  padding-top: 6mm;
}

.cover-footer-name {
  font-size: 13pt;
  font-weight: bold;
  letter-spacing: 4px;
  color: #000;
}

// ════════════════════════ 侧脊样式 ════════════════════════════════
.spine-page {
  padding: 12mm;
}

.spine-stage {
  display: flex;
  gap: 12mm;
  justify-content: center;
  height: calc(297mm - 24mm);
}

.spine-block {
  width: 22mm;
  height: 100%;
  border: 2px solid #000;
  display: flex;
  justify-content: center;
}

.spine-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4mm 2mm;
  gap: 4px;
  width: 100%;
}

.spine-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1px dashed #CBD5E1;
  width: 100%;
  padding: 3px 0;
  gap: 2px;
}

.spine-sub-label {
  font-size: 7pt;
  color: #64748B;
}

.spine-sub-val {
  font-size: 8pt;
  font-weight: 600;
  color: #000;
  word-break: break-all;
  text-align: center;

  &.small {
    font-size: 6pt;
    letter-spacing: 0;
  }
}

.spine-title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 4px 0;
}

.spine-char {
  font-size: 9pt;
  font-weight: bold;
  color: #000;
  line-height: 1.4;
}

.spine-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-top: 1px dashed #CBD5E1;
  width: 100%;
  padding-top: 3px;
  gap: 2px;
}

.spine-tip {
  text-align: center;
  margin-top: 12px;
  font-size: 11px;
  color: #94A3B8;
  font-family: sans-serif;
}

// ════════════════════════ 目录表格样式 ════════════════════════════
.catalogue-wrap {
  padding: 12mm 14mm;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: calc(297mm - 1px);
}

.catalogue-title {
  font-size: 16pt;
  font-weight: bold;
  text-align: center;
  margin: 0 0 6px;
  letter-spacing: 4px;
}

.catalogue-subtitle {
  font-size: 10pt;
  text-align: center;
  color: #475569;
  margin: 0 0 8mm;
  letter-spacing: 1px;
}

.archive-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  margin-bottom: 8mm;

  th, td {
    border: 1px solid #000;
    padding: 4px 6px;
    vertical-align: middle;
    line-height: 1.5;
  }

  th {
    background: #F1F5F9;
    font-weight: bold;
    text-align: center;
    font-size: 10pt;
    white-space: nowrap;
  }

  td.center { text-align: center; }
  td.mono {
    font-family: Consolas, monospace;
    font-size: 9pt;
    white-space: nowrap;
  }

  // 案卷目录列宽
  .col-seq      { width: 8mm;  }
  .col-no       { width: 40mm; }
  .col-title    { min-width: 50mm; }
  .col-year     { width: 12mm; }
  .col-copies   { width: 12mm; }
  .col-pages    { width: 12mm; }
  .col-period   { width: 16mm; }
  .col-sec      { width: 14mm; }
  .col-remark   { min-width: 16mm; }

  // 卷内文件目录列宽
  .col-fileno       { width: 24mm; }
  .col-filetitle    { min-width: 50mm; }
  .col-responsible  { width: 20mm; }
  .col-date         { width: 22mm; }
}

.file-table {
  .col-seq { width: 10mm; }
}

.catalogue-footer {
  margin-top: auto;
  display: flex;
  gap: 24px;
  font-size: 10pt;
  padding-top: 8mm;
  border-top: 1px solid #000;
  flex-wrap: wrap;
}

// ════════════════════════ 打印媒体查询 ════════════════════════════
@media print {
  // 隐藏所有屏幕控件
  .no-print {
    display: none !important;
  }

  // 主容器去掉背景和内边距
  .print-page {
    background: transparent;
  }

  .preview-stage {
    padding: 0;
    display: block;
  }

  // 每个 a4 页面独立一页
  .print-section {
    display: none !important;
    box-shadow: none;
    border-radius: 0;
    width: 100%;
    min-height: auto;

    &.print-active {
      display: block !important;
      page-break-after: always;
    }
  }

  // 封皮、目录内容铺满
  .cover-box {
    margin: 0;
    border: 3px solid #000;
    height: 100vh;
  }

  .catalogue-wrap {
    padding: 10mm 12mm;
  }

  .archive-table th {
    background: #eee !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  // 侧脊页
  .spine-page {
    padding: 6mm;
  }

  .spine-tip {
    display: none;
  }
}
</style>
