import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  BookMarked,
  Files,
  List,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { VolumeApi } from '@/api/volume'
import { FileApi } from '@/api/file'
import { PrintApi } from '@/api/print'
import type { PrintType } from '@/api/print'
import { useDictStore } from '@/stores/dictStore'
import EmptyState from '@/components/EmptyState'
import { cn } from '@/lib/utils'

/* ── 类型 ─────────────────────────────────────────────────────── */
type TabKey = 'cover' | 'spine' | 'vol-catalogue' | 'file-catalogue'

interface TabItem {
  key: TabKey
  label: string
  icon: React.ElementType
}

const TABS: TabItem[] = [
  { key: 'cover',          label: '封皮',       icon: FileText   },
  { key: 'spine',          label: '侧脊',       icon: BookMarked },
  { key: 'vol-catalogue',  label: '案卷目录',   icon: Files      },
  { key: 'file-catalogue', label: '卷内文件目录', icon: List     },
]

/* ── 组件 ─────────────────────────────────────────────────────── */
export default function PrintPreviewView() {
  const navigate    = useNavigate()
  const { volumeId } = useParams<{ volumeId: string }>()
  const [searchParams] = useSearchParams()
  const dictStore   = useDictStore()

  const id            = Number(volumeId)
  const yearFromQuery = searchParams.get('year') || undefined

  const [activeTab,  setActiveTab]  = useState<TabKey>('cover')
  const [downloading, setDownloading] = useState(false)

  const lbl = (code: string, val?: string) =>
    (val ? dictStore.getLabel(code, val) || val : null) || '—'

  /* ── 数据查询 ─────────────────────────────────────────────── */
  const { data: volume, isLoading } = useQuery({
    queryKey: ['print', 'volume', id, yearFromQuery],
    queryFn: async () => {
      if (yearFromQuery) return VolumeApi.detail(id, yearFromQuery)
      const res   = await VolumeApi.page({ current: 1, size: 1, keyword: String(id) })
      const found = res.records[0]
      return found ? VolumeApi.detail(id, found.year) : null
    },
    enabled: !!id && !isNaN(id),
  })

  const { data: files = [] } = useQuery({
    queryKey: ['print', 'files', volume?.volumeNo, volume?.year],
    queryFn:  () => FileApi.listByVolume(volume!.volumeNo, volume!.year),
    enabled:  !!volume?.volumeNo && !!volume?.year,
  })

  const spineChars   = useMemo(() => (volume?.volumeTitle ?? '').split(''), [volume?.volumeTitle])
  const volTableRows = useMemo(() => (volume ? [volume] : []), [volume])

  /* tab key → PrintType 映射 */
  const TAB_TO_PRINT_TYPE: Record<TabKey, PrintType> = {
    'cover':          'cover',
    'spine':          'spine',
    'vol-catalogue':  'volume-catalogue',
    'file-catalogue': 'file-catalogue',
  }

  const TAB_LABEL: Record<TabKey, string> = {
    'cover':          '封皮',
    'spine':          '侧脊',
    'vol-catalogue':  '案卷目录',
    'file-catalogue': '卷内文件目录',
  }

  /* ── 操作 ─────────────────────────────────────────────────── */
  async function handleDownload() {
    if (!volume) return
    setDownloading(true)
    try {
      const printType = TAB_TO_PRINT_TYPE[activeTab]
      const blob = await PrintApi.downloadPdf(id, volume.year, printType)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `档案_${volume.archiveNo}_${TAB_LABEL[activeTab]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  /* ── 渲染 ─────────────────────────────────────────────────── */
  return (
    <div className="p-3 md:p-4">

      {/* ── 页头：标题 + 操作按钮 ──────────────────────────────── */}
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Printer size={20} className="text-primary-dark" />
              打印预览
            </span>
          }
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1.5" />
            返回
          </Button>
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-[var(--color-bg-soft)]"
            disabled={downloading || !volume}
            onClick={handleDownload}
          >
            <Download size={16} className="mr-1.5" />
            {downloading ? '下载中…' : '下载 PDF'}
          </Button>
          <Button disabled={!volume} onClick={() => window.print()}>
            <Printer size={16} className="mr-1.5" />
            直接打印
          </Button>
        </div>
      </div>

      {/* ── Tab 栏 + 档号 ──────────────────────────────────────── */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--color-border-light)] bg-[var(--color-bg-main)] px-4 py-2.5 shadow-card">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => {
            const Icon   = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                  active
                    ? 'border-primary bg-primary text-white shadow'
                    : 'border-transparent text-slate-body hover:bg-[var(--color-bg-lighter)] hover:text-primary'
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
        {volume && (
          <span className="font-mono text-xs font-semibold text-primary-dark bg-primary/5 border border-primary/20 rounded-full px-3 py-1">
            {volume.archiveNo}
          </span>
        )}
      </div>

      {/* ── A4 预览区 ──────────────────────────────────────────── */}
      <div className="flex justify-center overflow-x-auto pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-slate-body">加载案卷数据中…</p>
          </div>
        ) : !volume ? (
          <EmptyState description="未找到该案卷数据，请返回重试" />
        ) : (
          <>
            {/* ══ 封皮 ══ */}
            {activeTab === 'cover' && (
              <div className="a4-page">
                <div className="cover-box">
                  <div className="cover-left-strip">
                    <div className="cover-strip-item">
                      <span className="cover-strip-label">全宗名称</span>
                      <span className="cover-strip-value">莱矿</span>
                    </div>
                    <div className="cover-strip-item">
                      <span className="cover-strip-label">保管期限</span>
                      <span className="cover-strip-value">
                        {lbl('retention_period', volume.retentionPeriod)}
                      </span>
                    </div>
                  </div>
                  <div className="cover-main">
                    <div className="cover-meta-row">
                      <div className="cover-meta-item">
                        <span className="cover-meta-label">年度</span>
                        <span className="cover-meta-val">{volume.year}</span>
                      </div>
                      <div className="cover-meta-item">
                        <span className="cover-meta-label">密级</span>
                        <span className="cover-meta-val security">
                          {lbl('security_level', volume.securityLevel)}
                        </span>
                      </div>
                    </div>
                    <div className="cover-title-wrap">
                      <p className="cover-title-label">案卷题名</p>
                      <p className="cover-title-val">{volume.volumeTitle}</p>
                    </div>
                    <div className="cover-divider" />
                    <div className="cover-archiveno-row">
                      <span className="cover-archiveno-label">档&emsp;&emsp;号</span>
                      <span className="cover-archiveno-val">{volume.archiveNo}</span>
                    </div>
                    <div className="cover-count-row">
                      <span className="cover-count-item">
                        件数 <strong>{volume.copies ?? '—'}</strong>
                      </span>
                      <span className="cover-count-item">
                        页数 <strong>{volume.totalPages ?? '—'}</strong>
                      </span>
                    </div>
                    <div className="cover-footer">
                      <span className="cover-footer-name">莱矿档案室</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ 侧脊 ══ */}
            {activeTab === 'spine' && (
              <div className="a4-page spine-page">
                <div className="spine-stage">
                  {[1, 2].map((n) => (
                    <div key={n} className="spine-block">
                      <div className="spine-inner">
                        <div className="spine-row">
                          <span className="spine-sub-label">全</span>
                          <span className="spine-sub-val">{volume.fondsNo || '—'}</span>
                        </div>
                        <div className="spine-row">
                          <span className="spine-sub-label">年</span>
                          <span className="spine-sub-val">{volume.year}</span>
                        </div>
                        <div className="spine-row">
                          <span className="spine-sub-label">号</span>
                          <span className="spine-sub-val small">{volume.archiveNo}</span>
                        </div>
                        <div className="spine-title-wrap">
                          {spineChars.map((ch, idx) => (
                            <span key={idx} className="spine-char">{ch}</span>
                          ))}
                        </div>
                        <div className="spine-bottom">
                          <span className="spine-sub-label">件</span>
                          <span className="spine-sub-val">{volume.copies ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="no-print mt-3 text-center text-xs text-[var(--text-faint)]">
                  档案盒侧脊（每页可印多份，此处预览 2 份）
                </p>
              </div>
            )}

            {/* ══ 案卷目录 ══ */}
            {activeTab === 'vol-catalogue' && (
              <div className="a4-page">
                <div className="catalogue-wrap">
                  <h3 className="catalogue-title">案&emsp;卷&emsp;目&emsp;录</h3>
                  <p className="catalogue-subtitle">
                    全宗号：{lbl('fonds_no', volume.fondsNo)}&emsp;
                    年度：{volume.year}&emsp;
                    一级类目：{volume.categoryL1Label || lbl('category_l1', volume.categoryL1)}
                  </p>
                  <table className="archive-table">
                    <thead>
                      <tr>
                        <th className="col-seq">序号</th>
                        <th className="col-no">档号</th>
                        <th className="col-title">案卷题名</th>
                        <th className="col-year">年度</th>
                        <th className="col-copies">件数</th>
                        <th className="col-pages">页数</th>
                        <th className="col-period">保管期限</th>
                        <th className="col-sec">密级</th>
                        <th className="col-remark">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volTableRows.map((row, idx) => (
                        <tr key={row.recordId}>
                          <td className="center">{idx + 1}</td>
                          <td className="mono">{row.archiveNo}</td>
                          <td>{row.volumeTitle}</td>
                          <td className="center">{row.year}</td>
                          <td className="center">{row.copies ?? '—'}</td>
                          <td className="center">{row.totalPages ?? '—'}</td>
                          <td className="center">
                            {row.retentionPeriodLabel || lbl('retention_period', row.retentionPeriod)}
                          </td>
                          <td className="center">
                            {row.securityLevelLabel || lbl('security_level', row.securityLevel)}
                          </td>
                          <td>{row.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="catalogue-footer">
                    <span>编制单位：{volume.compileUnit || '—'}</span>
                    <span>立卷人：{volume.compiler || '—'}</span>
                    <span>立卷日期：{volume.compileDate || '—'}</span>
                    <span>审核人：{volume.reviewer || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ 卷内文件目录 ══ */}
            {activeTab === 'file-catalogue' && (
              <div className="a4-page">
                <div className="catalogue-wrap">
                  <h3 className="catalogue-title">卷内文件目录</h3>
                  <p className="catalogue-subtitle">
                    档号：{volume.archiveNo}&emsp;
                    案卷题名：{volume.volumeTitle}
                  </p>
                  {files.length === 0 ? (
                    <EmptyState description="该案卷暂无卷内文件" />
                  ) : (
                    <>
                      <table className="archive-table file-table">
                        <thead>
                          <tr>
                            <th className="col-seq">顺序号</th>
                            <th className="col-fileno">文件编号</th>
                            <th className="col-filetitle">文件标题</th>
                            <th className="col-responsible">责任者</th>
                            <th className="col-date">归档日期</th>
                            <th className="col-pages">页数</th>
                            <th className="col-sec">密级</th>
                            <th className="col-remark">备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.map((file) => (
                            <tr key={file.recordId}>
                              <td className="center">{file.seqNo}</td>
                              <td className="mono">{file.fileNo || '—'}</td>
                              <td>{file.fileTitle}</td>
                              <td>{file.responsible || '—'}</td>
                              <td className="center">{file.archiveDate || '—'}</td>
                              <td className="center">{file.pages ?? '—'}</td>
                              <td className="center">
                                {file.securityLevelLabel || lbl('security_level', file.securityLevel)}
                              </td>
                              <td>{file.remark || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="catalogue-footer">
                        <span>共 {files.length} 件</span>
                        <span>立卷人：{volume.compiler || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 打印样式 ───────────────────────────────────────────── */}
      <style>{`
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.15);
          border-radius: 2px;
          font-family: '宋体', SimSun, 'Times New Roman', serif;
          font-size: 12pt;
          color: #000;
          flex-shrink: 0;
        }

        /* ════ 封皮 ════ */
        .cover-box {
          display: flex;
          border: 3px solid #000;
          margin: 8mm;
          min-height: calc(297mm - 16mm);
          box-sizing: border-box;
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
        }
        .cover-strip-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .cover-strip-label { font-size: 8pt; color: #64748B; writing-mode: vertical-rl; letter-spacing: 4px; }
        .cover-strip-value { font-size: 9pt; font-weight: 600; color: #000; writing-mode: vertical-rl; letter-spacing: 2px; }
        .cover-main { flex: 1; display: flex; flex-direction: column; padding: 12mm 14mm; }
        .cover-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10mm; }
        .cover-meta-item { display: flex; align-items: center; gap: 6px; }
        .cover-meta-label { font-size: 10pt; color: #475569; }
        .cover-meta-val { font-size: 12pt; font-weight: 600; color: #000; border-bottom: 1px solid #000; min-width: 18mm; text-align: center; padding: 0 4px; }
        .cover-meta-val.security { background: #FFFBEB; color: #92400E; border: 1px solid #F59E0B; border-radius: 2px; }
        .cover-title-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8mm 0; }
        .cover-title-label { font-size: 11pt; color: #64748B; margin-bottom: 8px; letter-spacing: 2px; }
        .cover-title-val { font-size: 18pt; font-weight: bold; color: #000; line-height: 1.6; word-break: break-all; }
        .cover-divider { border-top: 1.5px solid #000; margin: 8mm 0 6mm; }
        .cover-archiveno-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6mm; }
        .cover-archiveno-label { font-size: 11pt; color: #475569; white-space: nowrap; }
        .cover-archiveno-val { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 13pt; font-weight: bold; color: #000; border-bottom: 1.5px solid #000; flex: 1; padding: 2px 6px; letter-spacing: 1px; }
        .cover-count-row { display: flex; gap: 32px; margin-bottom: 10mm; }
        .cover-count-item { font-size: 10pt; color: #475569; }
        .cover-count-item strong { font-size: 12pt; color: #000; margin-left: 4px; border-bottom: 1px solid #000; padding: 0 6px; }
        .cover-footer { margin-top: auto; text-align: center; border-top: 1.5px solid #000; padding-top: 6mm; }
        .cover-footer-name { font-size: 13pt; font-weight: bold; letter-spacing: 4px; color: #000; }

        /* ════ 侧脊 ════ */
        .spine-page { padding: 12mm; }
        .spine-stage { display: flex; gap: 12mm; justify-content: center; height: calc(297mm - 24mm); }
        .spine-block { width: 22mm; height: 100%; border: 2px solid #000; display: flex; justify-content: center; }
        .spine-inner { display: flex; flex-direction: column; align-items: center; padding: 4mm 2mm; gap: 4px; width: 100%; }
        .spine-row { display: flex; flex-direction: column; align-items: center; border-bottom: 1px dashed #CBD5E1; width: 100%; padding: 3px 0; gap: 2px; }
        .spine-sub-label { font-size: 7pt; color: #64748B; }
        .spine-sub-val { font-size: 8pt; font-weight: 600; color: #000; word-break: break-all; text-align: center; }
        .spine-sub-val.small { font-size: 6pt; }
        .spine-title-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding: 4px 0; }
        .spine-char { font-size: 9pt; font-weight: bold; color: #000; line-height: 1.4; }
        .spine-bottom { display: flex; flex-direction: column; align-items: center; border-top: 1px dashed #CBD5E1; width: 100%; padding-top: 3px; gap: 2px; }

        /* ════ 目录表格 ════ */
        .catalogue-wrap { padding: 12mm 14mm; display: flex; flex-direction: column; min-height: calc(297mm - 1px); }
        .catalogue-title { font-size: 16pt; font-weight: bold; text-align: center; margin: 0 0 6px; letter-spacing: 4px; }
        .catalogue-subtitle { font-size: 10pt; text-align: center; color: #475569; margin: 0 0 8mm; letter-spacing: 1px; }
        .archive-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 8mm; }
        .archive-table th, .archive-table td { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; line-height: 1.3; }
        .archive-table th { background: #F1F5F9; font-weight: bold; text-align: center; white-space: nowrap; }
        .archive-table td.center { text-align: center; }
        .archive-table td.mono { font-family: Consolas, monospace; font-size: 9pt; white-space: nowrap; }
        .archive-table .col-seq { width: 8mm; }
        .archive-table .col-no { width: 40mm; }
        .archive-table .col-title { min-width: 50mm; }
        .archive-table .col-year { width: 12mm; }
        .archive-table .col-copies { width: 12mm; }
        .archive-table .col-pages { width: 12mm; }
        .archive-table .col-period { width: 16mm; }
        .archive-table .col-sec { width: 14mm; }
        .archive-table .col-remark { min-width: 16mm; }
        .archive-table .col-fileno { width: 24mm; }
        .archive-table .col-filetitle { min-width: 50mm; }
        .archive-table .col-responsible { width: 20mm; }
        .archive-table .col-date { width: 22mm; }
        .file-table .col-seq { width: 10mm; }
        .catalogue-footer { margin-top: auto; display: flex; gap: 24px; font-size: 10pt; padding-top: 8mm; border-top: 1px solid #000; flex-wrap: wrap; }

        /* ════ 打印媒体 ════ */
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .a4-page { box-shadow: none; border-radius: 0; width: 100%; min-height: 0; margin: 0; padding: 0; }
          /* 可打印高度 = 297mm - 上下各10mm = 277mm，封皮盒子整体填满 */
          .cover-box { margin: 0; height: 277mm; border: 3px solid #000 !important; box-sizing: border-box; }
          .cover-left-strip { background: #F8FAFC !important; }
          .cover-main { padding: 8mm 12mm; }
          .cover-title-wrap { padding: 6mm 0; }
          .catalogue-wrap { padding: 10mm 12mm; min-height: 277mm; }
          .archive-table th { background: #eee !important; }
          .archive-table th, .archive-table td { border: 1px solid #000 !important; }
          .spine-page { padding: 6mm; }
          .spine-stage { height: 277mm; }
        }
      `}</style>
    </div>
  )
}
