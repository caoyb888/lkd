import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Grid3x3, Plus, TrendingUp } from 'lucide-react'

import { DashboardApi } from '@/api/dashboard'
import { useCountUp } from '@/hooks/useCountUp'
import type { DashboardOverviewVO, StatusDistribution, YearArchiveStat } from '@/types/vo'
import { cn } from '@/lib/utils'

/* 岩层色阶 — 库藏剖面各分段配色 */
const STRATA_TONES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)']

type KpiAccent = 'teal' | 'ore' | 'flux'

/* ── KPI 卡片 ───────────────────────────────────────────────── */
function Kpi({
  label,
  value,
  unit,
  delta,
  trend,
  accent,
  index,
}: {
  label: string
  value: number
  unit: string
  delta: string
  trend: string
  accent: KpiAccent
  index: number
}) {
  const animated = useCountUp({ end: value, duration: 1400, delay: index * 90 })
  return (
    <div className="panel kpi rise" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className={cn('kpi-edge', accent)} />
      <div className="flex between center">
        <span className="eyebrow">{label}</span>
        <span className={cn('tag', accent)}>{delta}</span>
      </div>
      <div className="flex between" style={{ alignItems: 'flex-end', marginTop: 14 }}>
        <div className="kpi-num mono tnum">
          {animated.toLocaleString()}
          <small>{unit}</small>
        </div>
        <span className="kpi-trend grotesk">{trend}</span>
      </div>
      <div className="kpi-spark">
        <span style={{ width: `${40 + index * 18}%` }} />
      </div>
    </div>
  )
}

/* ── 库藏剖面 — 岩芯式状态分布 ───────────────────────────────── */
function CoreSample({ dist }: { dist: StatusDistribution[] }) {
  const [hot, setHot] = useState<number | null>(null)
  const total = dist.reduce((s, d) => s + d.count, 0)
  return (
    <div className="core">
      <div className="core-ruler mono">
        {['0', '25', '50', '75', '100%'].map((d, i) => (
          <span key={d} style={{ top: `${i * 25}%` }}>
            {d}
          </span>
        ))}
      </div>
      <div className="core-col">
        {dist.map((c, i) => {
          const pct = total > 0 ? (c.count / total) * 100 : 0
          const on = hot === i
          return (
            <div
              key={c.status}
              className="core-band"
              onMouseEnter={() => setHot(i)}
              onMouseLeave={() => setHot(null)}
              style={{
                flexGrow: Math.max(c.count, 0.001),
                background: STRATA_TONES[i % STRATA_TONES.length],
                filter: on ? 'brightness(1.15)' : 'none',
              }}
            >
              <span className="core-seam" />
              <div className="core-info">
                <span className="mono core-code">{String(c.status).padStart(2, '0')}</span>
                <span className="core-name">{c.statusName}</span>
              </div>
              <div className="core-count mono tnum">
                {c.count.toLocaleString()}
                <small>{pct.toFixed(1)}%</small>
              </div>
            </div>
          )
        })}
      </div>
      <div className="core-read">
        {hot === null ? (
          <>
            <span className="eyebrow">钻孔取样 · 状态分布</span>
            <div className="mono tnum core-total">
              {total.toLocaleString()}
              <small>卷宗总量</small>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">取样段 · {dist[hot].statusName}</span>
            <div className="core-total" style={{ fontSize: 26 }}>
              {dist[hot].count.toLocaleString()} 卷
            </div>
            <p className="core-note">
              占馆藏 {total > 0 ? ((dist[hot].count / total) * 100).toFixed(1) : '0'}%
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ── 年度归档趋势 — 震波式面积曲线 ───────────────────────────── */
function TrendChart({ data }: { data: YearArchiveStat[] }) {
  const W = 720
  const H = 220
  const pad = 8
  const n = data.length
  if (n === 0) {
    return (
      <div className="trend">
        <p className="core-note">暂无趋势数据</p>
      </div>
    )
  }
  const max = Math.max(...data.map((d) => d.count), 1) * 1.12
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2))
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2 - 18)
  const line = data
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`
  return (
    <div className="trend">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="trend-svg sweep">
        <defs>
          <linearGradient id="strata-tg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--c-teal)" stopOpacity="0.32" />
            <stop offset="1" stopColor="var(--c-teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={W - pad}
            y1={pad + g * (H - pad * 2)}
            y2={pad + g * (H - pad * 2)}
            stroke="var(--line)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
        ))}
        <path d={area} fill="url(#strata-tg)" />
        <path d={line} fill="none" stroke="var(--c-teal)" strokeWidth="2.4" />
        {data.map((d, i) => (
          <circle
            key={d.year}
            cx={x(i)}
            cy={y(d.count)}
            r="2.6"
            fill="var(--bg)"
            stroke="var(--c-teal)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="trend-x mono">
        {data.map((d) => (
          <span key={d.year}>{d.year}</span>
        ))}
      </div>
    </div>
  )
}

/* ── 页面 ───────────────────────────────────────────────────── */
export default function DashboardView() {
  const { data, isLoading, error } = useQuery<DashboardOverviewVO>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => DashboardApi.overview(),
    staleTime: 60_000,
  })

  const head = (
    <div className="dash-head">
      <div>
        <span className="eyebrow">指挥中心 · COMMAND</span>
        <h2 className="dash-title">馆藏总览</h2>
      </div>
      <div className="dash-head-r">
        <span className="mono dash-clock">实时</span>
        <button className="btn btn-ghost" type="button">
          <Grid3x3 size={15} /> 视图
        </button>
        <button className="btn btn-primary" type="button">
          <Plus size={15} /> 新增著录
        </button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="strata dash-page">
        {head}
        <div className="kpi-row">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-skeleton" style={{ height: 118 }} />
          ))}
        </div>
        <div className="dash-grid">
          <div className="dash-skeleton" style={{ height: 420 }} />
          <div className="dash-skeleton" style={{ height: 420 }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="strata dash-page">
        {head}
        <div className="panel dash-error">
          <p>数据加载失败，请稍后重试</p>
        </div>
      </div>
    )
  }

  const kpis: Array<{
    label: string
    value: number
    unit: string
    delta: string
    trend: string
    accent: KpiAccent
  }> = [
    { label: '馆藏卷宗', value: data.totalVolumeCount, unit: '卷', delta: '全宗', trend: '总量', accent: 'teal' },
    { label: '已归档', value: data.archivedCount, unit: '卷', delta: '正式', trend: '可检索', accent: 'teal' },
    { label: '当前借出', value: data.currentBorrowedCount, unit: '次', delta: '在借', trend: '流通中', accent: 'ore' },
    { label: '待处理审批', value: data.pendingApproveCount, unit: '项', delta: '待办', trend: '需处理', accent: 'flux' },
  ]

  return (
    <div className="strata dash-page">
      {head}

      <div className="kpi-row">
        {kpis.map((k, i) => (
          <Kpi key={k.label} {...k} index={i} />
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel core-panel">
          <div className="panel-h">
            <div>
              <span className="eyebrow">岩芯取样</span>
              <h3>库藏剖面</h3>
            </div>
            <span className="tag teal">{data.statusDistribution.length} 状态</span>
          </div>
          <CoreSample dist={data.statusDistribution} />
        </section>

        <section className="panel trend-panel">
          <div className="panel-h">
            <div>
              <span className="eyebrow">逐年统计</span>
              <h3>年度归档趋势</h3>
            </div>
            <div className="legend mono">
              <span>
                <i style={{ background: 'var(--c-teal)' }} />
                归档数量
              </span>
            </div>
          </div>
          <TrendChart data={data.yearTrend} />
          <div className="flex center" style={{ gap: 8, padding: '0 18px 18px', color: 'var(--text-faint)', fontSize: 12 }}>
            <TrendingUp size={14} />
            <span className="mono">按年度统计正式归档案卷数量</span>
          </div>
        </section>
      </div>
    </div>
  )
}
