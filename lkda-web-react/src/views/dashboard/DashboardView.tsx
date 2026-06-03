import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  FolderOpen,
  Archive,
  BookOpen,
  Clock,
  TrendingUp,
  PieChartIcon,
  LayoutDashboard,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { DashboardApi } from '@/api/dashboard'
import { useCountUp } from '@/hooks/useCountUp'
import type { StatusDistribution } from '@/types/vo'
import { cn } from '@/lib/utils'

/* ── 状态颜色映射 ───────────────────────────────────────────── */
const STATUS_COLORS: Record<number, string> = {
  0: '#94A3B8', // 草稿 - slate-400
  1: '#F59E0B', // 待审核 - amber-500
  2: '#3B82F6', // 待确认 - blue-500
  3: '#14B8A6', // 已归档 - primary
}

const STATUS_BG: Record<number, string> = {
  0: 'bg-slate-100',
  1: 'bg-amber-50',
  2: 'bg-blue-50',
  3: 'bg-emerald-50',
}

const STATUS_TEXT: Record<number, string> = {
  0: 'text-slate-600',
  1: 'text-amber-700',
  2: 'text-blue-700',
  3: 'text-emerald-700',
}

/* ── 数字卡片组件 ───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon,
  delay,
  colorClass,
}: {
  label: string
  value: number
  icon: React.ReactNode
  delay: number
  colorClass: string
}) {
  const animated = useCountUp({ end: value, duration: 1500, delay })

  return (
    <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-body">{label}</p>
          <p className={cn('mt-1 text-2xl font-bold tracking-tight', colorClass)}>
            {animated.toLocaleString()}
          </p>
        </div>
        <div className={cn('rounded-lg p-2', colorClass.replace('text-', 'bg-').replace('700', '100').replace('600', '100').replace('500', '100'))}>
          {icon}
        </div>
      </div>
    </div>
  )
}

/* ── 页面组件 ───────────────────────────────────────────────── */
export default function DashboardView() {
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => DashboardApi.overview(),
    staleTime: 60_000,
  })

  const stats = [
    {
      label: '案卷总数',
      value: overview?.totalVolumeCount ?? 0,
      icon: <FolderOpen size={22} className="text-primary-dark" />,
      colorClass: 'text-primary-dark',
    },
    {
      label: '已归档',
      value: overview?.archivedCount ?? 0,
      icon: <Archive size={22} className="text-emerald-700" />,
      colorClass: 'text-emerald-700',
    },
    {
      label: '当前借出',
      value: overview?.currentBorrowedCount ?? 0,
      icon: <BookOpen size={22} className="text-orange-600" />,
      colorClass: 'text-orange-600',
    },
    {
      label: '待处理审批',
      value: overview?.pendingApproveCount ?? 0,
      icon: <Clock size={22} className="text-amber-600" />,
      colorClass: 'text-amber-600',
    },
  ]

  const yearTrend = overview?.yearTrend ?? []
  const statusDist = overview?.statusDistribution ?? []

  /* ── 加载态 ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-3 md:p-4">
        <PageHeader title={<span className="inline-flex items-center gap-2"><LayoutDashboard size={20} className="text-primary-dark" />数据概览</span>} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-slate-100" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-card bg-slate-100" />
          <div className="h-72 animate-pulse rounded-card bg-slate-100" />
        </div>
      </div>
    )
  }

  /* ── 错误态 ───────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="p-3 md:p-4">
        <PageHeader title={<span className="inline-flex items-center gap-2"><LayoutDashboard size={20} className="text-primary-dark" />数据概览</span>} />
        <div className="rounded-card border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-700">数据加载失败，请稍后重试</p>
          <p className="mt-1 text-xs text-red-500">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-4">
      <PageHeader title={<span className="inline-flex items-center gap-2"><LayoutDashboard size={20} className="text-primary-dark" />数据概览</span>} />

      {/* ── 数字卡片 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            delay={i * 120}
            colorClass={s.colorClass}
          />
        ))}
      </div>

      {/* ── 图表区 ─────────────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* 年度归档趋势 */}
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-dark" />
            <h3 className="text-base font-semibold text-slate-title">年度归档趋势</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearTrend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-bg-main)',
                    fontSize: '13px',
                  }}
                  formatter={(value) => [`${value} 卷`, '归档数量']}
                  labelFormatter={(label) => `${label} 年`}
                />
                <Bar
                  dataKey="count"
                  fill="#14B8A6"
                  radius={[6, 6, 0, 0]}
                  name="归档数量"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 档案状态分布 */}
        <div className="rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <PieChartIcon size={18} className="text-primary-dark" />
            <h3 className="text-base font-semibold text-slate-title">档案状态分布</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="statusName"
                  stroke="none"
                >
                  {statusDist.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? '#94A3B8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-bg-main)',
                    fontSize: '13px',
                  }}
                  formatter={(value, _name, props) => {
                    const payload = (props as unknown as { payload?: StatusDistribution })?.payload
                    if (!payload) return [`${value} 卷`, '']
                    const total = statusDist.reduce((sum, d) => sum + d.count, 0)
                    const percent = total > 0 ? (((value as number) / total) * 100).toFixed(1) : '0'
                    return [`${value} 卷 (${percent}%)`, payload.statusName]
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value, entry) => {
                    const count = (entry as unknown as { payload?: StatusDistribution })?.payload?.count ?? 0
                    return (
                      <span style={{ color: '#475569', fontSize: '13px' }}>
                        {value} <span style={{ color: '#94A3B8' }}>({count})</span>
                      </span>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 状态分布明细卡片（手机端辅助阅读）────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:hidden">
        {statusDist.map((item) => (
          <div
            key={item.status}
            className={cn(
              'rounded-card border border-[var(--color-border-light)] p-3',
              STATUS_BG[item.status] ?? 'bg-slate-50'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.status] }}
              />
              <span className={cn('text-sm font-medium', STATUS_TEXT[item.status] ?? 'text-slate-600')}>
                {item.statusName}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-title">
              {item.count.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
