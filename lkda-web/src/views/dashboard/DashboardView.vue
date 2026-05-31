<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DashboardApi } from '@/api/dashboard'
import { useNotifyStore } from '@/stores/notify'
import { useThemeStore } from '@/stores/theme'
import type { DashboardOverviewVO } from '@/api/dashboard'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

// 读取 CSS 变量（供 echarts 等 JS 库使用）
function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#14B8A6'
}

// ECharts 实例延迟初始化（动态导入减少首屏 chunk）
let echartsLib: typeof import('echarts/core') | null = null
async function getEcharts() {
  if (!echartsLib) {
    const core = await import('echarts/core')
    const charts = await import('echarts/charts')
    const components = await import('echarts/components')
    const renderers = await import('echarts/renderers')
    core.use([
      charts.LineChart, charts.PieChart,
      components.GridComponent, components.TooltipComponent,
      components.LegendComponent, components.TitleComponent,
      components.MarkPointComponent, renderers.CanvasRenderer,
    ])
    echartsLib = core
  }
  return echartsLib
}

const router = useRouter()
const notifyStore = useNotifyStore()
const themeStore = useThemeStore()

// 监听主题变化，重新渲染图表
watch(() => themeStore.theme, () => {
  nextTick(() => initCharts())
})

// ── 数据加载 ─────────────────────────────────────────────────────
const overview   = ref<DashboardOverviewVO | null>(null)
const loading    = ref(false)
const loadError  = ref('')

async function loadData() {
  loading.value = true
  loadError.value = ''
  try {
    overview.value = await DashboardApi.overview()
    await notifyStore.refresh()
    nextTick(() => {
      initCharts()
      startCounterAnimation()
    })
  } catch (err: any) {
    // 401 由 http.ts 全局拦截器处理（logout + 跳转登录页），此处不再重复提示
    if (err?.response?.status === 401 || err?.code === 401) {
      return
    }
    loadError.value = '加载数据失败，请刷新页面重试'
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ── 计数动画 ─────────────────────────────────────────────────────
const animatedTotal     = ref(0)
const animatedArchived  = ref(0)
const animatedBorrowed  = ref(0)
const animatedPending   = ref(0)

function animateNumber(target: number, onUpdate: (val: number) => void, duration = 1200) {
  const start = performance.now()
  const tick = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    onUpdate(Math.floor(target * eased))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function startCounterAnimation() {
  if (!overview.value) return
  animateNumber(overview.value.totalVolumeCount,    v => animatedTotal.value    = v)
  animateNumber(overview.value.archivedCount,       v => animatedArchived.value = v)
  animateNumber(overview.value.currentBorrowedCount, v => animatedBorrowed.value = v)
  animateNumber(overview.value.pendingApproveCount,  v => animatedPending.value  = v)
}

// ── 卡片配置 ─────────────────────────────────────────────────────
const CARDS = [
  {
    key: 'total',
    title: '总案卷数',
    icon: 'Files',
    color: 'var(--color-primary)',
    bg: 'linear-gradient(135deg, var(--theme-bg-soft), var(--theme-bg-lighter))',
    value: computed(() => animatedTotal.value),
  },
  {
    key: 'archived',
    title: '已正式归档',
    icon: 'FolderChecked',
    color: '#065F46',
    bg: 'linear-gradient(135deg, var(--theme-border-light), var(--theme-border-medium))',
    value: computed(() => animatedArchived.value),
  },
  {
    key: 'borrowed',
    title: '当前借出',
    icon: 'Suitcase',
    color: '#D97706',
    bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)',
    value: computed(() => animatedBorrowed.value),
  },
  {
    key: 'pending',
    title: '待处理审批',
    icon: 'Bell',
    color: '#DC2626',
    bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)',
    value: computed(() => animatedPending.value),
  },
]

// ── ECharts ──────────────────────────────────────────────────────
const lineChartRef = ref<HTMLDivElement | null>(null)
const pieChartRef  = ref<HTMLDivElement | null>(null)
let lineChartInst: ECharts | null = null
let pieChartInst:  ECharts | null = null

const STATUS_COLORS = () => ['#94A3B8', '#FBBF24', '#60A5FA', getCssVar('--color-primary')]
const STATUS_NAMES  = ['草稿', '待审核', '待确认', '已归档']

async function initCharts() {
  if (!overview.value) return
  const echarts = await getEcharts()

  // 折线图：年度归档趋势
  if (lineChartRef.value) {
    lineChartInst?.dispose()
    lineChartInst = echarts.init(lineChartRef.value)
    const trend = overview.value.yearTrend
    lineChartInst.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: trend.map(t => t.year + '年'),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        axisLabel: { color: '#64748B' },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#64748B' },
      },
      series: [{
        name: '已归档数',
        type: 'line',
        smooth: true,
        data: trend.map(t => t.count),
        itemStyle: { color: getCssVar('--color-primary') },
        areaStyle: {
          color: new (await import('echarts/core')).graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: getCssVar('--color-primary') + '40' },  // 25% opacity
            { offset: 1, color: getCssVar('--color-primary') + '05' },  // ~2% opacity
          ]),
        },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
      }],
    })
  }

  // 饼图：档案状态分布
  if (pieChartRef.value) {
    pieChartInst?.dispose()
    pieChartInst = echarts.init(pieChartRef.value)
    const dist = overview.value.statusDistribution
    pieChartInst.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#475569' },
      },
      series: [{
        name: '档案状态',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: dist.map((d, i) => ({
          value: d.count,
          name: d.statusName,
          itemStyle: { color: STATUS_COLORS()[i] || '#CBD5E1' },
        })),
      }],
    })
  }
}

function handleResize() {
  lineChartInst?.resize()
  pieChartInst?.resize()
}

window.addEventListener('resize', handleResize)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  lineChartInst?.dispose()
  pieChartInst?.dispose()
})

// ── 快捷入口 ─────────────────────────────────────────────────────
const shortcuts = computed(() => [
  {
    title: '待我审核',
    count: notifyStore.pendingApprove,
    icon: 'Stamp',
    color: '#DC2626',
    bg: '#FEE2E2',
    path: '/approve/review',
    visible: notifyStore.pendingApprove > 0,
  },
  {
    title: '逾期未还',
    count: notifyStore.overdueCount,
    icon: 'WarningFilled',
    color: '#FB923C',
    bg: '#FFEDD5',
    path: '/borrow/history',
    visible: notifyStore.overdueCount > 0,
  },
  {
    title: '我的借阅',
    count: notifyStore.myPendingBorrow,
    icon: 'Suitcase',
    color: 'var(--color-primary)',
    bg: 'var(--theme-bg-lighter)',
    path: '/borrow/my',
    visible: notifyStore.myPendingBorrow > 0,
  },
])

const hasShortcuts = computed(() => shortcuts.value.some(s => s.visible))
</script>

<template>
  <div class="page-container">
    <PageHeader title="数据概览" />

    <!-- 错误状态 -->
    <el-card v-if="loadError" class="error-card" shadow="never">
      <EmptyState :description="loadError" />
      <div class="error-action">
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon>
          重新加载
        </el-button>
      </div>
    </el-card>

    <!-- 骨架屏 -->
    <template v-else-if="loading && !overview">
      <div class="cards-grid">
        <el-card v-for="i in 4" :key="i" class="stat-card skeleton" shadow="never">
          <el-skeleton :rows="2" animated />
        </el-card>
      </div>
      <div class="charts-row">
        <el-card class="chart-card" shadow="never">
          <el-skeleton :rows="6" animated />
        </el-card>
        <el-card class="chart-card" shadow="never">
          <el-skeleton :rows="6" animated />
        </el-card>
      </div>
    </template>

    <!-- 主内容 -->
    <template v-else-if="overview">
      <!-- ── 顶部数据卡片 ───────────────────────────────────────── -->
      <div class="cards-grid">
        <el-card
          v-for="card in CARDS"
          :key="card.key"
          class="stat-card"
          shadow="never"
          :style="{ background: card.bg }"
        >
          <div class="card-inner">
            <div class="card-icon" :style="{ background: card.color }">
              <el-icon :size="24"><component :is="card.icon" /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value" :style="{ color: card.color }">
                {{ card.value.value.toLocaleString() }}
              </div>
              <div class="card-label">{{ card.title }}</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- ── 中部图表区 ─────────────────────────────────────────── -->
      <div class="charts-row">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="chart-header">
              <span class="section-bar" />
              <span class="chart-title">年度归档趋势（近5年）</span>
            </div>
          </template>
          <div ref="lineChartRef" class="chart-body" />
        </el-card>

        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="chart-header">
              <span class="section-bar" />
              <span class="chart-title">档案状态分布</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-body" />
        </el-card>
      </div>

      <!-- ── 下部快捷入口 ───────────────────────────────────────── -->
      <el-card v-if="hasShortcuts" class="shortcut-card" shadow="never">
        <template #header>
          <div class="chart-header">
            <span class="section-bar" />
            <span class="chart-title">快捷入口</span>
          </div>
        </template>
        <div class="shortcuts-grid">
          <div
            v-for="s in shortcuts.filter(x => x.visible)"
            :key="s.title"
            class="shortcut-item"
            @click="router.push(s.path)"
          >
            <div class="shortcut-icon" :style="{ background: s.bg, color: s.color }">
              <el-icon :size="22"><component :is="s.icon" /></el-icon>
            </div>
            <div class="shortcut-info">
              <div class="shortcut-title">{{ s.title }}</div>
              <div class="shortcut-count" :style="{ color: s.color }">
                {{ s.count }} 条
              </div>
            </div>
            <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </el-card>

      <!-- 空状态 -->
      <el-card v-else class="empty-card" shadow="never">
        <EmptyState
          description="档案柜正在整理中，暂无待办事项"
          illustration="archive"
        />
      </el-card>
    </template>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// ── 错误卡片 ──────────────────────────────────────────────────────
.error-card {
  border-radius: var(--radius-card);
  border: 1px solid #FECACA;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) {
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}

.error-action {
  display: flex;
  justify-content: center;
}

// ── 数据卡片 ──────────────────────────────────────────────────────
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 960px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
}

.stat-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease;

  :deep(.el-card__body) { padding: 20px; }

  &:hover { transform: translateY(-2px); }

  &.skeleton { background: #fff; }
}

.card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.card-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  font-family: 'JetBrains Mono', Consolas, monospace;
  letter-spacing: -0.5px;
}

.card-label {
  font-size: 13px;
  color: #64748B;
  font-weight: 500;
}

// ── 图表区 ────────────────────────────────────────────────────────
.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 960px) { grid-template-columns: 1fr; }
}

.chart-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__header) {
    padding: 14px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: var(--theme-bg-card);
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }

  :deep(.el-card__body) { padding: 16px 20px 20px; }
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-bar {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: linear-gradient(180deg, $color-primary, $color-primary-dark);
  flex-shrink: 0;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: $color-text-title;
}

.chart-body {
  width: 100%;
  height: 320px;
}

// ── 快捷入口 ──────────────────────────────────────────────────────
.shortcut-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__header) {
    padding: 14px 20px;
    border-bottom: 1px solid #F1F5F9;
    background: var(--theme-bg-card);
    border-radius: var(--radius-card) var(--radius-card) 0 0;
  }

  :deep(.el-card__body) { padding: 16px 20px; }
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 720px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 480px) { grid-template-columns: 1fr; }
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: $color-primary;
    box-shadow: var(--shadow-card);
    transform: translateY(-1px);
  }
}

.shortcut-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shortcut-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.shortcut-title {
  font-size: 13px;
  color: $color-text-body;
  font-weight: 500;
}

.shortcut-count {
  font-size: 16px;
  font-weight: 700;
}

.shortcut-arrow {
  font-size: 14px;
  color: #CBD5E1;
}

// ── 空状态 ────────────────────────────────────────────────────────
.empty-card {
  border-radius: var(--radius-card);
  border: 1px solid #E2E8F0;
  box-shadow: var(--shadow-card);

  :deep(.el-card__body) {
    padding: 48px 20px;
  }
}

.el-button { border-radius: var(--radius-btn); }
</style>
